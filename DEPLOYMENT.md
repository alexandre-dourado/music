# 🎵 Ouça Agora — Private Music Feedback Platform
## Complete Deployment Guide

---

## Overview of Files

| File | Purpose |
|------|---------|
| `Code.gs` | Apps Script backend (API + data) |
| `index.html` | Main HTML template (GAS entry point) |
| `styles.html` | All CSS (included via `<?!= include() ?>`) |
| `app.html` | All frontend JS (included via `<?!= include() ?>`) |

---

## Step 1 — Create the Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Name it **"Ouça Agora — DB"** (or anything you like).
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/  ← THIS PART →  /edit
   ```
4. Paste this ID into `Code.gs` → `CONFIG.SPREADSHEET_ID`.

> **Important:** Do NOT create the sheets manually. The `setupSheets()` function will create them for you.

---

## Step 2 — Create Google Drive Folders

1. Go to [drive.google.com](https://drive.google.com).
2. Create three folders:
   - `/audios` — for MP3/WAV audio files
   - `/letras` — for `.txt` lyrics files
   - `/capas` — for cover images (JPG/PNG)

3. For each folder, open it and copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/ ← THIS PART →
   ```

4. Paste them into `Code.gs`:
   ```javascript
   DRIVE_FOLDER_AUDIOS: 'your_audios_folder_id',
   DRIVE_FOLDER_LETRAS: 'your_letras_folder_id',
   DRIVE_FOLDER_CAPAS:  'your_capas_folder_id',
   ```

---

## Step 3 — Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com).
2. Click **New project**.
3. Name it **"Ouça Agora"**.

### Add the files:

**Code.gs** (already exists by default):
- Replace the default content with the content of `Code.gs`.

**Create `index.html`:**
- Click **+** → **HTML** → name it `index`
- Paste the content of `index.html`.

**Create `styles.html`:**
- Click **+** → **HTML** → name it `styles`
- Paste the content of `styles.html`.

**Create `app.html`:**
- Click **+** → **HTML** → name it `app`
- Paste the content of `app.html`.

> ⚠️ File names in Apps Script must match **exactly**: `index`, `styles`, `app` (no extension needed in the IDE, but the actual names must match the `include()` calls).

---

## Step 4 — Run Initial Setup

1. In the Apps Script editor, select `setupSheets` from the function dropdown.
2. Click **Run** ▶.
3. Grant permissions when prompted (the script needs access to your Spreadsheet and Drive).
4. Check your Spreadsheet — you should see two sheets: `musicas` and `feedback`.

---

## Step 5 — Deploy as Web App

1. Click **Deploy** → **New deployment**.
2. Click the gear icon ⚙ next to "Select type" → choose **Web app**.
3. Configure:
   - **Description:** `Ouça Agora v1`
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Anyone` (so your friends can access it)
     - Or `Anyone with Google Account` for extra security
4. Click **Deploy**.
5. Copy the **Web App URL** — this is your platform's URL!

> 📌 After any code changes, click **Deploy** → **Manage deployments** → **Edit** → bump the version.

---

## Step 6 — Add Songs to the Spreadsheet

Each row in the `musicas` sheet represents one song:

| Column | Description | Example |
|--------|-------------|---------|
| `id` | Unique ID (any string) | `001`, `canção-1` |
| `titulo` | Song title | `Minha Canção` |
| `audio_id` | Google Drive File ID of the MP3 | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms` |
| `letra_id` | Drive File ID of the .txt lyrics | `1abc...xyz` |
| `capa_id` | Drive File ID of the cover image | `1abc...xyz` (optional) |
| `notas_autor` | Artist's context note | `Esta música foi escrita em...` |
| `publicar` | `TRUE` to show, `FALSE` to hide | `TRUE` |
| `ordem` | Display order (1, 2, 3...) | `1` |
| `data_publicacao` | Publication date | `2025-01-15` |

### How to get a File ID from Drive:

1. Right-click the file in Drive → **Get link**.
2. Or open the file and copy from the URL:
   ```
   https://drive.google.com/file/d/ ← FILE ID → /view
   ```

### Make Drive files accessible:

For each audio, lyrics, and cover file:
1. Right-click → **Share** → **Change to anyone with the link** → Viewer.

---

## Step 7 — Share the Platform

Share the **Web App URL** with your friends! That's it.

---

## Cache Management

The platform caches data for **5 minutes** using `CacheService`.

To force-refresh the cache (after updating the spreadsheet):
- Simply wait 5 minutes, OR
- Call `CacheService.getScriptCache().removeAll()` from the Apps Script editor.

---

## Viewing Feedback (Artist Only)

All feedback is stored in the `feedback` sheet. You can see:
- All ratings
- All reactions
- All **private comments** (these are NEVER shown to listeners)

The sheet columns are: `timestamp`, `musica_id`, `nota`, `reacao`, `comentario`, `user_hash`.

---

## Security Notes

- Comments are **stored only in the spreadsheet** — never returned to the frontend.
- All writes go through `submitFeedback()` which validates and sanitizes input.
- HTML is stripped from comments server-side.
- Comments are limited to 1000 characters.
- The `sanitizeMusica()` function ensures sensitive fields never reach the client.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |

---

## Troubleshooting

**"Sem músicas publicadas"** — Check that:
- At least one row has `publicar = TRUE`
- The `SPREADSHEET_ID` in `Code.gs` is correct

**Audio not playing** — Check that:
- The Drive file is shared as "Anyone with the link"
- The `audio_id` in the sheet is the correct File ID

**Lyrics not loading** — Same as above, check sharing settings on the `.txt` file.

**Cover not showing** — Check that the image file is shared and the `capa_id` is correct.

---

## Updating the Code

After any changes to `.gs` or `.html` files:
1. **Deploy** → **Manage deployments**
2. Click ✏️ Edit on your current deployment
3. Change **Version** to **New version**
4. Click **Deploy**

---

## Progressive Web App (PWA)

The app installs automatically on mobile browsers.

On iOS: Safari → Share → "Add to Home Screen"  
On Android: Chrome → Menu → "Add to Home Screen" or "Install App"

---

## Folder Structure Summary

```
Google Drive:
├── audios/
│   ├── musica-01.mp3
│   └── musica-02.wav
├── letras/
│   ├── musica-01.txt
│   └── musica-02.txt
└── capas/
    ├── musica-01.jpg
    └── musica-02.jpg

Google Spreadsheet:
├── musicas (sheet)
└── feedback (sheet)

Apps Script Project:
├── Code.gs
├── index.html
├── styles.html
└── app.html
```
