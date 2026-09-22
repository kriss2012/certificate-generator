import fitz
import os
import subprocess

def test_generate_graduating_cert():
    template_path = "Graduating Members 2026/aastha-deshmukh-appreciation-letter-aisc-2026.pdf"
    doc = fitz.open(template_path)
    page = doc[0]

    # Name bbox:
    page.add_redact_annot(fitz.Rect(180, 890, 1600, 960), fill=False)
    # Class value:
    page.add_redact_annot(fitz.Rect(270, 1005, 1600, 1050), fill=False)
    # Position value:
    page.add_redact_annot(fitz.Rect(400, 1050, 1600, 1095), fill=False)
    # Tenure value:
    page.add_redact_annot(fitz.Rect(490, 1095, 1600, 1140), fill=False)

    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    font_gold = (0.757, 0.588, 0.278) # #c19647
    font_navy = (0.063, 0.275, 0.439) # #104670

    font_path_guerilla = os.path.abspath("data/fonts/ProtestGuerrilla-Regular.ttf")

    new_name = "Mr. Rohan Kailash Sharma"
    new_class = "MCA (Int.) - III"
    new_position = "Technical Department Head"
    new_tenure = "AY 2025-26"

    # Insert new name:
    page.insert_text(
        fitz.Point(186.0, 943.63),
        new_name,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=53.0,
        color=font_gold
    )

    # Insert new class:
    page.insert_text(
        fitz.Point(273.45, 1039.63),
        new_class,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=32.0,
        color=font_navy
    )

    # Insert new position:
    page.insert_text(
        fitz.Point(405.0, 1083.88),
        new_position,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=32.0,
        color=font_navy
    )

    # Insert new tenure:
    page.insert_text(
        fitz.Point(495.0, 1128.13),
        new_tenure,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=32.0,
        color=font_navy
    )

    # Stamp dual badge:
    cmd = ["node", "-e", "const { generateDualVerificationBadgeSVG } = require('./server/services/qrBarcodeService'); (async () => { const b = await generateDualVerificationBadgeSVG('AISC-2026-GRAD-99999', 'http://10.1.65.29:3000/verify/AISC-2026-GRAD-99999', { width: 420, height: 95 }); console.log(b.svg); })();"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    svg_content = res.stdout.strip()

    svg_doc = fitz.open(stream=svg_content.encode("utf-8"), filetype="svg")
    barcode_pix = svg_doc[0].get_pixmap(dpi=300)
    barcode_rect = fitz.Rect(1254, 670, 1674, 765)
    page.insert_image(barcode_rect, pixmap=barcode_pix)

    os.makedirs("data/preview", exist_ok=True)
    out_pdf = "data/preview/test_new_grad_rohan.pdf"
    doc.save(out_pdf)
    doc.close()

    d2 = fitz.open(out_pdf)
    d2[0].get_pixmap(dpi=150).save("data/preview/test_new_grad_rohan.png")
    d2.close()
    print("SUCCESS: Generated data/preview/test_new_grad_rohan.png with badge!")

if __name__ == "__main__":
    test_generate_graduating_cert()
