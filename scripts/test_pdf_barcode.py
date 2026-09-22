import fitz
import json
import subprocess
import os

# Generate barcode SVG from our verified Node service
cert_number = "AISC-2026-APPR-00001"
cmd = ["node", "-e", f"const {{ generateBarcodeSVG }} = require('./server/services/qrBarcodeService'); console.log(JSON.stringify(generateBarcodeSVG('{cert_number}')));"]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
barcode_info = json.loads(res.stdout)
svg_content = barcode_info['svg']

# Open sample certificate
doc = fitz.open("Graduating Members 2026/aastha-deshmukh-appreciation-letter-aisc-2026.pdf")
page = doc[0]

# Render SVG barcode to vector or high-DPI pixmap
svg_doc = fitz.open(stream=svg_content.encode('utf-8'), filetype='svg')
barcode_pix = svg_doc[0].get_pixmap(dpi=300)

# Placement:
# Page width: 1860, height: 2631.
# Right margin aligns at x = 1674.
# Date is at x=186, y=710.7 to 754.3.
# Let's position the barcode on the right side:
# Width = 400, Height = 65.
# x0 = 1674 - 400 = 1274, x1 = 1674.
# y0 = 675, y1 = 760.
barcode_rect = fitz.Rect(1274, 675, 1674, 760)

# Insert the barcode into the page
page.insert_image(barcode_rect, pixmap=barcode_pix)

# Save test PDF
os.makedirs("data/preview", exist_ok=True)
test_pdf_path = "data/preview/test_stamped_graduating.pdf"
doc.save(test_pdf_path)
print("Saved stamped test PDF:", test_pdf_path)

# Render as PNG to preview
test_doc = fitz.open(test_pdf_path)
test_doc[0].get_pixmap(dpi=150).save("data/preview/test_stamped_graduating.png")
print("Saved preview image: data/preview/test_stamped_graduating.png")
