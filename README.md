# CV Builder

A self-contained, installable web app (PWA) for building a CV and exporting
it as a PDF or a real Word (.docx) document. No account, no backend, no
data collection — everything you type stays on your device.

## Running it

This app needs to be **served over HTTP(S)**, not opened directly as a
`file://` — browsers block service workers (which power offline support and
installability) on the `file://` protocol.

**Easiest local option** (needs Python, which most systems already have):
```
cd cvapp
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

**Alternative** (needs Node.js):
```
npx serve cvapp
```

**To actually install it as an app / use it offline**, host these files
somewhere with real HTTPS — GitHub Pages, Netlify, Vercel, or any static
host all work. Once loaded once over HTTPS, your browser will offer an
"Install" option, and it will keep working without an internet connection.

## What's included

| File | Purpose |
|---|---|
| `index.html` | App shell, security headers, loads everything else |
| `styles.css` | All visual styling |
| `app.js` | All application logic (state, editor, preview, export) |
| `manifest.json` | Makes the app installable (name, icons, colors) |
| `sw.js` | Service worker — caches the app for offline use |
| `icons/` | App icons for the home-screen/install icon |

No CV content from any previous conversation is in this code — every
field starts blank, and all example/hint text is generic.

## Features

**Editing**
- Header (name, tagline, location, phone, email, LinkedIn)
- Summary
- Education entries — degree, institution, dates, bullet points
- Experience entries — title, company, dates, bullet points
- Areas of Knowledge — optional grouped competency section (category + description)
- Skills — flat list
- Certifications — name + issuing body
- Additional Strengths — flat list
- Every repeatable item (entries, bullets, skills, etc.) can be added, removed,
  and reordered with ↑/↓ buttons
- Every section can be hidden entirely with a "Show on CV" toggle, without
  losing the data — useful for tailoring the same CV to different applications
- A 💡 button on each bullet inserts a generic action-verb template you can
  edit, and every field has short guidance text under it

**Preview & styling**
- Live paper preview that updates as you type, with a dashed line marking
  where content spills onto the next page
- On phones, the preview scales down to fit the screen instead of requiring
  horizontal scrolling
- Font choice: Calibri, Arial, Georgia, Times New Roman (PDF/DOCX approximate
  these with the closest built-in font, see Known limitations)
- Text size: Compact / Normal / Large
- Accent color swatches, or plain black-and-white
- A rough page-count estimate in the top bar

**Export**
- Download PDF — built as real, selectable/searchable text via jsPDF, not a
  screenshot of the preview, so it stays parseable by ATS/résumé-scanning
  software
- Download Word (.docx) — built natively as a real Word document, using the
  same structure/format as the PDF
- Backup — saves your current draft as a `.json` file
- Restore — loads a draft back in from a previously saved `.json` backup
  (asks for confirmation before overwriting your current draft)

**Persistence**
- Autosaves to your browser's local storage as you type (nothing leaves
  your device)
- "New" clears the current draft after confirmation
- Removing an entry (education, experience, knowledge, certification) with
  content in it asks for confirmation first; empty entries delete instantly
- Since autosave only lives in this one browser's storage, use Backup/Restore
  to move a draft between devices or recover it if site data gets cleared

## Security notes

- 100% client-side. There is no server component; nothing you type is
  transmitted anywhere.
- The only network requests are to load two export libraries
  (`jsPDF` from cdnjs, `docx.js` from unpkg) the first time you use
  export — after that, the service worker caches them for offline use.
- `index.html` sets a Content-Security-Policy that only allows scripts from
  this app's own origin plus those two named CDNs — no inline scripts, no
  `eval`, no other third-party origins.
- All user-entered text is inserted into the page as plain text (never
  `innerHTML`), which avoids script-injection risk from anything you type
  or paste into the form.
- Your draft lives only in this browser's local storage on this device —
  clearing browser data or using a different browser/device will not carry
  it over unless you've saved a Backup file.

## Known limitations / things to check before you rely on it

- **I still could not test this in an actual browser** — this sandbox has
  no browser and no network access to the CDNs the app depends on. I
  verified the docx@8.5.0 and jsPDF 2.5.1 URLs and their exported globals
  against their published package contents, and syntax-checked the JS, but
  I have not seen it render or exported files live. The Word export URL was
  previously wrong (pointed at a file that doesn't exist in that package
  version) - fixed now, but please click through PDF, Word, Backup, and
  Restore once before relying on any of them.
- PDF and Word use jsPDF/docx's built-in font set, not the actual Calibri/
  Georgia files - Calibri and Arial both render as Helvetica, Georgia and
  Times New Roman both render as Times. The live on-screen preview does use
  the real fonts if your OS has them installed, so the preview and the
  exported files won't match exactly font-for-font.
- No multi-resume library yet — it's a single draft at a time. Use Backup
  to save named copies (e.g. one per employer) outside the app if you need
  several versions; say so if you want a proper in-app named-drafts list.
- Drag-and-drop reordering isn't implemented — reordering uses ↑/↓ buttons
  instead, which is more reliable across devices (including touch) and
  fully keyboard-accessible.
