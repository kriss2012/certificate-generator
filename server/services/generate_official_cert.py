import sys
import os
import json
import fitz

def generate_official_certificate(params):
    template_type = params.get("template_type", "hiring").lower()
    recipient_name = params.get("recipient_name", "").strip()
    position = params.get("position", "Member").strip()
    class_info = params.get("class_info", "MCA (Int.) - III").strip()
    tenure = params.get("tenure", "AY 2026-27").strip()
    date_str = params.get("date", "19 September 2026").strip()
    cert_number = params.get("cert_number", "AISC-2026-HIRE-00000").strip()
    svg_content = params.get("badge_svg", "").strip()
    output_pdf = params.get("output_pdf", "").strip()
    output_png = params.get("output_png", "").strip()

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    font_path_guerilla = os.path.join(project_root, "data/fonts/ProtestGuerrilla-Regular.ttf")
    font_path_bold = os.path.join(project_root, "data/fonts/Montserrat-Bold.ttf")

    font_gold = (0.757, 0.588, 0.278) # #c19647
    font_navy = (0.063, 0.275, 0.439) # #104670

    if "grad" in template_type or "appreciation" in template_type:
        # Graduating Members Template
        template_pdf = os.path.join(project_root, "Graduating Members 2026/aastha-deshmukh-appreciation-letter-aisc-2026.pdf")
        doc = fitz.open(template_pdf)
        page = doc[0]

        # Redact existing dynamic fields preserving all graphics & watermarks
        page.add_redact_annot(fitz.Rect(180, 890, 1600, 965), fill=False)  # Name
        page.add_redact_annot(fitz.Rect(270, 1005, 1600, 1050), fill=False) # Class
        page.add_redact_annot(fitz.Rect(400, 1050, 1600, 1095), fill=False) # Position
        page.add_redact_annot(fitz.Rect(490, 1095, 1600, 1140), fill=False) # Tenure
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

        # Insert Recipient Name
        page.insert_text(
            fitz.Point(186.0, 943.63),
            recipient_name,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=53.0,
            color=font_gold
        )
        # Insert Class
        page.insert_text(
            fitz.Point(273.45, 1039.63),
            class_info,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=32.0,
            color=font_navy
        )
        # Insert Position
        page.insert_text(
            fitz.Point(405.0, 1083.88),
            position,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=32.0,
            color=font_navy
        )
        # Insert Tenure
        page.insert_text(
            fitz.Point(495.0, 1128.13),
            tenure,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=32.0,
            color=font_navy
        )
        # Badge rect
        badge_rect = fitz.Rect(1254, 670, 1674, 765)

    else:
        # Hiring / Membership Template
        template_pdf = os.path.join(project_root, "Hiring AY 2026-27/president-membership-letter-aisc-2026.pdf")
        doc = fitz.open(template_pdf)
        page = doc[0]

        # Redact existing dynamic fields
        page.add_redact_annot(fitz.Rect(180, 700, 1600, 775), fill=False)   # Name
        page.add_redact_annot(fitz.Rect(270, 815, 1600, 860), fill=False)   # Class
        page.add_redact_annot(fitz.Rect(385, 860, 1600, 905), fill=False)   # Position
        page.add_redact_annot(fitz.Rect(180, 1080, 700, 1130), fill=False)  # Dear Name
        page.add_redact_annot(fitz.Rect(180, 1170, 1674, 1260), fill=False) # Offer position paragraph
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

        # Extract first name
        first_name = recipient_name.replace("Mr. ", "").replace("Ms. ", "").replace("Dr. ", "").split()[0] if recipient_name else "Member"

        # Insert Recipient Name
        page.insert_text(
            fitz.Point(186.0, 753.78),
            recipient_name,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=53.0,
            color=font_gold
        )
        # Insert Class
        page.insert_text(
            fitz.Point(273.45, 850.53),
            class_info,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=32.0,
            color=font_navy
        )
        # Insert Position
        page.insert_text(
            fitz.Point(387.05, 894.78),
            position,
            fontname="guerilla",
            fontfile=font_path_guerilla,
            fontsize=32.0,
            color=font_navy
        )
        # Insert Salutation
        page.insert_text(
            fitz.Point(186.0, 1116.78),
            f"Dear {first_name},",
            fontname="montserrat_bold",
            fontfile=font_path_bold,
            fontsize=32.0,
            color=(0, 0, 0)
        )
        # Insert Offer Lines
        offer_line1 = f"We are pleased to offer you the position of {position} in the AI Student Chapter,"
        offer_line2 = f"commencing {date_str}, with full membership benefits and leadership opportunities."
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
        # Badge rect
        badge_rect = fitz.Rect(1274, 485, 1694, 580)

    # Stamp dual verification badge if SVG content is provided
    if svg_content:
        svg_doc = fitz.open(stream=svg_content.encode("utf-8"), filetype="svg")
        barcode_pix = svg_doc[0].get_pixmap(dpi=300)
        page.insert_image(badge_rect, pixmap=barcode_pix)

    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)
    doc.save(output_pdf)
    doc.close()

    # Generate preview PNG
    if output_png:
        os.makedirs(os.path.dirname(output_png), exist_ok=True)
        doc_view = fitz.open(output_pdf)
        doc_view[0].get_pixmap(dpi=150).save(output_png)
        doc_view.close()

    return {"success": True, "output_pdf": output_pdf, "output_png": output_png}

if __name__ == "__main__":
    raw_input = sys.stdin.read()
    params = json.loads(raw_input)
    result = generate_official_certificate(params)
    print(json.dumps(result))
