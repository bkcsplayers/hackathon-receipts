import asyncio
import io


async def pdf_first_page_to_png(pdf_bytes: bytes) -> bytes:
    """Render first PDF page to PNG bytes for vision OCR."""

    def _render() -> bytes:
        import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.page_count < 1:
            raise ValueError("PDF has no pages")
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        return pix.tobytes("png")

    return await asyncio.to_thread(_render)
