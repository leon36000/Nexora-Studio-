"""Small PDFs built byte by byte for the reader tests: text at a position, ruled cells, a page image."""

from dataclasses import dataclass, field
import zlib


@dataclass
class PageSpec:
    texts: list[tuple[float, float, float, str]] = field(default_factory=list)  # x, y, size, text
    cells: list[tuple[float, float, float, float]] = field(default_factory=list)  # x, y, width, height
    image: bool = False


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(pages: list[PageSpec]) -> bytes:
    objects: list[bytes] = [b"<< /Type /Catalog /Pages 2 0 R >>", b""]
    font = 3
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    kids = []
    for page in pages:
        ops = []
        for x, y, w, h in page.cells:
            ops.append(f"{x} {y} {w} {h} re S")
        for x, y, size, text in page.texts:
            ops.append(f"BT /F1 {size} Tf {x} {y} Td ({_escape(text)}) Tj ET")
        resources = f"/Font << /F1 {font} 0 R >>"
        if page.image:
            pixels = bytes(((x // 8 + y // 8) % 2) * 255 for y in range(64) for x in range(64))
            data = zlib.compress(pixels)
            objects.append(
                f"<< /Type /XObject /Subtype /Image /Width 64 /Height 64 /ColorSpace /DeviceGray /BitsPerComponent 8 "
                f"/Filter /FlateDecode /Length {len(data)} >>\nstream\n".encode()
                + data
                + b"\nendstream"
            )
            resources += f" /XObject << /Im1 {len(objects)} 0 R >>"
            ops.append("q 500 0 0 700 50 70 cm /Im1 Do Q")
        stream = "\n".join(ops).encode("cp1252")
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
        content = len(objects)
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents {content} 0 R /Resources << {resources} >> >>".encode())
        kids.append(len(objects))
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] /Count {len(kids)} >>".encode()
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets).encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


def invoice_page() -> PageSpec:
    """A French invoice: a title, a few lines, then a ruled three-column table, then the totals."""
    page = PageSpec(
        texts=[
            (50, 780, 22, "Facture FA-2026-0142"),
            (50, 750, 11, "Atelier Dubois SARL, 12 rue des Lilas, 69003 Lyon"),
            (50, 734, 11, "Date : 12/03/2026"),
            (50, 600, 11, "Total HT : 1 250,00 €"),
            (50, 584, 11, "TVA 20 % : 250,00 €"),
            (50, 568, 11, "Total TTC : 1 500,00 €"),
        ]
    )
    rows = [("Désignation", "Qté", "Prix HT"), ("Pose de parquet", "25", "1 000,00"), ("Plinthes", "10", "250,00")]
    top = 700
    for r, row in enumerate(rows):
        y = top - r * 20
        for c, (x, width) in enumerate(((50, 250), (300, 80), (380, 120))):
            page.cells.append((x, y - 20, width, 20))
            page.texts.append((x + 4, y - 14, 10, row[c]))
    return page
