import json
import os

def load_data():
    json_path = "public/data.json" if os.path.exists("public/data.json") else "data.json"
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"File {json_path} tidak ditemukan!")
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

def build():
    print("Membaca data dari data.json...")
    data = load_data()
    print(f"Berhasil memuat {len(data)} data promo.")

    import calculator_promo_server
    
    # Ambil hasil render HTML dari server
    html_content = None
    if hasattr(calculator_promo_server, "render_index"):
        html_content = calculator_promo_server.render_index(data)
    elif hasattr(calculator_promo_server, "generate_html"):
        html_content = calculator_promo_server.generate_html(data)

    # Jika server menghasilkan string HTML, tulis langsung ke file root & public
    if html_content:
        os.makedirs("public", exist_ok=True)
        
        # Tulis ke root index.html
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html_content)
            
        # Tulis ke public/index.html
        with open("public/index.html", "w", encoding="utf-8") as f:
            f.write(html_content)
            
        print("File index.html & public/index.html berhasil ditulis ulang!")
    else:
        print("Peringatan: Tidak ada konten HTML yang dihasilkan dari server.")

if __name__ == "__main__":
    build()
