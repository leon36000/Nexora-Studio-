import io

from PIL import Image
import pytest

from api.infrastructure.documents import UnreadablePdfError, read_pdf
from api.tests.unit.infrastructure.documents.pdfs import PageSpec, invoice_page, make_pdf


def _blank() -> PageSpec:
    return PageSpec()


def _scan() -> PageSpec:
    return PageSpec(image=True)


class TestReadPdf:
    def test_should_read_the_text_layer_in_reading_order(self):
        with read_pdf(make_pdf([invoice_page()])) as reading:
            markdown = reading.pages[0].markdown

        assert markdown.index("Facture FA-2026-0142") < markdown.index("Atelier Dubois") < markdown.index("Date : 12/03/2026")
        assert markdown.index("Date : 12/03/2026") < markdown.index("Total HT : 1 250,00 €") < markdown.index("Total TTC : 1 500,00 €")
        assert markdown.startswith("# Facture FA-2026-0142")
        assert reading.pages[0].needs_vision is False

    def test_should_render_a_ruled_table_as_markdown_inline(self):
        with read_pdf(make_pdf([invoice_page()])) as reading:
            page = reading.pages[0]

        assert "| Désignation | Qté | Prix HT |" in page.markdown
        assert "| --- | --- | --- |" in page.markdown
        assert "| Pose de parquet | 25 | 1 000,00 |" in page.markdown
        assert page.markdown.index("Date : 12/03/2026") < page.markdown.index("| Désignation") < page.markdown.index("Total HT")
        assert page.tables == []
        # The cell text is not repeated as loose lines.
        assert page.markdown.count("Pose de parquet") == 1

    @pytest.mark.parametrize("table_format, extension", [("markdown", "md"), ("html", "html")])
    def test_should_extract_tables_apart_with_placeholders(self, table_format, extension):
        with read_pdf(make_pdf([invoice_page(), invoice_page()]), table_format=table_format) as reading:
            first, second = reading.pages

        assert f"[tbl-0.{extension}](tbl-0.{extension})" in first.markdown
        assert f"[tbl-1.{extension}](tbl-1.{extension})" in second.markdown
        assert first.tables[0]["id"] == f"tbl-0.{extension}"
        assert first.tables[0]["format"] == table_format
        content = first.tables[0]["content"]
        if table_format == "html":
            assert content.startswith("<table>") and "<th>Désignation</th>" in content and "<td>Pose de parquet</td>" in content
        else:
            assert "| Pose de parquet | 25 | 1 000,00 |" in content

    def test_should_mark_a_page_without_text_but_with_an_image_as_needing_vision(self):
        with read_pdf(make_pdf([invoice_page(), _scan()])) as reading:
            assert [page.needs_vision for page in reading.pages] == [False, True]
            assert reading.pages[1].markdown is None

    def test_should_not_mark_a_blank_page(self):
        with read_pdf(make_pdf([invoice_page(), _blank()])) as reading:
            assert reading.pages[1].needs_vision is False
            assert reading.pages[1].markdown == ""

    @pytest.mark.parametrize("pages, expected", [(None, [0, 1, 2]), ([2, 0, 9, -1], [0, 2]), ("1-2", [1, 2]), ("0,2", [0, 2])])
    def test_should_read_only_the_requested_pages(self, pages, expected):
        with read_pdf(make_pdf([invoice_page(), _blank(), invoice_page()]), pages=pages) as reading:
            assert [page.index for page in reading.pages] == expected
            assert reading.page_count == 3

    @pytest.mark.parametrize("data", [b"not a pdf", b"%PDF-1.4\n1 0 obj\n<<", b""])
    def test_should_refuse_a_broken_pdf(self, data):
        with pytest.raises(UnreadablePdfError):
            read_pdf(data)

    def test_should_render_a_page_at_most_1568_px(self):
        with read_pdf(make_pdf([_scan()])) as reading:
            image = Image.open(io.BytesIO(reading.render_png(0)))

        assert max(image.size) == 1568
        assert image.format == "PNG"
