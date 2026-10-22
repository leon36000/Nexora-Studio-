"""Generates Nexora's provisional brand assets (favicons, logos, email wordmark).

Usage: python3 -I scripts/brand/generate_assets.py <Inter-Bold .woff/.ttf> <workstudio/apps/sim/public>
Needs Pillow and fontTools. The mark is the word "nexora" (and "n" for the icon) set in
Inter Bold (SIL Open Font License 1.1). Re-run once the final logo exists.
"""
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

INDIGO = (79, 70, 229, 255)  # #4F46E5
INK = (15, 23, 42, 255)  # slate-900
WHITE = (255, 255, 255, 255)
EMAIL_INK = (51, 51, 51, 255)


def outline(font: TTFont, text: str, height: float, tracking: int = -10):
    """Returns (svg path d strings, width) for text scaled so its ink height == height."""
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    placed, x = [], 0
    for ch in text:
        g = cmap[ord(ch)]
        placed.append((g, x))
        x += hmtx[g][0] + tracking
    xmin = ymin = float("inf"); xmax = ymax = float("-inf")
    for g, dx in placed:
        bp = BoundsPen(gs)
        gs[g].draw(TransformPen(bp, (1, 0, 0, 1, dx, 0)))
        if bp.bounds:
            a, b, c, d = bp.bounds
            xmin, ymin, xmax, ymax = min(xmin, a), min(ymin, b), max(xmax, c), max(ymax, d)
    k = height / (ymax - ymin)
    paths = []
    for g, dx in placed:
        pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, (dx - xmin) * k, ymax * k)))
        paths.append(pen.getCommands())
    return paths, (xmax - xmin) * k


def svg(width: float, height: float, body: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:g}" height="{height:g}" '
            f'viewBox="0 0 {width:g} {height:g}" fill="none">{body}</svg>\n')


def hexa(c) -> str:
    return "#%02X%02X%02X" % c[:3]


def icon_png(font_file: str, size: int) -> Image.Image:
    scale = 4  # supersample for clean edges
    s = size * scale
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=INDIGO)
    f = ImageFont.truetype(font_file, int(s * 0.78))
    l, t, r, b = d.textbbox((0, 0), "n", font=f)
    d.text(((s - (r - l)) / 2 - l, (s - (b - t)) / 2 - t), "n", font=f, fill=WHITE)
    return im.resize((size, size), Image.LANCZOS)


def wordmark_png(font: TTFont, font_file: str, canvas, ink_height: float, color) -> Image.Image:
    scale = 4
    w, h = canvas[0] * scale, canvas[1] * scale
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(font_file, 100)
    l, t, r, b = d.textbbox((0, 0), "nexora", font=f)
    f = ImageFont.truetype(font_file, int(100 * ink_height * scale / (b - t)))
    l, t, r, b = d.textbbox((0, 0), "nexora", font=f)
    d.text(((w - (r - l)) / 2 - l, (h - (b - t)) / 2 - t), "nexora", font=f, fill=color)
    return im.resize(canvas, Image.LANCZOS)


def main() -> int:
    font_file, public = sys.argv[1], Path(sys.argv[2])
    font = TTFont(font_file)

    # Icon (square, rounded, white "n" on indigo)
    n_paths, n_width = outline(font, "n", 100)
    box = 192
    k = box * 0.56 / 100
    n_body = "".join(f'<path d="{p}" fill="#FFFFFF"/>' for p in n_paths)
    icon_svg = svg(box, box, f'<rect width="{box}" height="{box}" rx="{box * 0.22:g}" fill="{hexa(INDIGO)}"/>'
                   f'<g transform="translate({(box - n_width * k) / 2:.2f} {(box - 100 * k) / 2:.2f}) scale({k:.4f})">{n_body}</g>')
    (public / "icon.svg").write_text(icon_svg)
    (public / "favicon/favicon.svg").write_text(icon_svg)
    for name, size in [("favicon-16x16.png", 16), ("favicon-32x32.png", 32), ("favicon-96x96.png", 96),
                       ("apple-touch-icon.png", 180), ("android-chrome-192x192.png", 192), ("android-chrome-512x512.png", 512),
                       ("web-app-manifest-192x192.png", 192), ("web-app-manifest-512x512.png", 512)]:
        icon_png(font_file, size).save(public / "favicon" / name)
    icon_png(font_file, 256).save(public / "favicon/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Wordmark SVGs (light and dark ink)
    w_paths, w_width = outline(font, "nexora", 22)
    for name, color in [("logo/b&w/text/b&w.svg", INK), ("logo/wordmark.svg", INK), ("logo/wordmark-dark.svg", WHITE)]:
        body = "".join(f'<path d="{p}" fill="{hexa(color)}"/>' for p in w_paths)
        (public / name).parent.mkdir(parents=True, exist_ok=True)
        (public / name).write_text(svg(round(w_width, 2), 22, body))

    # Social card logo (426x240, white wordmark on indigo)
    card = Image.new("RGBA", (426, 240), INDIGO)
    mark = wordmark_png(font, font_file, (426, 240), 52, WHITE)
    card.alpha_composite(mark)
    (public / "logo/426-240/reverse").mkdir(parents=True, exist_ok=True)
    card.convert("RGB").save(public / "logo/426-240/reverse/small.png")

    # Email header wordmark: EMAIL_WORDMARK_CANVAS (lib/branding/wordmark.ts), ink ~ 88% of its height
    wordmark_png(font, font_file, (600, 102), 102 * 0.88, EMAIL_INK).save(public / "brand/color/email/wordmark.png")
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
