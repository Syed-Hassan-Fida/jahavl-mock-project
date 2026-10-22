#!/usr/bin/env python3
"""Generate a single-page outreach PDF for Jordan Hardison / JAH Audio."""

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent / "JAH-Audio-Selling-Platform-One-Pager.pdf"

BG = (0.039, 0.047, 0.059)
PANEL = (0.078, 0.094, 0.122)
PANEL2 = (0.102, 0.122, 0.157)
INK = (0.949, 0.957, 0.969)
MUTED = (0.545, 0.584, 0.647)
DIM = (0.380, 0.420, 0.480)
AMBER = (0.941, 0.635, 0.008)
CYAN = (0.176, 0.831, 0.749)
LINE = (0.165, 0.196, 0.251)


def fill(c, color):
    c.setFillColorRGB(*color)


def stroke(c, color):
    c.setStrokeColorRGB(*color)


def register_fonts():
    pdfmetrics.registerFont(
        TTFont("DIN", "/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf")
    )
    pdfmetrics.registerFont(
        TTFont("AN", "/System/Library/Fonts/Avenir Next.ttc", subfontIndex=0)
    )
    pdfmetrics.registerFont(
        TTFont("ANMed", "/System/Library/Fonts/Avenir Next.ttc", subfontIndex=3)
    )
    pdfmetrics.registerFont(
        TTFont("ANDemi", "/System/Library/Fonts/Avenir Next.ttc", subfontIndex=4)
    )


def rounded_rect(c, x, y, w, h, r, fill_color=None, stroke_color=None, sw=0.6):
    c.saveState()
    if fill_color:
        fill(c, fill_color)
    if stroke_color:
        stroke(c, stroke_color)
        c.setLineWidth(sw)
    if fill_color and stroke_color:
        c.roundRect(x, y, w, h, r, fill=1, stroke=1)
    elif fill_color:
        c.roundRect(x, y, w, h, r, fill=1, stroke=0)
    else:
        c.roundRect(x, y, w, h, r, fill=0, stroke=1)
    c.restoreState()


def draw_chip(c, x, y, w, h, label, accent=AMBER):
    rounded_rect(c, x, y, w, h, 3.5, fill_color=PANEL2, stroke_color=LINE, sw=0.45)
    fill(c, accent)
    c.circle(x + 9, y + h / 2, 2.0, fill=1, stroke=0)
    fill(c, INK)
    c.setFont("ANMed", 7.2)
    c.drawString(x + 15, y + h / 2 - 2.4, label)


def wrap_text(c, text, font, size, max_width):
    c.setFont(font, size)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def stack_node(c, x, y, w, h, label, sub):
    rounded_rect(c, x, y, w, h, 5, fill_color=PANEL2, stroke_color=LINE, sw=0.5)
    fill(c, CYAN)
    c.setFont("ANMed", 6.5)
    c.drawCentredString(x + w / 2, y + h - 12, label)
    fill(c, INK)
    c.setFont("ANDemi", 8)
    c.drawCentredString(x + w / 2, y + 8, sub)


def arrow(c, x1, y, x2):
    stroke(c, DIM)
    c.setLineWidth(0.7)
    c.line(x1, y, x2, y)
    fill(c, DIM)
    path = c.beginPath()
    path.moveTo(x2, y)
    path.lineTo(x2 - 4, y + 2.5)
    path.lineTo(x2 - 4, y - 2.5)
    path.close()
    c.drawPath(path, fill=1, stroke=0)


def build():
    register_fonts()
    W, H = letter
    c = canvas.Canvas(str(OUT), pagesize=letter)
    c.setTitle("JAH Audio Selling Platform — One-Pager for Jordan A. Hardison")
    c.setAuthor("JAHAVL Delivery")
    c.setSubject("Catalog, quoting, and channel portals for JAH AUDIO, CORP. (jahavl.com)")

    fill(c, BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Ambient stage wash (soft corner glow via stacked translucent-ish rects — solid approx)
    fill(c, (0.06, 0.07, 0.09))
    c.rect(0, H - 200, W, 200, fill=1, stroke=0)

    # Left rail
    fill(c, AMBER)
    c.rect(0, 0, 5.5, H, fill=1, stroke=0)
    fill(c, CYAN)
    c.rect(0, H - 88, 5.5, 88, fill=1, stroke=0)

    # Micro grid ticks (craft signal)
    stroke(c, (0.12, 0.14, 0.18))
    c.setLineWidth(0.3)
    for i in range(0, 12):
        x = W - 28 - i * 6
        c.line(x, H - 18, x, H - 22)

    # Header
    fill(c, MUTED)
    c.setFont("ANMed", 6.8)
    c.drawString(26, H - 26, "PREPARED FOR")
    fill(c, INK)
    c.setFont("ANDemi", 9)
    c.drawString(26, H - 40, "Jordan A. Hardison  ·  CEO, JAH AUDIO, CORP.")

    fill(c, DIM)
    c.setFont("AN", 6.8)
    c.drawRightString(W - 26, H - 26, "CONFIDENTIAL BRIEF")
    fill(c, CYAN)
    c.setFont("ANMed", 7.2)
    c.drawRightString(W - 26, H - 40, "jahavl.com  ·  P17000011640")

    stroke(c, LINE)
    c.setLineWidth(0.7)
    c.line(26, H - 50, W - 26, H - 50)

    # Hero
    fill(c, AMBER)
    c.setFont("ANMed", 7.5)
    c.drawString(26, H - 70, "NOT A DISCOVERY CALL  —  A WORKING PRODUCT REVIEW")

    fill(c, INK)
    c.setFont("DIN", 30)
    c.drawString(26, H - 104, "A selling OS for JAH.")

    fill(c, MUTED)
    c.setFont("AN", 10.5)
    c.drawString(26, H - 124, "So the AV business runs as cleanly as your Sunday stack.")

    fill(c, DIM)
    c.setFont("AN", 7.8)
    c.drawString(
        26,
        H - 142,
        "LED walls  ·  stage lighting  ·  live sound  ·  worship + venues + touring",
    )
    fill(c, CYAN)
    c.setFont("ANMed", 7.2)
    c.drawString(
        26,
        H - 156,
        "Anchored to JAH AUDIO, CORP. (jahavl.com) — not Jerry Harvey / JH Audio.",
    )

    # Architecture strip — expertise signal
    arch_y = H - 196
    nodes = [
        ("WEB", "Next.js"),
        ("API", "Laravel"),
        ("LIVE", "SSE"),
        ("MOBILE", "Expo"),
        ("ROLES", "4 portals"),
    ]
    nw = 88
    gap = 14
    total = len(nodes) * nw + (len(nodes) - 1) * gap
    start = (W - total) / 2
    for i, (lab, sub) in enumerate(nodes):
        x = start + i * (nw + gap)
        stack_node(c, x, arch_y, nw, 28, lab, sub)
        if i < len(nodes) - 1:
            arrow(c, x + nw + 2, arch_y + 14, x + nw + gap - 2)

    # Evidence panel
    y0 = arch_y - 14
    panel_h = 148
    rounded_rect(c, 26, y0 - panel_h, W - 52, panel_h, 8, fill_color=PANEL, stroke_color=LINE)

    fill(c, CYAN)
    c.setFont("ANMed", 7.2)
    c.drawString(40, y0 - 16, "ALREADY BUILT  —  EVIDENCE FIRST")

    fill(c, INK)
    c.setFont("DIN", 12.5)
    c.drawString(40, y0 - 34, "Web + mobile commerce stack, mapped to how JAH sells.")

    body = (
        "We rebuilt a production-ready catalog, multi-role quoting, and channel portals "
        "around your series lines (J / JE / JW / JHD · Versa · JLA / JLS / JDA) — "
        "client, dealer, sales, and admin — with live operational updates. "
        "This is not a mockup deck. It is a staging walkthrough."
    )
    fill(c, MUTED)
    ty = y0 - 50
    for line in wrap_text(c, body, "AN", 8, W - 52 - 30):
        c.setFont("AN", 8)
        c.drawString(40, ty, line)
        ty -= 11

    chips = [
        ("Public catalog", AMBER),
        ("Role-aware quotes", CYAN),
        ("Dealer / client / sales / admin", AMBER),
        ("Expo mobile companion", CYAN),
        ("Tickets · messages · alerts", AMBER),
        ("Live updates layer", CYAN),
    ]
    chip_y = y0 - panel_h + 16
    x = 40
    for label, acc in chips:
        tw = c.stringWidth(label, "ANMed", 7.2) + 24
        if x + tw > W - 40:
            x = 40
            chip_y += 22  # shouldn't need; keep one/two rows
        draw_chip(c, x, chip_y, tw, 17, label, accent=acc)
        x += tw + 7

    # We are / We are not
    col_top = y0 - panel_h - 12
    col_h = 108
    col_w = (W - 52 - 10) / 2

    rounded_rect(c, 26, col_top - col_h, col_w, col_h, 8, fill_color=PANEL, stroke_color=LINE)
    rounded_rect(
        c, 26 + col_w + 10, col_top - col_h, col_w, col_h, 8, fill_color=PANEL, stroke_color=LINE
    )

    fill(c, AMBER)
    c.setFont("ANMed", 7.2)
    c.drawString(40, col_top - 16, "WE ARE")
    we_are = [
        "Partner for JAH commerce & channel software",
        "Technically fluent — Next.js, API, Expo, live",
        "Focused on LED / lighting / sound selling ops",
        "Ready with a 30-min staging walkthrough",
    ]
    yy = col_top - 32
    for item in we_are:
        fill(c, AMBER)
        c.circle(44, yy + 2.2, 1.7, fill=1, stroke=0)
        fill(c, INK)
        c.setFont("AN", 7.5)
        for ln in wrap_text(c, item, "AN", 7.5, col_w - 34):
            c.drawString(52, yy, ln)
            yy -= 9.5
        yy -= 3.5

    rx = 26 + col_w + 10 + 14
    fill(c, MUTED)
    c.setFont("ANMed", 7.2)
    c.drawString(rx, col_top - 16, "WE ARE NOT")
    we_not = [
        "A replacement for AIO.Church / R.ai / AIO Assist",
        'A generic "AI for churches" pitch',
        "Confusing you with JH Audio (Jerry Harvey)",
        "Asking for a long discovery marathon",
    ]
    yy = col_top - 32
    for item in we_not:
        fill(c, DIM)
        c.circle(rx + 4, yy + 2.2, 1.7, fill=1, stroke=0)
        fill(c, MUTED)
        c.setFont("AN", 7.5)
        for ln in wrap_text(c, item, "AN", 7.5, col_w - 34):
            c.drawString(rx + 12, yy, ln)
            yy -= 9.5
        yy -= 3.5

    # Why bar
    why_top = col_top - col_h - 12
    rounded_rect(c, 26, why_top - 64, W - 52, 64, 8, fill_color=PANEL2, stroke_color=LINE)
    fill(c, CYAN)
    c.setFont("ANMed", 7.2)
    c.drawString(40, why_top - 14, "WHY THIS RESPECTS YOUR BAR")
    fill(c, INK)
    why = (
        "You build AI operating systems for churches and ship with agent discipline. "
        "We speak that language — reliability, roles, auditability — applied to JAH's "
        "selling surface. Your AIO lane stays yours. Our ask is capacity on JAH digital "
        "ops so catalog, quotes, and dealers match the product quality behind them."
    )
    ty = why_top - 28
    for line in wrap_text(c, why, "AN", 7.6, W - 52 - 28):
        c.setFont("AN", 7.6)
        c.drawString(40, ty, line)
        ty -= 10.2

    # CTA
    cta_y = 46
    fill(c, AMBER)
    c.roundRect(26, cta_y, W - 52, 58, 8, fill=1, stroke=0)

    # Dark inset on right for reply chip
    fill(c, BG)
    c.roundRect(W - 158, cta_y + 12, 118, 34, 6, fill=1, stroke=0)
    fill(c, AMBER)
    c.setFont("ANDemi", 7.5)
    c.drawCentredString(W - 99, cta_y + 30, "REPLY TO")
    c.setFont("DIN", 10)
    c.drawCentredString(W - 99, cta_y + 17, "SCHEDULE")

    fill(c, BG)
    c.setFont("DIN", 13.5)
    c.drawString(40, cta_y + 34, "Next step: 30-minute product review")
    c.setFont("AN", 7.5)
    c.drawString(
        40,
        cta_y + 18,
        "Staging URL  ·  mobile companion  ·  go-live cut (dealer net · PDF · payments · cutover)",
    )
    c.setFont("AN", 6.8)
    fill(c, (0.15, 0.12, 0.05))
    # Use BG text on amber — already set BG above for title; keep secondary darker
    fill(c, (0.20, 0.14, 0.02))
    c.setFont("ANMed", 6.5)
    fill(c, BG)
    c.setFont("AN", 6.8)
    c.drawString(40, cta_y + 6, "Attach with LinkedIn DM or email  ·  peer builder to peer builder")

    # Footer
    fill(c, DIM)
    c.setFont("AN", 6.2)
    c.drawString(
        26,
        26,
        "JAH AUDIO, CORP.  ·  Florida P17000011640  ·  Fort Pierce  ·  Distinct from JH Audio (Jerry Harvey Audio)",
    )
    c.drawRightString(W - 26, 26, "One page. No fluff. Working software.")

    c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
