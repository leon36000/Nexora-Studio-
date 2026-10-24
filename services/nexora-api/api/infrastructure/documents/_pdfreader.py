"""Nexora: reads the text layer of a digital PDF locally, in reading order, with its ruled tables.

A vision model served through chat completions reads images only. A PDF with a text layer needs
no model at all: pdfplumber (MIT) gives each line with its position and font size, and the tables
drawn with ruling lines; the page becomes Markdown with headings and tables placed where they sit.
A page without text but with an image is a scan: it is rendered (pypdfium2) for the vision model.
"""

from dataclasses import dataclass, field
import io
import logging
from statistics import median
from typing import Literal

import pdfplumber
import pypdfium2

logger = logging.getLogger(__name__)

TableFormat = Literal["markdown", "html"]

# A page with fewer visible characters than this and an image is a scan.
MIN_TEXT_CHARS = 20
# Longest side of a rendered page: the size vision models read best (WorkStudio uses the same).
PAGE_MAX_DIMENSION = 1568
# Font size ratios over the page's median that make a line a heading.
TITLE_RATIO, HEADING_RATIO = 1.6, 1.3


class UnreadablePdfError(Exception):
    """The bytes are not a PDF this reader can open (broken, empty or encrypted)."""


@dataclass
class PdfPage:
    index: int
    # The page as Markdown; None for a scan, which a vision model must read.
    markdown: str | None
    needs_vision: bool
    tables: list[dict] = field(default_factory=list)


@dataclass
class PdfReading:
    pages: list[PdfPage]
    page_count: int
    _data: bytes
    _rendered: pypdfium2.PdfDocument | None = None

    def render_png(self, index: int) -> bytes:
        """The page as a PNG image, at most 1568 px on its longest side, on a white background."""
        if self._rendered is None:
            self._rendered = pypdfium2.PdfDocument(self._data)
        page = self._rendered[index]
        width, height = page.get_size()
        image = page.render(scale=PAGE_MAX_DIMENSION / max(width, height), fill_color=(255, 255, 255, 255)).to_pil()
        page.close()
        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="PNG")
        return buffer.getvalue()

    def close(self) -> None:
        if self._rendered is not None:
            self._rendered.close()
            self._rendered = None

    def __enter__(self) -> "PdfReading":
        return self

    def __exit__(self, *_) -> None:
        self.close()


def _wanted_pages(pages: list[int] | str | None, count: int) -> list[int]:
    if pages is None:
        return list(range(count))
    wanted: set[int] = set()
    if isinstance(pages, str):
        for part in pages.split(","):
            part = part.strip()
            if not part:
                continue
            start, _, end = part.partition("-")
            try:
                first, last = int(start), int(end) if end else int(start)
            except ValueError:
                continue
            wanted.update(range(first, last + 1))
    else:
        wanted.update(pages)
    return sorted(index for index in wanted if 0 <= index < count)


def _cell(value: str | None) -> str:
    return " ".join((value or "").split()).replace("|", "\\|")


def _markdown_table(rows: list[list[str | None]]) -> str:
    width = max(len(row) for row in rows)
    cells = [[_cell(value) for value in row] + [""] * (width - len(row)) for row in rows]
    lines = ["| " + " | ".join(cells[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
    lines += ["| " + " | ".join(row) + " |" for row in cells[1:]]
    return "\n".join(lines)


def _html_cell(value: str | None) -> str:
    return " ".join((value or "").split()).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _html_table(rows: list[list[str | None]]) -> str:
    header = "".join(f"<th>{_html_cell(value)}</th>" for value in rows[0])
    body = "".join("<tr>" + "".join(f"<td>{_html_cell(value)}</td>" for value in row) + "</tr>" for row in rows[1:])
    return f"<table><tr>{header}</tr>{body}</table>"


def _inside(obj: dict, boxes: list[tuple[float, float, float, float]]) -> bool:
    x = (obj["x0"] + obj["x1"]) / 2
    y = (obj["top"] + obj["bottom"]) / 2
    return any(x0 <= x <= x1 and top <= y <= bottom for x0, top, x1, bottom in boxes)


def _read_page(page, table_format: TableFormat | None, next_table_number: int) -> tuple[PdfPage, int]:
    chars = [char for char in page.chars if char["text"].strip()]
    if len(chars) < MIN_TEXT_CHARS and page.images:
        return PdfPage(index=page.page_number - 1, markdown=None, needs_vision=True), next_table_number

    items: list[tuple[float, str]] = []
    tables: list[dict] = []
    boxes = []
    for table in page.find_tables():
        rows = [row for row in table.extract() if any((value or "").strip() for value in row)]
        if not rows:
            continue
        boxes.append(table.bbox)
        if table_format is None:
            items.append((table.bbox[1], _markdown_table(rows)))
            continue
        extension = "md" if table_format == "markdown" else "html"
        table_id = f"tbl-{next_table_number}.{extension}"
        next_table_number += 1
        content = _markdown_table(rows) if table_format == "markdown" else _html_table(rows)
        tables.append({"id": table_id, "content": content, "format": table_format})
        items.append((table.bbox[1], f"[{table_id}]({table_id})"))

    text_layer = page.filter(lambda obj: obj.get("object_type") != "char" or not _inside(obj, boxes)) if boxes else page
    lines = text_layer.extract_text_lines(strip=True, return_chars=True)
    sizes = [char["size"] for line in lines for char in line["chars"] if char["text"].strip()]
    body_size = median(sizes) if sizes else 0
    for line in lines:
        text = " ".join(line["text"].split())
        if not text:
            continue
        line_sizes = [char["size"] for char in line["chars"] if char["text"].strip()]
        size = sum(line_sizes) / len(line_sizes) if line_sizes else body_size
        if body_size and len(text) <= 120 and size >= TITLE_RATIO * body_size:
            text = f"# {text}"
        elif body_size and len(text) <= 120 and size >= HEADING_RATIO * body_size:
            text = f"## {text}"
        items.append((line["top"], text))

    items.sort(key=lambda item: item[0])
    blocks: list[str] = []
    for _, text in items:
        standalone = text.startswith(("#", "|", "[tbl-"))
        if blocks and not standalone and not blocks[-1].startswith(("#", "|", "[tbl-")):
            blocks[-1] += "\n" + text
        else:
            blocks.append(text)
    return PdfPage(index=page.page_number - 1, markdown="\n\n".join(blocks), needs_vision=False, tables=tables), next_table_number


def read_pdf(data: bytes, pages: list[int] | str | None = None, table_format: TableFormat | None = None) -> PdfReading:
    """Reads the requested pages (zero-based; a list or Mistral's « 0,2-4 » string) of a PDF."""
    try:
        with pdfplumber.open(io.BytesIO(data)) as document:
            count = len(document.pages)
            read: list[PdfPage] = []
            table_number = 0
            for index in _wanted_pages(pages, count):
                page, table_number = _read_page(document.pages[index], table_format, table_number)
                read.append(page)
    except Exception as error:  # noqa: BLE001 - pdfminer raises many unrelated types for a bad file
        logger.info("unreadable PDF: %r", error)
        raise UnreadablePdfError(str(error) or type(error).__name__) from error
    return PdfReading(pages=read, page_count=count, _data=data)
