import fitz
import os

def test_generate_official_cert():
    # Base template:
    template_path = "Hiring AY 2026-27/president-membership-letter-aisc-2026.pdf"
    doc = fitz.open(template_path)
    page = doc[0]

    # Recipient name bounding box in hiring letter:
    # y ranges from ~700 to 770
    # Redact without touching background images/watermarks:
    name_rect = fitz.Rect(180, 700, 1600, 775)
    page.add_redact_annot(name_rect, fill=False)

    # Class & Position values:
    # "Class: " is at 186. The value starts at 273.45 to 1600
    class_rect = fitz.Rect(270, 815, 1600, 860)
    page.add_redact_annot(class_rect, fill=False)

    # "Position Held: " starts at 186. The value starts at 385 to 1600
    pos_rect = fitz.Rect(385, 860, 1600, 905)
    page.add_redact_annot(pos_rect, fill=False)

    # "Dear Chirag," is at y ~1080 to 1130
    dear_rect = fitz.Rect(180, 1080, 700, 1130)
    page.add_redact_annot(dear_rect, fill=False)

    # "We are pleased to offer you the position of President ..."
    offer_rect = fitz.Rect(180, 1170, 1674, 1260)
    page.add_redact_annot(offer_rect, fill=False)

    # Apply redactions strictly preserving all images
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # Now register fonts
    font_gold = (0.757, 0.588, 0.278) # #c19647
    font_navy = (0.063, 0.275, 0.439) # #104670

    font_path_guerilla = os.path.abspath("data/fonts/ProtestGuerrilla-Regular.ttf")
    font_path_bold = os.path.abspath("data/fonts/Montserrat-Bold.ttf")

    new_name = "Mr. Devendra Sharma"
    new_class = "MCA (Int.) - II"
    new_position = "Vice President"
    first_name = "Devendra"

    # Insert new name:
    page.insert_text(
        fitz.Point(186.0, 753.78),
        new_name,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=53.0,
        color=font_gold
    )

    # Insert new class:
    page.insert_text(
        fitz.Point(273.45, 850.53),
        new_class,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=32.0,
        color=font_navy
    )

    # Insert new position:
    page.insert_text(
        fitz.Point(387.05, 894.78),
        new_position,
        fontname="guerilla",
        fontfile=font_path_guerilla,
        fontsize=32.0,
        color=font_navy
    )

    # Insert Dear [FirstName],
    page.insert_text(
        fitz.Point(186.0, 1116.78),
        f"Dear {first_name},",
        fontname="montserrat_bold",
        fontfile=font_path_bold,
        fontsize=32.0,
        color=(0, 0, 0)
    )

    # Insert Offer paragraph:
    offer_line1 = f"We are pleased to offer you the position of {new_position} in the AI Student Chapter,"
    offer_line2 = "commencing 19 September 2026, with full membership benefits and leadership opportunities."
    page.insert_text(
        fitz.Point(186.0, 1205.28),
        offer_line1,
        fontname="montserrat_bold",
        fontfile=font_path_bold,
        fontsize=32.0,
        color=(0, 0, 0)
    )
    page.insert_text(
        fitz.Point(186.0, 1248.0),
        offer_line2,
        fontname="montserrat_bold",
        fontfile=font_path_bold,
        fontsize=32.0,
        color=(0, 0, 0)
    )

    # Stamp dual verification badge
    import subprocess, json
    cmd = ["node", "-e", "const { generateDualVerificationBadgeSVG } = require('./server/services/qrBarcodeService'); (async () => { const b = await generateDualVerificationBadgeSVG('AISC-2026-HIRE-99999', 'http://10.1.65.29:3000/verify/AISC-2026-HIRE-99999', { width: 420, height: 95 }); console.log(b.svg); })();"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    svg_content = res.stdout.strip()

    svg_doc = fitz.open(stream=svg_content.encode("utf-8"), filetype="svg")
    barcode_pix = svg_doc[0].get_pixmap(dpi=300)
    barcode_rect = fitz.Rect(1274, 485, 1694, 580)
    page.insert_image(barcode_rect, pixmap=barcode_pix)

    os.makedirs("data/preview", exist_ok=True)
    out_pdf = "data/preview/test_new_hire_devendra.pdf"
    doc.save(out_pdf)
    doc.close()

    # Render PNG preview
    d2 = fitz.open(out_pdf)
    d2[0].get_pixmap(dpi=150).save("data/preview/test_new_hire_devendra.png")
    d2.close()
    print("SUCCESS: Generated data/preview/test_new_hire_devendra.png with badge!")

if __name__ == "__main__":
    test_generate_official_cert()
