# Dispatch: a CV builder

A self-contained, installable web app (PWA) for building a CV and exporting
it as a PDF or a real Word (.docx) document. No account, no backend, no
data collection by default. Everything you type stays on your device,
except the one bullet's text you explicitly send to Groq if you opt in to
the AI Assist feature with your own API key.

## Running it

This app needs to be **served over HTTP(S)**, not opened directly as a
`file://`. Browsers block service workers (which power offline support and
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
somewhere with real HTTPS: GitHub Pages, Netlify, Vercel, or any static
host all work. Once loaded once over HTTPS, your browser will offer an
"Install" option, and it will keep working without an internet connection
(except AI Assist, which needs a live connection to Groq).

## What's included

| File | Purpose |
|---|---|
| `index.html` | App shell, security headers, loads everything else |
| `styles.css` | All visual styling |
| `app.js` | All application logic (state, editor, preview, export, AI Assist) |
| `manifest.json` | Makes the app installable (name, icons, colors) |
| `sw.js` | Service worker, caches the app for offline use |
| `icons/` | App icons for the home-screen/install icon |

No CV content from any previous conversation is in this code. Every field
starts blank, and all example/hint text is generic.

## Design direction: a correspondence desk, not a dashboard

The redesign leans into the fact that a CV is, at the end of the day, a
piece of paper. The app chrome (editor, toolbar, pill) is a warm, light
"paper and coffee" workspace, rounded corners throughout, so the one thing
that has to stay print-true, the white resume page itself, still reads as
an actual sheet of paper resting on the desk rather than just another
panel in a row of identical cards. The small input fields in the editor
are styled as pale index cards sitting on that desk, a smaller echo of the
same idea. A warm coffee-brown ("brass" in the code, a holdover name from
an earlier direction) is the one accent color that means "action" (Export,
the active pill state). A separate muted red ("stamp") is reserved for
anything AI-related, so the two never get confused.

Chrome typography is Georgia for headings (a real, characterful serif
that's installed everywhere, unlike a webfont) and the system UI font for
dense interface text. This app deliberately does not load Google Fonts or
any other webfont: doing so would mean a request to a third party on every
single page load just to render text, which conflicts with the "nothing
leaves your device by default" promise more than the opt-in Groq calls do.
The resume document itself keeps its existing, separate font picker
(Calibri/Arial/Georgia/Times New Roman), unrelated to the app chrome.

### The Dispatch mascot

A small folded-paper-plane mascot ties the "send your CV out" idea
together:
- **Idle**: sits still (a slow, subtle bob), in the desktop toolbar and
  riding inside the mobile pill.
- **Thinking**: flutters while an AI Assist request is in flight.
- **Flying**: unfolds and flies off on export (PDF or Word), the one
  moment worth spending real animation on, since "downloading your
  finished CV" is this app's actual payoff moment.

All three states respect `prefers-reduced-motion` and turn off entirely
for anyone with that setting enabled.

### Mobile navigation: why a pill instead of a hidden menu

An earlier design pass planned a tap-to-reveal radial menu (tap the pill,
icons fan out). That got scrapped after finding out the previous version's
Edit/Preview tab bar was hard enough to notice that Preview effectively
didn't exist in practice for at least one real user. Given that, hiding
the controls behind an extra tap felt like the same mistake with better
animation. Instead, Edit and Preview are both always visible as a
segmented pill, Dispatch rides along as a sliding indicator of which one
is active, and everything else (New, Backup, Restore, AI settings, both
exports) lives behind a single "•••" that slides the existing toolbar up
as a bottom sheet, rather than duplicating those buttons in two places.

## Features

**Editing**
- Header (name, tagline, location, phone, email, LinkedIn)
- Summary
- Education entries: degree, institution, dates, bullet points
- Experience entries: title, company, dates, bullet points
- Areas of Knowledge, an optional grouped competency section (category + description)
- Skills: flat list
- Certifications: name + issuing body
- Additional Strengths: flat list
- Every repeatable item (entries, bullets, skills, etc.) can be added, removed,
  and reordered with up/down buttons
- Every section can be hidden entirely with a "Show on CV" toggle, without
  losing the data. Useful for tailoring the same CV to different applications
- A 💡 button on each bullet inserts a generic action-verb template you can
  edit, at no cost and with no network request
- A ✨ button on each bullet sends just that line to Groq (if you've added
  your own API key in AI Assist settings) and replaces it with a polished
  rewrite. See "AI Assist" below
- Every field has short guidance text under it

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
- Download PDF: built as real, selectable/searchable text via jsPDF, not a
  screenshot of the preview, so it stays parseable by ATS/résumé-scanning
  software
- Download Word (.docx): built natively as a real Word document, using the
  same structure/format as the PDF
- Backup: saves your current draft as a `.json` file
- Restore: loads a draft back in from a previously saved `.json` backup
  (asks for confirmation before overwriting your current draft)

**AI Assist (optional, off by default)**
- Paste your own free Groq API key into the AI Assist settings drawer
  (gear icon on desktop, inside the "•••" sheet on mobile)
- Click ✨ next to any bullet point to have Groq rewrite it: stronger
  action verb, tighter phrasing, no invented facts or numbers
- Architecture: your key is stored only in this browser's local storage,
  under its own key, separate from your CV draft, and is never included
  in a Backup `.json` file. Each ✨ click calls Groq's API directly from
  your browser using that key. There is no server in this app holding a
  shared key, which is why each person needs their own (see Security
  notes for the tradeoff this implies)
- If AI Assist fails with a rate-limit message, that's Groq's free-tier
  limit, not a bug. Wait a bit and try again

**Persistence**
- Autosaves to your browser's local storage as you type (nothing leaves
  your device, except an AI Assist request if you use one)
- "New" clears the current draft after confirmation
- Removing an entry (education, experience, knowledge, certification) with
  content in it asks for confirmation first; empty entries delete instantly
- Since autosave only lives in this one browser's storage, use Backup/Restore
  to move a draft between devices or recover it if site data gets cleared

## Security notes

- 100% client-side by default. There is no server component. Nothing you
  type is transmitted anywhere unless you explicitly use AI Assist.
- Network requests this app makes: the two export libraries (`jsPDF` from
  cdnjs, `docx.js` from unpkg) the first time you use export, cached
  offline afterward; and, only if you click ✨, one request per click to
  `api.groq.com` carrying that single bullet's text plus your own API key.
- `index.html` sets a Content-Security-Policy restricting scripts to this
  app's own origin plus those two named CDNs, and network connections
  (`connect-src`) to this app's origin plus Groq's API. No inline scripts,
  no `eval`, no other third-party origins.
- **On the bring-your-own-key design**: your Groq key sits in this
  browser's local storage and is attached to every AI Assist request from
  this browser. That's fine for a personal key on your own device, since
  it's the same trust boundary as any other password saved in a browser.
  If you ever hand this app to someone else to use, each person needs
  their own key; the key is never bundled with the app or shared, and
  never leaves this browser except in the `Authorization` header sent
  directly to Groq.
- All user-entered text is inserted into the page as plain text (never
  `innerHTML`), which avoids script-injection risk from anything you type
  or paste into the form.
- Your draft lives only in this browser's local storage on this device.
  Clearing browser data or using a different browser/device will not carry
  it over unless you've saved a Backup file.

## Known limitations / things to check before you rely on it

- **This round's changes**: reverted the app icon back to the original
  navy-background/white-"CV" design (regenerated from scratch - I don't
  have a stored copy of the original file, so this is a recreation, close
  but not guaranteed pixel-identical to the very first version). Re-themed
  the whole app chrome from the dark-ink palette to a light, warm,
  rounded-corner "paper and coffee" look (all via the existing CSS
  variable tokens, so this was a values-only change, not a rewrite of
  every rule). Fixed a real button-sizing bug: the AI Assist gear icon in
  the desktop topbar had no explicit height, so it rendered visibly
  shorter than the New/Backup/Restore/PDF/Word buttons beside it (an
  auto-height icon button next to fixed-padding text buttons) - all
  topbar buttons now share an explicit height.
- **I still could not test this in an actual browser.** This sandbox has
  no browser and no network access to the CDNs or to Groq's API. I
  verified the docx@8.5.0 and jsPDF 2.5.1 URLs and their exported globals
  against their published package contents, syntax-checked the JS,
  cross-checked every element ID the JS looks up against the actual HTML,
  and balance-checked braces/tags across all files, but I have not seen
  any of this render, animate, or export live. Please click through
  Edit/Preview switching, both exports, Backup/Restore, and AI Assist (if
  you add a key) before relying on any of it.
- **Reported broken on real devices after the last round, and now fixed**:
  on an actual Android phone, the Preview page rendered outside the
  viewport (needed horizontal scrolling), and the desktop layout looked
  cramped/broken in a non-maximized browser window. Root causes, confirmed
  by reading the code rather than guessed at:
  - The mobile scaling used JS that measured an element's `.clientWidth`.
    That returns `0` whenever the element's ancestor is `display:none`,
    which was true for the preview pane on every keystroke made while the
    Edit tab was showing (most of the time), producing a garbage near-zero
    scale value that could persist until the next explicit recompute.
    Replaced with a version that reads `window.innerWidth` instead (always
    valid, regardless of what's hidden) and uses CSS `zoom` instead of
    `transform` (zoom actually resizes the layout box, so no separate
    wrapper-height workaround is needed either).
  - I first tried to fix that same bug with a pure-CSS `zoom: calc(100vw /
    816)`, specifically to remove JS from the picture entirely - but CSS
    `calc()` division requires the right-hand side to be a plain unitless
    number, and dividing two lengths never produces one, so that
    expression is actually invalid and gets silently dropped, doing
    nothing. Caught this by checking the CSS math spec before shipping it
    instead of assuming it would work, and used the JS version above
    instead.
  - The desktop toolbar had no `flex-wrap` anywhere and no
    `flex-shrink: 0`/`white-space: nowrap` protection on its buttons, so
    any window narrower than roughly 850px (an unmaximized browser window,
    a 1366×768 laptop, Windows' own split-screen snapping) forced buttons
    to either wrap their text mid-word or visually squish. Fixed with a
    proper wrap fallback (extra rows instead of squishing) and shortened
    the two busiest button labels ("Download PDF"/"Download Word" →
    "PDF"/"Word", full description still in the tooltip).
- The pill-thumb slide, the settings drawer, and the bottom sheet are all
  CSS transitions I still could not visually preview. The mechanics are
  sound on paper (literal CSS class toggles with matching selectors,
  confirmed by reading the rules back), but exact timing/easing may need a
  real-device pass to feel right.
- PDF and Word use jsPDF/docx's built-in font set, not the actual Calibri/
  Georgia files. Calibri and Arial both render as Helvetica, Georgia and
  Times New Roman both render as Times. The live on-screen preview does
  use the real fonts if your OS has them installed, so the preview and the
  exported files won't match exactly font-for-font.
- No multi-resume library yet. It's a single draft at a time. Use Backup
  to save named copies (e.g. one per employer) outside the app if you need
  several versions; say so if you want a proper in-app named-drafts list.
- Drag-and-drop reordering isn't implemented. Reordering uses up/down
  buttons instead, which is more reliable across devices (including touch)
  and fully keyboard-accessible.
- AI Assist only covers bullet rewriting for now (deliberately, as a
  first standalone feature to try the pattern). Summary generation,
  tagline generation, and job-description tailoring were discussed as
  natural next additions but aren't built yet.
