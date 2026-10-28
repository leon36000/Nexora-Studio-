"""Génère le jeu versionné K4 : 10 factures françaises fictives (5 PDF numériques, 5 scans) et attendu.json.

Usage : python3 scripts/fixtures/factures/generer.py
Les PDF numériques sont écrits octet par octet (bibliothèque standard : texte Helvetica, tableau à
filets). Les scans en sont des rendus bruités et inclinés : ils demandent Pillow et pypdfium2, les
bibliothèques de lecture de PDF de Nexora API (`pip install pillow pypdfium2`). Le tirage est fixe
(graine 2026) : relancer le script redonne les mêmes fichiers.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
import random

HERE = Path(__file__).resolve().parent

CLIENT = ["PME Démo SAS", "8 avenue des Tilleuls", "69007 Lyon"]

# numéro, date affichée, date ISO, fournisseur, adresse, lignes (désignation, qté, PU HT), taux TVA, libellés, format
INVOICES = [
    ("FA-2026-0142", "12/03/2026", "2026-03-12", "Atelier Dubois SARL", "12 rue des Lilas, 69003 Lyon",
     [("Pose de parquet chêne (m²)", 25, 40.00), ("Plinthes assorties (ml)", 10, 25.00)], 20, ("Total HT", "TVA 20 %", "Total TTC"), "pdf"),
    ("F2026/0087", "5 février 2026", "2026-02-05", "Boulangerie Martin", "3 place du Marché, 38000 Grenoble",
     [("Plateau viennoiseries (lot de 40)", 5, 45.00), ("Pains spéciaux", 31, 3.00), ("Livraison", 1, 0.18)], 10, ("Montant HT", "TVA 10 %", "Net à payer"), "pdf"),
    ("2026-INV-311", "28/01/2026", "2026-01-28", "Imprimerie Lefèvre & Fils", "45 boulevard Voltaire, 75011 Paris",
     [("Brochures A4 quadri (ex.)", 2000, 0.95), ("Cartes de visite (boîte de 500)", 12, 48.33), ("Frais de calage", 1, 0.04)], 20, ("Total HT", "TVA (20 %)", "Total TTC"), "pdf"),
    ("FAC-00921", "17/04/2026", "2026-04-17", "Garage Durand", "Zone artisanale Les Pins, 13400 Aubagne",
     [("Révision 60 000 km", 1, 389.00), ("Plaquettes de frein avant", 1, 156.50), ("Main-d'œuvre (h)", 2, 50.00)], 20, ("Total hors taxes", "TVA 20 %", "Total TTC"), "pdf"),
    ("2026-1043", "09/05/2026", "2026-05-09", "Librairie du Parc", "21 rue Nationale, 37000 Tours",
     [("Ouvrages de gestion", 6, 24.50), ("Abonnement revue (1 an)", 1, 42.57)], 5.5, ("Total HT", "TVA 5,5 %", "Total TTC"), "pdf"),
    ("FA-2026-0217", "21/06/2026", "2026-06-21", "Menuiserie Roche", "7 chemin des Écoliers, 44000 Nantes",
     [("Fenêtres PVC double vitrage", 4, 750.00), ("Pose et finitions", 1, 600.00)], 20, ("Total HT", "TVA 20 %", "Total TTC"), "png"),
    ("F-77-2026", "02/07/2026", "2026-07-02", "Traiteur Les Saveurs", "14 quai de la Loire, 45000 Orléans",
     [("Buffet séminaire (couverts)", 40, 25.00), ("Service et vaisselle", 1, 90.91)], 10, ("Montant HT", "TVA 10 %", "Montant TTC"), "jpg"),
    ("FC2026-058", "14/08/2026", "2026-08-14", "Électricité Moreau SAS", "102 route de Lyon, 01000 Bourg-en-Bresse",
     [("Mise aux normes tableau électrique", 1, 620.00), ("Prises et interrupteurs posés", 12, 20.00)], 20, ("Total HT", "TVA 20 %", "Total TTC"), "scan.pdf"),
    ("2026/0412", "30/09/2026", "2026-09-30", "Nettoyage Pro Services", "9 rue de l'Industrie, 59000 Lille",
     [("Entretien des bureaux (passages)", 8, 55.00), ("Nettoyage des vitres", 1, 80.00)], 20, ("Total HT", "TVA 20 %", "Total TTC"), "jpg"),
    ("FA26-1189", "06/10/2026", "2026-10-06", "Transports Bernard", "Parc logistique Nord, 67000 Strasbourg",
     [("Transport palettes Strasbourg-Lyon", 5, 325.05), ("Hayon et manutention", 1, 250.00)], 20, ("Total HT", "TVA 20 %", "Total TTC"), "scan.pdf"),
]


def money(value: float) -> str:
    """1875.25 ⇒ « 1 875,25 » (espace insécable fine absente de WinAnsi : espace simple)."""
    whole, cents = f"{value:.2f}".split(".")
    groups = []
    while len(whole) > 3:
        groups.insert(0, whole[-3:])
        whole = whole[:-3]
    groups.insert(0, whole)
    return " ".join(groups) + "," + cents


def escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def invoice_pdf(invoice) -> tuple[bytes, dict]:
    number, shown_date, iso_date, supplier, address, lines, rate, labels, _ = invoice
    ops: list[str] = []

    def text(x: float, y: float, size: float, value: str, bold: bool = False) -> None:
        ops.append(f"BT /{'F2' if bold else 'F1'} {size} Tf {x:.1f} {y:.1f} Td ({escape(value)}) Tj ET")

    def right(x: float, y: float, size: float, value: str, bold: bool = False) -> None:
        text(x - 0.5 * size * len(value), y, size, value, bold)  # Helvetica : ~0,5 em par chiffre

    text(50, 790, 16, supplier, bold=True)
    text(50, 772, 10, address)
    text(50, 758, 10, "SIRET 812 345 678 00021 - contact@exemple.fr")
    text(360, 790, 24, "FACTURE", bold=True)
    text(360, 766, 11, f"Facture n° {number}")
    text(360, 750, 11, f"Date : {shown_date}")
    text(360, 700, 10, "Client :", bold=True)
    for offset, line in enumerate(CLIENT):
        text(360, 686 - 14 * offset, 10, line)

    columns = ((50, 250, "Désignation"), (300, 60, "Qté"), (360, 90, "Prix unitaire HT"), (450, 95, "Total HT"))
    top, height = 620, 22
    rows = [[c[2] for c in columns]] + [[label, str(qty), money(unit), money(qty * unit)] for label, qty, unit in lines]
    for r, row in enumerate(rows):
        y = top - r * height
        for c, (x, width, _) in enumerate(columns):
            ops.append(f"{x} {y - height} {width} {height} re S")
            if c == 0:
                text(x + 5, y - 15, 9.5, row[c], bold=r == 0)
            else:
                right(x + width - 6, y - 15, 9.5, row[c], bold=r == 0)

    net = round(sum(qty * unit for _, qty, unit in lines), 2)
    tax = round(net * rate / 100, 2)
    gross = round(net + tax, 2)
    y = top - len(rows) * height - 30
    for label, amount, bold in ((labels[0], net, False), (labels[1], tax, False), (labels[2], gross, True)):
        text(330, y, 11, label, bold=bold)
        right(540, y, 11, f"{money(amount)} €", bold=bold)
        y -= 18
    text(50, 120, 9, "Conditions de paiement : 30 jours fin de mois. Pénalités de retard : 3 fois le taux légal.")
    text(50, 106, 9, "IBAN FR76 3000 6000 0112 3456 7890 189 - BIC AGRIFRPP")

    stream = "\n".join(ops).encode("cp1252")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for index, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{index} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode() + "".join(f"{o:010d} 00000 n \n" for o in offsets).encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    expected = {"numero": number, "date": iso_date, "fournisseur": supplier, "total_ht": net, "total_tva": tax, "total_ttc": gross}
    return bytes(out), expected


def scan(pdf: bytes, rng: random.Random):
    """Rendu 150 dpi, gris, incliné d'un degré environ, bruité et légèrement flou : une page passée au scanner."""
    from PIL import Image, ImageFilter
    import pypdfium2

    document = pypdfium2.PdfDocument(pdf)
    image = document[0].render(scale=150 / 72, fill_color=(255, 255, 255, 255)).to_pil().convert("L")
    document.close()
    image = image.rotate(rng.uniform(-1.4, 1.4), resample=Image.BICUBIC, expand=True, fillcolor=246)
    pixels = image.load()
    width, height = image.size
    for _ in range(width * height // 25):
        x, y = rng.randrange(width), rng.randrange(height)
        pixels[x, y] = max(0, min(255, pixels[x, y] + rng.randint(-60, 60)))
    return image.filter(ImageFilter.GaussianBlur(0.6))


def main() -> None:
    rng = random.Random(2026)
    expected = {}
    for position, invoice in enumerate(INVOICES, 1):
        pdf, values = invoice_pdf(invoice)
        kind = invoice[-1]
        name = f"facture-{position:02d}" + {"pdf": ".pdf", "png": "-scan.png", "jpg": "-scan.jpg", "scan.pdf": "-scan.pdf"}[kind]
        if kind == "pdf":
            (HERE / name).write_bytes(pdf)
        else:
            image = scan(pdf, rng)
            buffer = io.BytesIO()
            if kind == "png":
                image.save(buffer, format="PNG", optimize=True)
            elif kind == "jpg":
                image.save(buffer, format="JPEG", quality=72)
            else:
                image.save(buffer, format="PDF", resolution=150)
            (HERE / name).write_bytes(buffer.getvalue())
        expected[name] = values
    (HERE / "attendu.json").write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(expected)} factures écrites dans {HERE}")


if __name__ == "__main__":
    main()
