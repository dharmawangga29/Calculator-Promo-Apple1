import os
import re
import json
import csv
import requests
from io import StringIO

DATA_PATH = "data.json"

def get_csv_export_url(sheet_url):
    """
    Mengonversi URL Google Sheet umum atau URL 'Publish to Web' 
    menjadi URL download CSV langsung.
    """
    # Jika sudah merupakan URL export CSV
    if "export?format=csv" in sheet_url or "pub?output=csv" in sheet_url:
        return sheet_url

    # Ekstrak Spreadsheet ID dari link standar Google Sheets
    match = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
    if match:
        spreadsheet_id = match.group(1)
        # Ambil gid jika ada (spesifik sheet/tab tertentu)
        gid_match = re.search(r"gid=([0-9]+)", sheet_url)
        gid_param = f"&gid={gid_match.group(1)}" if gid_match else ""
        return f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv{gid_param}"
    
    return sheet_url

def fetch_data_from_google_sheets():
    sheet_url = os.getenv("GOOGLE_SHEET_URL")
    
    if not sheet_url:
        print("⚠️ Secret 'GOOGLE_SHEET_URL' tidak ditemukan di Environment Variables.")
        return

    csv_url = get_csv_export_url(sheet_url)
    print(f"📥 Mengambil data dari Google Sheet CSV URL...")

    try:
        response = requests.get(csv_url, timeout=15)
        response.raise_for_status()
        response.encoding = 'utf-8'

        # Membaca isi CSV dan mengonversi ke list of dicts (JSON)
        csv_file = StringIO(response.text)
        reader = csv.DictReader(csv_file)
        data_list = [row for row in reader]

        # Simpan ke data.json
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(data_list, f, ensure_ascii=False, indent=2)

        print(f"✅ Berhasil memperbarui {DATA_PATH} dengan {len(data_list)} baris data.")

    except Exception as e:
        print(f"❌ Gagal mengambil data dari Google Sheet: {e}")

if __name__ == "__main__":
    fetch_data_from_google_sheets()
