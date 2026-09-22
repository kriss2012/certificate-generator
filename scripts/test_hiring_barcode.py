import fitz
import json
import subprocess
import os

cert_number = "AISC-2026-HIRE-00001"
cmd = ["node", "-e", f"const {{ generateBarcodeSVG }} = require('./server/services/qrBarcodeService'); console.log(JSON.stringify(generateBarcodeSVG('{cert_number}')));"]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
barcode_info = json.loads(res.stdout)
svg_content = barcode_info['svg']

doc = fitz.open("Hiring AY 2026-27/president-membership-letter-aisc-2026.pdf")
page = doc[0]

svg_doc = fitz.open(stream=svg_content.encode('utf-8'), filetype='svg')
barcode_pix = svg_doc[0].get_pixmap(dpi=300)

# Placement on Hiring Letter:
# Date is at y0 = 520.8, y1 = 564.4.
# Barcode box:
barcode_rect = fitz.Rect(1274, 485, 1674, 575)
page.insert_image(barcode_rect, pixmap=barcode_pix)

os.makedirs("data/preview", exist_ok=True)
test_pdf_path = "data/preview/test_stamped_hiring.pdf"
doc.save(test_pdf_path)

test_doc = fitz.open(test_pdf_path)
test_doc[0].get_pixmap(dpi=150).save("data/preview/test_stamped_hiring.png")
print("Saved preview image: data/preview/test_stamped_hiring.png")
