# Kalkulator Promo Apple — Google Sheets Live Sync

Versi ini tidak lagi bergantung pada file Excel yang dibenamkan sebagai sumber utama. Website tetap memiliki fallback data, tetapi saat sudah dihubungkan ke Google Apps Script, harga/promo dibaca langsung dari Google Sheet.

## 1. Siapkan Google Sheet
Gunakan spreadsheet dengan tab:
- Price List
- Promo Berjalan
- BNPL
- Provider
- Qoala Protection
- Trade in

Strukturnya mengikuti workbook yang sekarang dipakai kalkulator.

## 2. Buat Google Apps Script
Buka Google Sheet → **Extensions / Ekstensi → Apps Script**.

Buat file `Code.gs` dan ganti seluruh isinya dengan file `Code.gs` dari paket ini.

Pada baris:

`const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';`

ganti dengan ID spreadsheet dari URL Google Sheet Anda.

Contoh URL:
`https://docs.google.com/spreadsheets/d/1AbCdEfGh.../edit`

Maka Spreadsheet ID adalah bagian setelah `/d/` dan sebelum `/edit`.

## 3. Deploy sebagai Web App
Di Apps Script:

**Deploy → New deployment → Web app**

Gunakan:
- Execute as: **Me**
- Who has access: **Anyone** / anonymous

Google mendokumentasikan bahwa web app Apps Script membutuhkan `doGet()` atau `doPost()` dan dapat mengembalikan `TextOutput`; Content Service dapat menyajikan JSON/JavaScript untuk dipakai sebagai layanan data. citehttps://developers.google.com/apps-script/guides/web?hl=en

Salin URL yang berakhiran `/exec`.

## 4. Hubungkan ke kalkulator
Buka kalkulator → **ADMIN** → login dengan:
- User: `MAPTECH`
- Password: `digiceria`

Masukkan URL Web App pada kolom **Google Sheets Web App URL**, lalu tekan **SIMPAN KONEKSI** atau **SYNC SEKARANG**.

URL tersebut disimpan pada browser lokal kalkulator.

## 5. Update harga/promo
Mulai sekarang cukup:

**Google Sheet → ubah harga/promo → Save.**

Kalkulator akan:
- melakukan sync saat login;
- melakukan sync otomatis setiap 2 menit saat sesi aktif;
- tetap menyediakan tombol `Refresh` untuk sync manual.

Jika data Google Sheet berubah, calculator akan mengambil struktur baru dan mempertahankan pilihan user sejauh produk/opsi tersebut masih tersedia.

## 6. Catatan tentang kartu kredit
Daftar tenor kartu kredit pada kalkulator tetap memakai tabel kartu kredit yang ada pada gambar di sheet `Promo Berjalan`, karena gambar floating di Google Sheet tidak ikut terbaca sebagai cell values. Jika daftar kartu/tenor pada gambar berubah, update matrix kartu di `Code.gs`.

## 7. Mengapa versi lama tidak berubah?
Versi HTML sebelumnya menyimpan seluruh master data di dalam HTML sebagai JSON fallback. Karena itu mengubah Google Sheet tidak otomatis mengubah harga di halaman.
Versi baru memakai Google Apps Script sebagai endpoint yang membaca spreadsheet secara langsung. Google Sheets API/Apps Script mendukung pembacaan nilai spreadsheet dan Content Service dapat menyajikan JSON/JavaScript untuk layanan web. citehttps://developers.google.com/workspace/sheets/api/guides/values
