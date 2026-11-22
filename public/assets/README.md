# Saudi riyal symbol provenance

`saudi-riyal.png` is the original Saudi riyal symbol image extracted from a primary-source submission by the Saudi Arabian Central Bank (SAMA), hosted by the Unicode Consortium:

- Source: [Proposal to add the currency sign for the SAUDI RIYAL to the UCS](https://www.unicode.org/L2/L2025/25075-saudi-central-bank.pdf).
- Location: Attachment 1, “Saudi Riyal symbol with original size/proportion,” PDF page 4 (zero-based page index 3).
- Image: PDF object xref 43, with its original soft transparency mask at xref 44.
- Asset dimensions: **533 × 595 pixels**, RGBA with transparent background.
- Extraction: the original embedded RGB image and its soft mask were composed without resizing, tracing, redrawing or changing the geometry. The result was visually checked against the source page.

This asset is a raster image, not an SVG. The official [SAMA SVG download](https://www.sama.gov.sa/ar-sa/Currency/Documents/Saudi_Riyal_Symbol-2.svg) was unavailable during preparation, so the primary-source embedded image was used. No scraped mirror or invented vector approximation was used.

## Rendering and placement

The application uses the PNG as a CSS alpha mask with `currentColor`, preserving its original aspect ratio. This makes the symbol match the surrounding text color without depending on a device font containing the new Saudi riyal glyph.

Follow [SAMA's usage guidelines](https://www.sama.gov.sa/ar-sa/Currency/SRS/Documents/Guidelines.pdf): place the symbol physically to the left of the numerical value in both Arabic and English, leave spacing between them, preserve geometry and proportions, align its height with the text and maintain contrast. The [official download and guidelines page](https://www.sama.gov.sa/en-US/Currency/SRS/Pages/Guideline.aspx) provides the source materials.

## SHA-256 provenance

| File | SHA-256 |
| --- | --- |
| Original Unicode-hosted SAMA PDF | `e3319b31d04f9b059d02b7167967096658ab892cf73eacb8b9235be1e3e5a3aa` |
| Extracted `saudi-riyal.png` | `3137011b4ab3dc2d4047ae09fb0577621550050a3d3da1403fd565394b89b2dd` |
