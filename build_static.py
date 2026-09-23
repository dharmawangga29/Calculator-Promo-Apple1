import json
import os
import calculator_promo_server

# Fungsi untuk membaca data dari data.json (hasil sync Google Sheet)
def load_data_from_json():
    json_path = "public/data.json" if os.path.exists("public/data.json") else "data.json"
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"File {json_path} tidak ditemukan!")
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

# Timpa fungsi load_data bawaan server agar tidak lagi mencari file Calculator Promo.xlsx
calculator_promo_server.load_data = load_data_from_json

def main():
    print("Membaca data dari data.json...")
    data = load_data_from_json()
    print(f"Berhasil memuat {len(data)} data promo.")

    # Jalankan proses render HTML dari calculator_promo_server
    if hasattr(calculator_promo_server, "generate_html"):
        calculator_promo_server.generate_html(data)
    elif hasattr(calculator_promo_server, "build_static"):
        calculator_promo_server.build_static(data)
    elif hasattr(calculator_promo_server, "render_index"):
        html_content = calculator_promo_server.render_index(data)
        os.makedirs("public", exist_ok=True)
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        with open("public/index.html", "w", encoding="utf-8") as f:
            f.write(html_content)

    print("Rebuild HTML selesai tanpa error!")

if __name__ == "__main__":
    main()
