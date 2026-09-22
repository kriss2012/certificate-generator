import fitz
import json
import os
import hashlib

def main():
    jobs_file = "data/stamping_jobs.json"
    if not os.path.exists(jobs_file):
        print(f"Error: {jobs_file} not found!")
        return

    with open(jobs_file, "r", encoding="utf-8") as f:
        jobs = json.load(f)

    print("================================================================")
    print(f"STAMPING {len(jobs)} CERTIFICATES WITH CODE 128 BARCODE & CERT NO")
    print("================================================================")

    results = []

    for idx, job in enumerate(jobs, 1):
        input_pdf = job["input_pdf"]
        output_pdf = job["output_pdf"]
        public_pdf = job["public_pdf"]
        svg_content = job["barcode_svg"]
        rect_coords = job["barcode_rect"]
        cert_number = job["cert_number"]

        os.makedirs(os.path.dirname(output_pdf), exist_ok=True)
        os.makedirs(os.path.dirname(public_pdf), exist_ok=True)

        # 1. Open original PDF
        doc = fitz.open(input_pdf)
        page = doc[0]

        # 2. Render SVG barcode to 300 DPI high-definition pixmap
        svg_doc = fitz.open(stream=svg_content.encode("utf-8"), filetype="svg")
        barcode_pix = svg_doc[0].get_pixmap(dpi=300)

        # 3. Position barcode at official coordinates
        # Rect format: (x0, y0, x1, y1)
        barcode_rect = fitz.Rect(rect_coords[0], rect_coords[1], rect_coords[2], rect_coords[3])
        page.insert_image(barcode_rect, pixmap=barcode_pix)

        # 4. Save to both storage locations
        doc.save(output_pdf)
        doc.save(public_pdf)

        # Generate and save high-resolution preview PNGs
        output_png = output_pdf.replace(".pdf", ".png")
        public_png = public_pdf.replace(".pdf", ".png")
        page.get_pixmap(dpi=150).save(output_png)
        page.get_pixmap(dpi=150).save(public_png)

        doc.close()

        # 5. Compute SHA-256 of generated PDF
        hasher = hashlib.sha256()
        with open(output_pdf, "rb") as pdf_file:
            while chunk := pdf_file.read(8192):
                hasher.update(chunk)
        pdf_hash = hasher.hexdigest()

        results.append({
            "id": job["id"],
            "cert_number": cert_number,
            "recipient_name": job["recipient_name"],
            "output_pdf": output_pdf,
            "public_pdf": public_pdf,
            "pdf_hash": pdf_hash,
            "status": "stamped_successfully"
        })

        print(f"[{idx:02d}/{len(jobs)}] Stamped {cert_number} -> {os.path.basename(output_pdf)}")

    results_file = "data/stamping_results.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("================================================================")
    print(f"SUCCESS: All {len(results)} certificates stamped and hashed!")
    print(f"Results saved to {results_file}")
    print("================================================================")

if __name__ == "__main__":
    main()
