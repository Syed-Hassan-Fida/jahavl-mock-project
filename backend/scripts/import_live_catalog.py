#!/usr/bin/env python3
"""Import published JAH products, MSRP, dealer tier-one price, specs, and photos.

Prices and specs come from the legacy SQL dump (the same rows the live site renders).
Photos are downloaded from https://www.jahavl.com/public/uploads/products/.
"""

from __future__ import annotations

import json
import re
import sqlite3
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

DUMP = Path("/Users/mac/Desktop/interview/jaha_live_updated/new_live_db.sql")
DB = Path("/Users/mac/Desktop/interview/jaha_live_revamp/backend/database/database.sqlite")
IMAGE_DIR = Path("/Users/mac/Desktop/interview/jaha_live_revamp/frontend/public/catalog")
ORIGIN = "https://www.jahavl.com/public/uploads/products/"

CATEGORY_SLUG = {1: "led", 2: "lighting", 3: "audio"}
SERIES_SLUG = {
    (1, "JE Series"): "je-series",
    (1, "J Series"): "j-series",
    (1, "JW Series"): "jw-series",
    (1, "JHD Series"): "jhd-series",
    (1, "Accessories"): "led-accessories",
    (2, "Versa Series"): "versa-series",
    (2, "HL Series"): "hl-series",
    (2, "Intelligent Series"): "intelligent-series",
    (2, "Console"): "console",
    (2, "Accessories"): "lighting-accessories",
    (3, "JLA"): "jla-series",
    (3, "JLS"): "jls-series",
    (3, "JDA"): "jda-series",
    (3, "JX Series"): "jx-series",
    (3, "Accessories"): "audio-accessories",
}
SERIES_LABEL = {
    "JLA": "JLA Series",
    "JLS": "JLS Series",
    "JDA": "JDA Series",
}


def parse_tuples(blob: str) -> list[list]:
    rows: list[list] = []
    i = 0
    n = len(blob)
    while i < n:
        if blob[i] != "(":
            i += 1
            continue
        i += 1
        fields: list = []
        while i < n:
            while i < n and blob[i] in " \n\r\t":
                i += 1
            if i >= n or blob[i] == ")":
                if i < n and blob[i] == ")":
                    i += 1
                break
            if blob.startswith("NULL", i) and (i + 4 == n or blob[i + 4] in ",)"):
                fields.append(None)
                i += 4
            elif blob[i] == "'":
                i += 1
                chars: list[str] = []
                while i < n:
                    if blob[i] == "\\":
                        i += 1
                        if i < n:
                            chars.append({"n": "\n", "r": "\r", "t": "\t"}.get(blob[i], blob[i]))
                            i += 1
                        continue
                    if blob[i] == "'":
                        if i + 1 < n and blob[i + 1] == "'":
                            chars.append("'")
                            i += 2
                            continue
                        i += 1
                        break
                    chars.append(blob[i])
                    i += 1
                fields.append("".join(chars))
            else:
                j = i
                while j < n and blob[j] not in ",)":
                    j += 1
                fields.append(blob[i:j].strip())
                i = j
            while i < n and blob[i] in " \n\r\t":
                i += 1
            if i < n and blob[i] == ",":
                i += 1
        rows.append(fields)
    return rows


def insert_blobs(sql: str, table: str) -> list[str]:
    marker = f"INSERT INTO `{table}`"
    blobs = []
    start = 0
    while True:
        start = sql.find(marker, start)
        if start < 0:
            break
        values = sql.find("VALUES", start)
        end = sql.find(";\n", values)
        blobs.append(sql[values + len("VALUES") : end])
        start = end
    if not blobs:
        raise SystemExit(f"missing {table}")
    return blobs


def insert_blob(sql: str, table: str) -> str:
    return "\n".join(insert_blobs(sql, table))


def num(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "product"


def first_sentence(text: str) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.!])\s", clean, maxsplit=1)
    return parts[0][:280]


def refresh_hz(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"(\d{3,5})", value.replace(",", ""))
    return int(match.group(1)) if match else None


def download(name: str) -> str | None:
    safe = Path(name).name
    if not safe or safe.startswith("."):
        return None
    dest = IMAGE_DIR / safe
    if dest.exists() and dest.stat().st_size > 800:
        return f"/catalog/{quote(safe)}"
    url = ORIGIN + quote(safe)
    try:
        request = Request(url, headers={"User-Agent": "JAH-catalog-import"})
        with urlopen(request, timeout=40, context=ssl.create_default_context()) as response:
            data = response.read()
    except (HTTPError, URLError, TimeoutError):
        return None
    if len(data) < 800:
        return None
    dest.write_bytes(data)
    return f"/catalog/{quote(safe)}"


def main() -> None:
    sql = DUMP.read_text(errors="replace")
    series_rows = parse_tuples(insert_blob(sql, "product_series"))
    product_rows = parse_tuples(insert_blob(sql, "products"))
    attachment_rows = parse_tuples(insert_blob(sql, "attachments"))
    attribute_rows = parse_tuples(insert_blob(sql, "product_attributes"))

    images: dict[str, list[str]] = {}
    for row in attachment_rows:
        images.setdefault(str(row[1]), []).append(row[2])

    specs: dict[str, list[dict[str, str]]] = {}
    highlights: dict[str, dict[str, str]] = {}
    for row in attribute_rows:
        name, value, product_id = row[1], row[2], str(row[3])
        if not name or not value or not str(value).strip():
            continue
        specs.setdefault(product_id, []).append({"name": name.strip(), "value": str(value).strip()})
        key = name.strip().lower()
        bucket = highlights.setdefault(product_id, {})
        if key in {"pixel pitch", "brightness", "refresh rate"}:
            bucket[key] = str(value).strip()

    published = []
    for row in product_rows:
        if str(row[60]) != "1":
            continue
        published.append(row)

    check = next(row for row in published if row[1] == "JHD2.5 V2")
    if abs((num(check[24]) or 0) - 1347.99) > 0.02 or abs((num(check[53]) or 0) - 1077.62) > 0.2:
        raise SystemExit(f"price columns drifted: msrp={check[24]} dealer={check[53]} fields={len(check)}")
    print(f"price check ok fields={len(check)}")

    needed: list[str] = []
    for row in published:
        for name in images.get(str(row[0]), []):
            needed.append(name)
            break
    unique = list(dict.fromkeys(needed))
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    saved: dict[str, str | None] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download, name): name for name in unique}
        for future in as_completed(futures):
            saved[futures[future]] = future.result()

    failed = [name for name, path in saved.items() if path is None]
    print(f"products={len(published)} images={len(unique)} failed={len(failed)}")
    if failed:
        print("missing:", ", ".join(failed[:20]))

    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA foreign_keys=ON")
    categories = {slug: cid for cid, slug in conn.execute("SELECT id, slug FROM categories")}
    conn.execute("DELETE FROM quote_items")
    conn.execute("DELETE FROM products")
    conn.execute("DELETE FROM series")

    series_ids: dict[str, int] = {}
    summaries: dict[str, str] = {}
    for row in series_rows:
        series_id, category_id, name = int(row[0]), int(row[1]), row[2]
        slug = SERIES_SLUG.get((category_id, name))
        cat_slug = CATEGORY_SLUG.get(category_id)
        if not slug or not cat_slug or cat_slug not in categories:
            continue
        label = SERIES_LABEL.get(name, name)
        cur = conn.execute(
            "INSERT INTO series (category_id, name, slug, summary, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
            (categories[cat_slug], label, slug, ""),
        )
        series_ids[str(series_id)] = cur.lastrowid
        summaries[str(series_id)] = ""

    used_slugs: set[str] = set()
    inserted = 0
    for row in published:
        legacy_id = str(row[0])
        series_key = str(row[4])
        if series_key not in series_ids:
            continue
        name = (row[1] or "Untitled").strip()
        description = re.sub(r"\s+", " ", row[2] or "").strip() or name
        if not summaries.get(series_key):
            summaries[series_key] = first_sentence(description)
        list_price = num(row[24]) or 0
        dealer = num(row[53]) or 0
        slug = slugify(name)
        if slug in used_slugs:
            slug = f"{slug}-{legacy_id}"
        used_slugs.add(slug)
        primary = next(iter(images.get(legacy_id, [])), None)
        image = saved.get(primary) if primary else None
        spec_rows = specs.get(legacy_id, [])
        pitch = highlights.get(legacy_id, {}).get("pixel pitch")
        brightness = highlights.get(legacy_id, {}).get("brightness")
        refresh = refresh_hz(highlights.get(legacy_id, {}).get("refresh rate"))
        conn.execute(
            """INSERT INTO products
            (series_id, name, slug, image, description, list_price, dealer_price, refresh_hz, pitch, brightness, specs, is_published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
            (
                series_ids[series_key],
                name,
                slug,
                image,
                description,
                round(list_price, 2),
                round(dealer, 2),
                refresh,
                pitch,
                brightness,
                json.dumps(spec_rows),
            ),
        )
        inserted += 1

    for legacy_series, summary in summaries.items():
        if legacy_series in series_ids and summary:
            conn.execute("UPDATE series SET summary=? WHERE id=?", (summary, series_ids[legacy_series]))

    conn.execute("DELETE FROM series WHERE id NOT IN (SELECT DISTINCT series_id FROM products)")

    quotes = conn.execute(
        "SELECT quotes.id, users.role FROM quotes JOIN users ON users.id = quotes.user_id"
    ).fetchall()
    products = conn.execute(
        "SELECT id, list_price, dealer_price FROM products WHERE list_price > 0 ORDER BY id"
    ).fetchall()
    for index, (quote_id, role) in enumerate(quotes):
        chosen = [products[(index * 3 + offset) % len(products)] for offset in range(3)]
        total = 0
        for product_id, list_price, dealer_price in chosen:
            unit = dealer_price if role == "dealer" and dealer_price else list_price
            qty = 2
            conn.execute(
                "INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
                (quote_id, product_id, qty, unit),
            )
            total += qty * float(unit)
        conn.execute("UPDATE quotes SET total=? WHERE id=?", (round(total, 2), quote_id))

    conn.commit()
    sample = conn.execute(
        "SELECT name, list_price, dealer_price, image FROM products WHERE name LIKE 'JHD2.5 V2'"
    ).fetchone()
    print("inserted", inserted, "sample", sample)
    conn.close()


if __name__ == "__main__":
    main()
