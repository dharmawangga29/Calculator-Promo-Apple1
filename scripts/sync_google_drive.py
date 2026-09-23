import os
import json
import csv
import urllib.request

# Mengambil URL Google Sheet dari Secret/Environment Variable
SHEET_URL = os.environ.get("GOOGLE_SHEET_URL")

if not SHEET_URL:
    raise ValueError("Missing required environment variable: GOOGLE_SHEET_URL")

# Mengubah link edit/view standar menjadi link export CSV otomatis jika diperlukan
if "/edit" in SHEET_URL or "/view" in SHEET_URL:
    sheet_id = SHEET_URL.split("/d/")[1].split("/")[0]
    SHEET_URL = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv"

print(f"Fetching data from Google Sheet...")

try:
    req = urllib.request.Request(
        SHEET_URL, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    
    with urllib.request.urlopen(req) as response:
        csv_text = response.read().decode('utf-8').splitlines()

    reader = csv.DictReader(csv_text)
    data = [row for row in reader]

    os.makedirs("public", exist_ok=True)

    with open("public/data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Data successfully synced to public/data.json and data.json")

except Exception as e:
    print(f"Error fetching Google Sheet data: {e}")
    exit(1)
