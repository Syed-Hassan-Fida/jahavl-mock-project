#!/usr/bin/env python3
"""Load business rows from the legacy MySQL dump into the revamp database.

Card numbers, CVCs, and full account numbers are never copied.
"""

from __future__ import annotations

import sqlite3
import subprocess
from pathlib import Path

from import_live_catalog import insert_blob, parse_tuples

DUMP = Path("/Users/mac/Desktop/interview/jaha_live_updated/new_live_db.sql")
DB = Path("/Users/mac/Desktop/interview/jaha_live_revamp/backend/database/database.sqlite")
TEST_EMAILS = {
    "jhardison@jahavl.com",
    "justin@jahavl.com",
    "matthew@cfbcstuart.com",
    "justin2@jahavl.com",
    "aharrison@jahavl.com",
}
STATUS = {"1": "added", "2": "requested", "3": "approved", "4": "rejected", "5": "paid", "8": "expired"}
TICKET_STATUS = {"1": "open", "2": "pending", "3": "closed"}


def rows(sql: str, table: str) -> list[list]:
    try:
        return parse_tuples(insert_blob(sql, table))
    except SystemExit:
        return []


def money(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(str(value).replace(",", "").replace("$", "") or 0)
    except ValueError:
        return 0.0


def has(conn: sqlite3.Connection, table: str, key: int) -> bool:
    return conn.execute(f"SELECT 1 FROM {table} WHERE id = ?", (key,)).fetchone() is not None


def main() -> None:
    sql = DUMP.read_text(errors="replace")
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA foreign_keys = ON")
    known = {row[0] for row in conn.execute("SELECT id FROM users")}
    emails = {row[0].lower() for row in conn.execute("SELECT email FROM users")}

    imported_users = 0
    for row in rows(sql, "users"):
        email = (row[3] or "").strip().lower()
        role = row[27] if row[27] in {"admin", "sales", "dealer", "client"} else "client"
        if not email or "@" not in email or email in emails:
            continue
        conn.execute(
            """INSERT INTO users (id, name, email, password, role, phone, company_name, sales_tax_percent, tax_status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, '', 0, 'taxable', ?, ?)""",
            (int(row[0]), f"{row[1] or ''} {row[2] or ''}".strip() or email, email, row[5] or "", role, row[6], row[25], row[26]),
        )
        known.add(int(row[0]))
        emails.add(email)
        imported_users += 1

    for row in rows(sql, "user_sales_tax"):
        user_id = int(row[1])
        if user_id not in known:
            continue
        status = {"1": "pending", "2": "exempt"}.get(str(row[4]), "taxable")
        conn.execute("UPDATE users SET sales_tax_percent = ?, tax_status = ? WHERE id = ?", (money(row[2]), status, user_id))

    for row in rows(sql, "sales_specialist"):
        user_id = int(row[1])
        if user_id not in known:
            continue
        conn.execute(
            "UPDATE users SET bio = ?, monthly_target = ?, yearly_target = ? WHERE id = ?",
            (row[4], int(float(row[5] or 0)), int(float(row[6] or 0)), user_id),
        )

    names = {name: pid for pid, name in conn.execute("SELECT id, name FROM products")}
    legacy_product: dict[str, int] = {}
    for row in rows(sql, "products"):
        match = names.get(row[1])
        if match:
            legacy_product[str(row[0])] = match
            conn.execute("UPDATE products SET legacy_id = ? WHERE id = ? AND legacy_id IS NULL", (int(row[0]), match))

    imported_quotes = 0
    for row in rows(sql, "user_quotes"):
        quote_id, user_id = int(row[0]), int(row[2])
        if user_id not in known or has(conn, "quotes", quote_id):
            continue
        kind = row[5] if row[5] in {"quote", "wishlist"} else "quote"
        conn.execute(
            """INSERT INTO quotes (id, user_id, name, type, status, total, shipping, commission, charge_id, checkout_allowed, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (quote_id, user_id, row[1] or "Quote", kind, STATUS.get(str(row[3]), "added"), money(row[4]), money(row[6]), money(row[9]), row[7], row[13], row[14]),
        )
        imported_quotes += 1

    quote_ids = {row[0] for row in conn.execute("SELECT id FROM quotes")}
    imported_items = 0
    for row in rows(sql, "quote_items"):
        quote_id = int(row[1])
        if quote_id not in quote_ids or has(conn, "quote_items", int(row[0])):
            continue
        product_id = legacy_product.get(str(row[2]))
        label = None if product_id else f"Legacy product {row[2]}"
        conn.execute(
            """INSERT INTO quote_items (id, quote_id, product_id, kind, label, quantity, unit_price, created_at, updated_at)
               VALUES (?, ?, ?, 'product', ?, ?, ?, ?, ?)""",
            (int(row[0]), quote_id, product_id, label, int(float(row[4] or 1)), money(row[3]), row[8], row[9]),
        )
        imported_items += 1

    for row in rows(sql, "user_addresses"):
        user_id = int(row[1])
        line = (row[2] or "").strip()
        if user_id not in known or not line:
            continue
        conn.execute(
            """INSERT INTO addresses (user_id, label, line1, city, region, postal_code, country, is_default, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'US', ?, ?, ?)""",
            (user_id, row[9] or "Shipping", line, row[4] or "Unknown", row[5] or "FL", row[6] or "00000", 1 if str(row[8]) == "1" else 0, row[7], row[7]),
        )

    def link(table: str, left: str, right: str, legacy: str) -> int:
        count = 0
        for row in rows(sql, legacy):
            a, b = int(row[1]), int(row[2])
            if a not in known or b not in known:
                continue
            conn.execute(f"INSERT OR IGNORE INTO {table} ({left}, {right}) VALUES (?, ?)", (a, b))
            count += 1
        return count

    links = link("sales_clients", "sales_user_id", "client_user_id", "sales_clients")
    links += link("dealer_clients", "dealer_user_id", "client_user_id", "dealer_clients")
    links += link("sales_dealers", "sales_user_id", "dealer_user_id", "sales_dealer")

    notes = 0
    for row in rows(sql, "sales_note"):
        author = int(row[1])
        client = int(row[2]) if row[2] else None
        quote = int(row[3]) if row[3] else None
        if author not in known or has(conn, "sales_notes", int(row[0])):
            continue
        if client not in known:
            client = None
        if quote not in quote_ids:
            quote = None
        conn.execute(
            "INSERT INTO sales_notes (id, user_id, client_user_id, quote_id, title, body, due_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (int(row[0]), author, client, quote, row[6] or "Note", row[4] or "", row[7], row[8], row[9]),
        )
        notes += 1

    tasks = 0
    for row in rows(sql, "sales_task"):
        author = int(row[1])
        client = int(row[2]) if row[2] and int(row[2]) in known else None
        if author not in known or has(conn, "sales_tasks", int(row[0])):
            continue
        done = row[8] if str(row[5]) == "2" else None
        conn.execute(
            "INSERT INTO sales_tasks (id, sales_user_id, related_user_id, title, notes, due_on, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (int(row[0]), author, client, row[6] or "Task", row[4] or "", row[7], done, row[8], row[9]),
        )
        tasks += 1

    ticket_owner: dict[int, int] = {}
    tickets = 0
    for row in rows(sql, "service_tickets"):
        ticket_id, user_id = int(row[0]), int(row[1])
        sales_id = int(row[4]) if row[4] and int(row[4]) in known else None
        if user_id not in known or has(conn, "tickets", ticket_id):
            continue
        conn.execute(
            "INSERT INTO tickets (id, user_id, assignee_id, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (ticket_id, user_id, sales_id, (row[6] or "Ticket")[:160], TICKET_STATUS.get(str(row[7]), "open"), row[8], row[9]),
        )
        ticket_owner[ticket_id] = sales_id or user_id
        tickets += 1

    events = 0
    for row in rows(sql, "ticket_events"):
        event_id, ticket_id = int(row[0]), int(row[1])
        author = ticket_owner.get(ticket_id)
        if author is None or has(conn, "ticket_events", event_id):
            continue
        conn.execute(
            "INSERT INTO ticket_events (id, ticket_id, user_id, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event_id, ticket_id, author, row[3] or "Update", TICKET_STATUS.get(str(row[2]), str(row[2])), row[4], row[5]),
        )
        events += 1

    event_ids = {row[0] for row in conn.execute("SELECT id FROM ticket_events")}
    event_notes = 0
    for row in rows(sql, "ticket_event_notes"):
        event_id, user_id = int(row[1]), int(row[4])
        if event_id not in event_ids or user_id not in known or has(conn, "ticket_event_notes", int(row[0])):
            continue
        conn.execute(
            "INSERT INTO ticket_event_notes (id, ticket_event_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (int(row[0]), event_id, user_id, row[5] or "", row[6], row[7]),
        )
        event_notes += 1

    messages = 0
    for row in rows(sql, "chat"):
        sender, recipient = int(row[1]), int(row[2])
        if sender not in known or recipient not in known or has(conn, "messages", int(row[0])):
            continue
        body = row[3] or ""
        attachment = row[5] if row[5] not in {None, "", "null"} else None
        if attachment:
            body = f"{body} [legacy file {attachment}]".strip()
        if not body:
            continue
        conn.execute(
            "INSERT INTO messages (id, sender_id, recipient_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (int(row[0]), sender, recipient, body, row[6], row[7]),
        )
        messages += 1

    password = subprocess.check_output(["php", "-r", "echo password_hash('JahaTest@2026', PASSWORD_BCRYPT);"], text=True).strip()
    refreshed = 0
    for email in TEST_EMAILS:
        cursor = conn.execute("UPDATE users SET password = ? WHERE email = ?", (password, email))
        refreshed += cursor.rowcount

    conn.commit()
    print(
        f"users={imported_users} quotes={imported_quotes} items={imported_items} links={links} "
        f"notes={notes} tasks={tasks} tickets={tickets} events={events} event_notes={event_notes} "
        f"messages={messages} test_logins={refreshed}"
    )
    print("payment card numbers were not imported")


if __name__ == "__main__":
    main()
