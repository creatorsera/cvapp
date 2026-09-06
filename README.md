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
- Live paper preview that updates as you type — what you see is what exports
- Font choice: Calibri, Arial, Georgia, Times New Roman
- Text size: Compact / Normal / Large
- Accent color swatches, or plain black-and-white
- A rough page-count estimate in the top bar

**Export**
- Download PDF — renders the exact preview you see
- Download Word (.docx) — built natively as a real Word document (not a
  PDF-in-disguise), using the same structure/format as the preview

**Persistence**
- Autosaves to your browser's local storage as you type (nothing leaves
  your device)
- "New" clears the current draft after confirmation

## Security notes

- 100% client-side. There is no server component; nothing you type is
  transmitted anywhere.
- The only network requests are to load two export libraries
  (`html2pdf.js` from cdnjs, `docx.js` from unpkg) the first time you use
  export — after that, the service worker caches them for offline use.
- `index.html` sets a Content-Security-Policy that only allows scripts from
  this app's own origin plus those two named CDNs — no inline scripts, no
  `eval`, no other third-party origins.
- All user-entered text is inserted into the page as plain text (never
  `innerHTML`), which avoids script-injection risk from anything you type
  or paste into the form.
- Your draft lives only in this browser's local storage on this device —
  clearing browser data or using a different browser/device will not carry
  it over.

## Known limitations / things to check before you rely on it

- **I could not test this in an actual browser** — this sandbox has no
  browser and no network access, so I verified the JavaScript/JSON are
  syntactically valid and reviewed the logic carefully, but I haven't seen
  it render live. Please open it and click through everything before
  trusting it for a real application, and tell me if anything breaks.
- The exact CDN URLs/version numbers for `html2pdf.js` and `docx.js` are
  pinned to versions I know to be correct as of my knowledge, but CDNs
  occasionally restructure — if either export button says the library
  "hasn't finished loading" even with a good connection, check the browser
  console for a 404 and let me know so I can fix the URL.
- No multi-resume library yet — it's a single draft at a time. If you want
  to keep several versions (e.g., one per employer), say so and I'll add a
  named-drafts list.
- Drag-and-drop reordering isn't implemented — reordering uses ↑/↓ buttons
  instead, which is more reliable across devices (including touch) and
  fully keyboard-accessible.
