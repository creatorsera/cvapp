"use strict";

/* =========================================================================
   STATE
   ========================================================================= */

const STORAGE_KEY = "cvbuilder.draft.v1";

let uidCounter = 1;
function uid() { return "id" + (uidCounter++) + "_" + Math.random().toString(36).slice(2, 8); }

function defaultState() {
  return {
    header: {
      name: "",
      tagline: "",
      location: "",
      phone: "",
      email: "",
      linkedin: ""
    },
    summary: "",
    sections: {
      education: {
        visible: true,
        items: [emptyEducation()]
      },
      experience: {
        visible: true,
        items: [emptyExperience()]
      },
      knowledge: {
        visible: false,
        items: []
      },
      skills: {
        visible: true,
        items: []
      },
      certifications: {
        visible: true,
        items: []
      },
      strengths: {
        visible: true,
        items: []
      }
    },
    style: {
      font: "calibri",
      fontSize: "normal",
      accent: "none" // "none" or a hex color
    }
  };
}

function emptyEducation() {
  return { id: uid(), degree: "", institution: "", dates: "", bullets: [""] };
}
function emptyExperience() {
  return { id: uid(), title: "", company: "", dates: "", bullets: [""] };
}
function emptyKnowledge() {
  return { id: uid(), category: "", description: "" };
}
function emptyCert() {
  return { id: uid(), name: "", issuer: "" };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // shallow-merge to survive schema additions between versions
    const base = defaultState();
    return Object.assign(base, parsed, {
      header: Object.assign(base.header, parsed.header),
      sections: Object.assign(base.sections, parsed.sections),
      style: Object.assign(base.style, parsed.style)
    });
  } catch (e) {
    console.warn("Could not load saved draft, starting fresh.", e);
    return defaultState();
  }
}

let saveTimer = null;
function scheduleSave() {
  setStatus("Saving\u2026");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStatus("Saved to this device \u00b7 " + new Date().toLocaleTimeString());
    } catch (e) {
      setStatus("Could not save (storage may be full or disabled)");
    }
  }, 300);
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

/* =========================================================================
   DOM HELPERS  (no innerHTML with user data — everything via textContent)
   ========================================================================= */

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") {
        node.addEventListener(k.slice(2), attrs[k]);
      } else if (k === "html_SAFE_STATIC") {
        // only ever used for our own fixed strings, never user data
        node.innerHTML = attrs[k];
      } else {
        node.setAttribute(k, attrs[k]);
      }
    }
  }
  (children || []).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function iconBtn(label, title, onClick, danger) {
  return el("button", {
    class: "icon-btn" + (danger ? " danger" : ""),
    type: "button",
    title: title,
    "aria-label": title,
    onclick: onClick
  }, [label]);
}

/* =========================================================================
   SUGGESTIONS  (all canned, client-side only — no network / no AI calls)
   ========================================================================= */

const ACTION_VERBS = [
  "Managed", "Led", "Coordinated", "Prepared", "Reconciled", "Analyzed",
  "Streamlined", "Implemented", "Reduced", "Increased", "Maintained",
  "Audited", "Forecasted", "Negotiated", "Developed", "Delivered",
  "Improved", "Resolved", "Automated", "Trained", "Monitored", "Compiled"
];

const BULLET_TEMPLATES = [
  "{verb} [what you did] resulting in [measurable outcome]",
  "{verb} [process or task] across [team size / scope / frequency]",
  "{verb} [system or report] to improve [accuracy / speed / compliance]",
  "{verb} relationships with [stakeholders] to achieve [goal]"
];

function suggestBulletText() {
  const verb = ACTION_VERBS[Math.floor(Math.random() * ACTION_VERBS.length)];
  const tmpl = BULLET_TEMPLATES[Math.floor(Math.random() * BULLET_TEMPLATES.length)];
  return tmpl.replace("{verb}", verb);
}

const FIELD_HINTS = {
  name: "The name you want on official applications.",
  tagline: "A short identity line, e.g. \u201cSenior Accountant | CPA\u201d.",
  contact: "Only include what you want visible to employers.",
  summary: "3\u20134 sentences: who you are, your strongest skills, and what you're looking for. Mention the target role or employer if you're tailoring this CV.",
  eduDegree: "Full qualification name, e.g. \u201cB.Sc. Computer Science\u201d.",
  eduBullets: "Optional: grade, honors, relevant coursework, thesis title.",
  expTitle: "Your job title as it should appear \u2014 not the internal system name.",
  expBullets: "Start with an action verb. Add a number where you can \u2014 scope, frequency, amount, or percentage.",
  skills: "One skill per line. Keep each entry short (2\u20134 words).",
  knowledge: "A short competency heading (e.g. \u201cRisk Management\u201d) with one sentence describing it.",
  certifications: "Certification or course name, and the issuing body.",
  strengths: "Short, one line each \u2014 avoid repeating what's already in Skills."
};

function hint(text) {
  return el("div", { class: "hint" }, [text]);
}

/* =========================================================================
   EDITOR RENDERING
   ========================================================================= */

function field(labelText, inputEl, hintText) {
  const wrap = el("div", { class: "field" });
  wrap.appendChild(el("label", {}, [labelText]));
  wrap.appendChild(inputEl);
  if (hintText) wrap.appendChild(hint(hintText));
  return wrap;
}

function textInput(value, placeholder, onInput, type) {
  const input = el("input", { type: type || "text", placeholder: placeholder || "" });
  input.value = value || "";
  input.addEventListener("input", (e) => onInput(e.target.value));
  return input;
}

function textArea(value, placeholder, onInput) {
  const ta = el("textarea", { placeholder: placeholder || "", rows: "2" });
  ta.value = value || "";
  ta.addEventListener("input", (e) => onInput(e.target.value));
  return ta;
}

function renderEditor() {
  const root = document.getElementById("editor");
  root.innerHTML = "";

  root.appendChild(renderValidationBanner());
  root.appendChild(renderHeaderCard());
  root.appendChild(renderSummaryCard());
  root.appendChild(renderEducationCard());
  root.appendChild(renderExperienceCard());
  root.appendChild(renderKnowledgeCard());
  root.appendChild(renderFlatListCard("skills", "Skills", FIELD_HINTS.skills, "e.g. Financial Reporting"));
  root.appendChild(renderCertificationsCard());
  root.appendChild(renderFlatListCard("strengths", "Additional Strengths", FIELD_HINTS.strengths, "e.g. Works well under deadline pressure"));
  root.appendChild(renderStyleCard());
}

function sectionHead(title, sectionKey) {
  const head = el("div", { class: "section-head" });
  head.appendChild(el("h2", {}, [title]));
  if (sectionKey) {
    const toggle = el("label", { class: "toggle" });
    const cb = el("input", { type: "checkbox" });
    cb.checked = state.sections[sectionKey].visible;
    cb.addEventListener("change", (e) => {
      state.sections[sectionKey].visible = e.target.checked;
      scheduleSave(); renderEditor(); renderPreview();
    });
    toggle.appendChild(cb);
    toggle.appendChild(document.createTextNode("Show on CV"));
    head.appendChild(toggle);
  }
  return head;
}

function renderValidationBanner() {
  const missing = [];
  if (!state.header.name.trim()) missing.push("name");
  if (!state.header.email.trim() && !state.header.phone.trim()) missing.push("email or phone");
  const banner = el("div", { class: "banner " + (missing.length ? "warn" : "ok") });
  banner.textContent = missing.length
    ? "Before exporting, add: " + missing.join(", ") + "."
    : "Looks good \u2014 ready to export.";
  return banner;
}

function renderHeaderCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Header"));
  const body = el("div", { class: "section-body" });

  body.appendChild(field("Full name", textInput(state.header.name, "Jane Doe", (v) => {
    state.header.name = v; scheduleSave(); renderPreview(); renderEditorPartial();
  }), FIELD_HINTS.name));

  body.appendChild(field("Professional tagline", textInput(state.header.tagline, "e.g. Senior Accountant | CPA", (v) => {
    state.header.tagline = v; scheduleSave(); renderPreview();
  }), FIELD_HINTS.tagline));

  const row = el("div", { class: "two-col" });
  row.appendChild(textInput(state.header.location, "City, Country", (v) => {
    state.header.location = v; scheduleSave(); renderPreview();
  }));
  row.appendChild(textInput(state.header.phone, "Phone", (v) => {
    state.header.phone = v; scheduleSave(); renderPreview();
  }, "tel"));
  body.appendChild(field("Location & phone", row));

  const row2 = el("div", { class: "two-col" });
  row2.appendChild(textInput(state.header.email, "Email", (v) => {
    state.header.email = v; scheduleSave(); renderPreview();
  }, "email"));
  row2.appendChild(textInput(state.header.linkedin, "LinkedIn URL or handle", (v) => {
    state.header.linkedin = v; scheduleSave(); renderPreview();
  }));
  body.appendChild(field("Email & LinkedIn", row2, FIELD_HINTS.contact));

  card.appendChild(body);
  return card;
}

// Lightweight partial re-render so the validation banner updates without
// losing focus on every keystroke in the name field.
function renderEditorPartial() {
  const root = document.getElementById("editor");
  const old = root.querySelector(".banner");
  if (old) old.replaceWith(renderValidationBanner());
}

function renderSummaryCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Summary"));
  const body = el("div", { class: "section-body" });
  body.appendChild(field("Professional summary", textArea(state.summary, "3\u20134 sentences introducing your background and goal\u2026", (v) => {
    state.summary = v; scheduleSave(); renderPreview();
  }), FIELD_HINTS.summary));
  card.appendChild(body);
  return card;
}

function bulletEditor(bullets, onChange, hintText) {
  const wrap = el("div", { class: "field" });
  wrap.appendChild(el("label", {}, ["Bullet points"]));
  bullets.forEach((b, i) => {
    const row = el("div", { class: "bullet-row" });
    const ta = el("textarea", { rows: "2" });
    ta.value = b;
    ta.addEventListener("input", (e) => { bullets[i] = e.target.value; onChange(); });
    row.appendChild(ta);

    const controls = el("div", { class: "row-controls" });
    controls.appendChild(iconBtn("\u2191", "Move up", () => {
      if (i === 0) return;
      [bullets[i - 1], bullets[i]] = [bullets[i], bullets[i - 1]];
      onChange(); renderEditor();
    }));
    controls.appendChild(iconBtn("\u2193", "Move down", () => {
      if (i === bullets.length - 1) return;
      [bullets[i + 1], bullets[i]] = [bullets[i], bullets[i + 1]];
      onChange(); renderEditor();
    }));
    row.appendChild(controls);

    const rightControls = el("div", { class: "row-controls" });
    rightControls.appendChild(el("button", {
      class: "suggest-btn", type: "button", title: "Insert a suggestion",
      onclick: () => { ta.value = suggestBulletText(); bullets[i] = ta.value; onChange(); }
    }, ["\ud83d\udca1"]));
    rightControls.appendChild(iconBtn("\u00d7", "Remove bullet", () => {
      bullets.splice(i, 1);
      if (bullets.length === 0) bullets.push("");
      onChange(); renderEditor();
    }, true));
    row.appendChild(rightControls);

    wrap.appendChild(row);
  });
  if (hintText) wrap.appendChild(hint(hintText));
  wrap.appendChild(el("button", {
    class: "add-btn", type: "button",
    onclick: () => { bullets.push(""); onChange(); renderEditor(); }
  }, ["+ Add bullet"]));
  return wrap;
}

function renderEducationCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Education", "education"));
  const body = el("div", { class: "section-body" });
  const items = state.sections.education.items;

  items.forEach((item, i) => {
    const entry = el("div", { class: "entry" });
    const head = el("div", { class: "entry-head" });
    head.appendChild(el("strong", { style: "font-size:12px" }, ["Entry " + (i + 1)]));
    head.appendChild(el("span", { class: "spacer" }));
    head.appendChild(iconBtn("\u2191", "Move up", () => { if (i > 0) { [items[i-1], items[i]] = [items[i], items[i-1]]; scheduleSave(); renderEditor(); renderPreview(); } }));
    head.appendChild(iconBtn("\u2193", "Move down", () => { if (i < items.length-1) { [items[i+1], items[i]] = [items[i], items[i+1]]; scheduleSave(); renderEditor(); renderPreview(); } }));
    head.appendChild(iconBtn("\u00d7", "Remove entry", () => { items.splice(i,1); scheduleSave(); renderEditor(); renderPreview(); }, true));
    entry.appendChild(head);

    entry.appendChild(field("Degree / qualification", textInput(item.degree, "e.g. BBA (Hons)", (v) => { item.degree = v; scheduleSave(); renderPreview(); }), FIELD_HINTS.eduDegree));
    const row = el("div", { class: "two-col" });
    row.appendChild(textInput(item.institution, "Institution", (v) => { item.institution = v; scheduleSave(); renderPreview(); }));
    row.appendChild(textInput(item.dates, "Dates (e.g. 2022 \u2013 2024)", (v) => { item.dates = v; scheduleSave(); renderPreview(); }));
    entry.appendChild(field("Institution & dates", row));

    entry.appendChild(bulletEditor(item.bullets, () => { scheduleSave(); renderPreview(); }, FIELD_HINTS.eduBullets));
    body.appendChild(entry);
  });

  body.appendChild(el("button", { class: "add-btn", type: "button", onclick: () => { items.push(emptyEducation()); scheduleSave(); renderEditor(); renderPreview(); } }, ["+ Add education entry"]));
  card.appendChild(body);
  return card;
}

function renderExperienceCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Experience", "experience"));
  const body = el("div", { class: "section-body" });
  const items = state.sections.experience.items;

  items.forEach((item, i) => {
    const entry = el("div", { class: "entry" });
    const head = el("div", { class: "entry-head" });
    head.appendChild(el("strong", { style: "font-size:12px" }, ["Entry " + (i + 1)]));
    head.appendChild(el("span", { class: "spacer" }));
    head.appendChild(iconBtn("\u2191", "Move up", () => { if (i > 0) { [items[i-1], items[i]] = [items[i], items[i-1]]; scheduleSave(); renderEditor(); renderPreview(); } }));
    head.appendChild(iconBtn("\u2193", "Move down", () => { if (i < items.length-1) { [items[i+1], items[i]] = [items[i], items[i+1]]; scheduleSave(); renderEditor(); renderPreview(); } }));
    head.appendChild(iconBtn("\u00d7", "Remove entry", () => { items.splice(i,1); scheduleSave(); renderEditor(); renderPreview(); }, true));
    entry.appendChild(head);

    entry.appendChild(field("Job title", textInput(item.title, "e.g. Finance Officer", (v) => { item.title = v; scheduleSave(); renderPreview(); }), FIELD_HINTS.expTitle));
    const row = el("div", { class: "two-col" });
    row.appendChild(textInput(item.company, "Company", (v) => { item.company = v; scheduleSave(); renderPreview(); }));
    row.appendChild(textInput(item.dates, "Dates (e.g. 2024 \u2013 Present)", (v) => { item.dates = v; scheduleSave(); renderPreview(); }));
    entry.appendChild(field("Company & dates", row));

    entry.appendChild(bulletEditor(item.bullets, () => { scheduleSave(); renderPreview(); }, FIELD_HINTS.expBullets));
    body.appendChild(entry);
  });

  body.appendChild(el("button", { class: "add-btn", type: "button", onclick: () => { items.push(emptyExperience()); scheduleSave(); renderEditor(); renderPreview(); } }, ["+ Add experience entry"]));
  card.appendChild(body);
  return card;
}

function renderKnowledgeCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Areas of Knowledge", "knowledge"));
  const body = el("div", { class: "section-body" });
  body.appendChild(hint("Optional grouped section for competency areas relevant to a specific role or industry (e.g. regulatory, technical, or domain knowledge)."));
  const items = state.sections.knowledge.items;

  items.forEach((item, i) => {
    const entry = el("div", { class: "entry" });
    const head = el("div", { class: "entry-head" });
    head.appendChild(el("strong", { style: "font-size:12px" }, ["Entry " + (i + 1)]));
    head.appendChild(el("span", { class: "spacer" }));
    head.appendChild(iconBtn("\u2191", "Move up", () => { if (i > 0) { [items[i-1], items[i]] = [items[i], items[i-1]]; scheduleSave(); renderEditor(); renderPreview(); } }));
    head.appendChild(iconBtn("\u2193", "Move down", () => { if (i < items.length-1) { [items[i+1], items[i]] = [items[i], items[i+1]]; scheduleSave(); renderEditor(); renderPreview(); } }));
    head.appendChild(iconBtn("\u00d7", "Remove entry", () => { items.splice(i,1); scheduleSave(); renderEditor(); renderPreview(); }, true));
    entry.appendChild(head);

    entry.appendChild(field("Category", textInput(item.category, "e.g. Risk Management", (v) => { item.category = v; scheduleSave(); renderPreview(); }), FIELD_HINTS.knowledge));
    entry.appendChild(field("Description", textArea(item.description, "One sentence describing this area\u2026", (v) => { item.description = v; scheduleSave(); renderPreview(); })));
    body.appendChild(entry);
  });

  body.appendChild(el("button", { class: "add-btn", type: "button", onclick: () => { items.push(emptyKnowledge()); scheduleSave(); renderEditor(); renderPreview(); } }, ["+ Add knowledge area"]));
  card.appendChild(body);
  return card;
}

function renderFlatListCard(sectionKey, title, hintText, placeholder) {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead(title, sectionKey));
  const body = el("div", { class: "section-body" });
  const items = state.sections[sectionKey].items;

  items.forEach((val, i) => {
    const row = el("div", { class: "bullet-row" });
    row.appendChild(textInput(val, placeholder, (v) => { items[i] = v; scheduleSave(); renderPreview(); }));
    row.appendChild(iconBtn("\u00d7", "Remove", () => { items.splice(i,1); scheduleSave(); renderEditor(); renderPreview(); }, true));
    body.appendChild(row);
  });
  if (hintText) body.appendChild(hint(hintText));
  body.appendChild(el("button", { class: "add-btn", type: "button", onclick: () => { items.push(""); scheduleSave(); renderEditor(); renderPreview(); } }, ["+ Add item"]));
  card.appendChild(body);
  return card;
}

function renderCertificationsCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Certifications", "certifications"));
  const body = el("div", { class: "section-body" });
  const items = state.sections.certifications.items;

  items.forEach((item, i) => {
    const row = el("div", { class: "two-col", style: "margin-bottom:6px" });
    row.appendChild(textInput(item.name, "Certification name", (v) => { item.name = v; scheduleSave(); renderPreview(); }));
    const sub = el("div", { style: "display:flex; gap:6px;" });
    sub.appendChild(textInput(item.issuer, "Issuing body", (v) => { item.issuer = v; scheduleSave(); renderPreview(); }));
    sub.appendChild(iconBtn("\u00d7", "Remove", () => { items.splice(i,1); scheduleSave(); renderEditor(); renderPreview(); }, true));
    row.appendChild(sub);
    body.appendChild(row);
  });
  body.appendChild(hint(FIELD_HINTS.certifications));
  body.appendChild(el("button", { class: "add-btn", type: "button", onclick: () => { items.push(emptyCert()); scheduleSave(); renderEditor(); renderPreview(); } }, ["+ Add certification"]));
  card.appendChild(body);
  return card;
}

const ACCENT_SWATCHES = [
  { name: "None (plain B&W)", value: "none" },
  { name: "Navy", value: "#1F3A5F" },
  { name: "Forest", value: "#2F6F4E" },
  { name: "Burgundy", value: "#7A2E3B" },
  { name: "Charcoal", value: "#33393F" }
];

function renderStyleCard() {
  const card = el("div", { class: "section-card" });
  card.appendChild(sectionHead("Style"));
  const body = el("div", { class: "section-body" });

  const grid = el("div", { class: "style-grid" });

  const fontField = el("div", { class: "field" });
  fontField.appendChild(el("label", {}, ["Font"]));
  const fontSelect = el("select", {});
  [["calibri","Calibri"],["arial","Arial"],["georgia","Georgia (serif)"],["times","Times New Roman (serif)"]].forEach(([val, label]) => {
    const opt = el("option", { value: val }, [label]);
    if (state.style.font === val) opt.setAttribute("selected", "selected");
    fontSelect.appendChild(opt);
  });
  fontSelect.addEventListener("change", (e) => { state.style.font = e.target.value; scheduleSave(); renderPreview(); });
  fontField.appendChild(fontSelect);
  grid.appendChild(fontField);

  const sizeField = el("div", { class: "field" });
  sizeField.appendChild(el("label", {}, ["Text size"]));
  const sizeSelect = el("select", {});
  [["compact","Compact"],["normal","Normal"],["large","Large"]].forEach(([val, label]) => {
    const opt = el("option", { value: val }, [label]);
    if (state.style.fontSize === val) opt.setAttribute("selected", "selected");
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener("change", (e) => { state.style.fontSize = e.target.value; scheduleSave(); renderPreview(); });
  sizeField.appendChild(sizeSelect);
  grid.appendChild(sizeField);

  body.appendChild(grid);

  const accentField = el("div", { class: "field" });
  accentField.appendChild(el("label", {}, ["Accent color"]));
  const swatches = el("div", { class: "swatches" });
  ACCENT_SWATCHES.forEach((s) => {
    const sw = el("button", {
      class: "swatch" + (state.style.accent === s.value ? " selected" : ""),
      type: "button", title: s.name,
      style: "background:" + (s.value === "none" ? "repeating-linear-gradient(45deg,#fff,#fff 3px,#ccc 3px,#ccc 6px)" : s.value),
      onclick: () => { state.style.accent = s.value; scheduleSave(); renderPreview(); renderEditor(); }
    });
    swatches.appendChild(sw);
  });
  accentField.appendChild(swatches);
  body.appendChild(accentField);

  card.appendChild(body);
  return card;
}

/* =========================================================================
   PREVIEW RENDERING
   ========================================================================= */

function renderPreview() {
  const page = document.getElementById("resumePage");
  page.innerHTML = "";
  page.setAttribute("data-font", state.style.font);
  page.setAttribute("data-size", state.style.fontSize);
  page.className = "page" + (state.style.accent !== "none" ? " accent" : "");
  if (state.style.accent !== "none") {
    page.style.setProperty("--accent-color", state.style.accent);
  } else {
    page.style.removeProperty("--accent-color");
  }

  const h = state.header;
  if (h.name) page.appendChild(el("h1", { class: "rp-name" }, [h.name]));
  else page.appendChild(el("h1", { class: "rp-name", style: "color:#aaa" }, ["Your Name"]));

  if (h.tagline) page.appendChild(el("p", { class: "rp-tagline" }, [h.tagline]));

  const contactParts = [h.location, h.phone, h.email, h.linkedin].filter(Boolean);
  if (contactParts.length) {
    page.appendChild(el("p", { class: "rp-contact" }, [contactParts.join("  |  ")]));
  }

  if (state.summary) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Summary"]));
    page.appendChild(el("p", { class: "rp-summary" }, [state.summary]));
  }

  const S = state.sections;

  if (S.education.visible && S.education.items.some((i) => i.degree || i.institution)) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Education"]));
    S.education.items.forEach((item) => {
      if (!item.degree && !item.institution) return;
      const headRow = el("div", { class: "rp-entry-head" }, [
        el("span", {}, [item.degree || ""]),
        el("span", {}, [item.dates || ""])
      ]);
      page.appendChild(headRow);
      if (item.institution) page.appendChild(el("div", { class: "rp-entry-sub" }, [item.institution]));
      const bullets = item.bullets.filter(Boolean);
      if (bullets.length) {
        const ul = el("ul", { class: "rp-bullets" });
        bullets.forEach((b) => ul.appendChild(el("li", {}, [b])));
        page.appendChild(ul);
      }
    });
  }

  if (S.experience.visible && S.experience.items.some((i) => i.title || i.company)) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Professional Experience"]));
    S.experience.items.forEach((item) => {
      if (!item.title && !item.company) return;
      const headRow = el("div", { class: "rp-entry-head" }, [
        el("span", {}, [item.title || ""]),
        el("span", {}, [item.dates || ""])
      ]);
      page.appendChild(headRow);
      if (item.company) page.appendChild(el("div", { class: "rp-entry-sub" }, [item.company]));
      const bullets = item.bullets.filter(Boolean);
      if (bullets.length) {
        const ul = el("ul", { class: "rp-bullets" });
        bullets.forEach((b) => ul.appendChild(el("li", {}, [b])));
        page.appendChild(ul);
      }
    });
  }

  if (S.knowledge.visible && S.knowledge.items.some((i) => i.category)) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Areas of Knowledge"]));
    S.knowledge.items.forEach((item) => {
      if (!item.category) return;
      const p = el("p", { class: "rp-knowledge-item" });
      p.appendChild(el("b", {}, [item.category + (item.description ? ": " : "")]));
      if (item.description) p.appendChild(document.createTextNode(item.description));
      page.appendChild(p);
    });
  }

  if (S.skills.visible && S.skills.items.some(Boolean)) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Skills"]));
    const ul = el("ul", { class: "rp-flatlist" });
    S.skills.items.filter(Boolean).forEach((s) => ul.appendChild(el("li", {}, [s])));
    page.appendChild(ul);
  }

  if (S.certifications.visible && S.certifications.items.some((i) => i.name)) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Certifications"]));
    S.certifications.items.forEach((item) => {
      if (!item.name) return;
      page.appendChild(el("p", { class: "rp-cert-item" }, [item.name + (item.issuer ? " \u2013 " + item.issuer : "")]));
    });
  }

  if (S.strengths.visible && S.strengths.items.some(Boolean)) {
    page.appendChild(el("div", { class: "rp-section-title" }, ["Additional Strengths"]));
    const ul = el("ul", { class: "rp-flatlist" });
    S.strengths.items.filter(Boolean).forEach((s) => ul.appendChild(el("li", {}, [s])));
    page.appendChild(ul);
  }

  updatePageEstimate();
}

function updatePageEstimate() {
  const page = document.getElementById("resumePage");
  const pageHeightPx = 1056; // approx one Letter page at 96dpi
  const pages = Math.max(1, Math.ceil(page.scrollHeight / pageHeightPx));
  const el2 = document.getElementById("pageEstimate");
  if (el2) el2.textContent = pages + (pages === 1 ? " page" : " pages (est.)");
}

/* =========================================================================
   EXPORT: PDF (renders the live preview exactly as shown)
   ========================================================================= */

function exportPdf() {
  if (typeof html2pdf === "undefined") {
    alert("PDF export library hasn't finished loading. Check your connection and try again.");
    return;
  }
  const page = document.getElementById("resumePage");
  const filename = (state.header.name || "resume").trim().replace(/\s+/g, "_") + ".pdf";
  const opt = {
    margin: 0,
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "px", format: [816, Math.max(1056, page.scrollHeight)], orientation: "portrait" }
  };
  html2pdf().set(opt).from(page).save();
}

/* =========================================================================
   EXPORT: DOCX (built natively with the docx library — not an HTML print)
   ========================================================================= */

function buildDocxDocument() {
  const d = window.docx;
  const FONT_MAP = { calibri: "Calibri", arial: "Arial", georgia: "Georgia", times: "Times New Roman" };
  const font = FONT_MAP[state.style.font] || "Calibri";
  const accent = state.style.accent !== "none" ? state.style.accent.replace("#", "") : "000000";
  const HAIR = { style: d.BorderStyle.SINGLE, size: 6, color: accent };

  function heading(text) {
    return new d.Paragraph({
      spacing: { before: 240, after: 100 },
      border: { bottom: HAIR },
      children: [new d.TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: accent, font })]
    });
  }
  function bullet(text) {
    return new d.Paragraph({
      numbering: { reference: "bullets", level: 0 },
      spacing: { after: 40 },
      children: [new d.TextRun({ text, size: 21, font })]
    });
  }
  function entryHead(left, right) {
    return new d.Paragraph({
      tabStops: [{ type: d.TabStopType.RIGHT, position: 12240 - 1800 }],
      spacing: { after: 20 },
      children: [
        new d.TextRun({ text: left, bold: true, size: 22, font }),
        new d.TextRun({ text: "\t" + right, bold: true, size: 21, font })
      ]
    });
  }
  function sub(text) {
    return new d.Paragraph({ spacing: { after: 60 }, children: [new d.TextRun({ text, italics: true, size: 21, font })] });
  }
  function para(text) {
    return new d.Paragraph({ spacing: { after: 100 }, children: [new d.TextRun({ text, size: 21, font })] });
  }

  const children = [];
  const h = state.header;
  children.push(new d.Paragraph({
    alignment: d.AlignmentType.CENTER, spacing: { after: 40 },
    children: [new d.TextRun({ text: (h.name || "Your Name").toUpperCase(), bold: true, size: 40, font, color: accent })]
  }));
  if (h.tagline) {
    children.push(new d.Paragraph({
      alignment: d.AlignmentType.CENTER, spacing: { after: 80 },
      children: [new d.TextRun({ text: h.tagline, size: 22, font })]
    }));
  }
  const contactParts = [h.location, h.phone, h.email, h.linkedin].filter(Boolean);
  if (contactParts.length) {
    children.push(new d.Paragraph({
      alignment: d.AlignmentType.CENTER, border: { bottom: HAIR }, spacing: { after: 160 },
      children: [new d.TextRun({ text: contactParts.join("  |  "), size: 19, font })]
    }));
  }

  if (state.summary) {
    children.push(heading("Summary"));
    children.push(para(state.summary));
  }

  const S = state.sections;

  if (S.education.visible && S.education.items.some((i) => i.degree || i.institution)) {
    children.push(heading("Education"));
    S.education.items.forEach((item) => {
      if (!item.degree && !item.institution) return;
      children.push(entryHead(item.degree || "", item.dates || ""));
      if (item.institution) children.push(sub(item.institution));
      item.bullets.filter(Boolean).forEach((b) => children.push(bullet(b)));
    });
  }

  if (S.experience.visible && S.experience.items.some((i) => i.title || i.company)) {
    children.push(heading("Professional Experience"));
    S.experience.items.forEach((item) => {
      if (!item.title && !item.company) return;
      children.push(entryHead(item.title || "", item.dates || ""));
      if (item.company) children.push(sub(item.company));
      item.bullets.filter(Boolean).forEach((b) => children.push(bullet(b)));
    });
  }

  if (S.knowledge.visible && S.knowledge.items.some((i) => i.category)) {
    children.push(heading("Areas of Knowledge"));
    S.knowledge.items.forEach((item) => {
      if (!item.category) return;
      const text = item.category + (item.description ? ": " + item.description : "");
      children.push(bullet(text));
    });
  }

  if (S.skills.visible && S.skills.items.some(Boolean)) {
    children.push(heading("Skills"));
    S.skills.items.filter(Boolean).forEach((s) => children.push(bullet(s)));
  }

  if (S.certifications.visible && S.certifications.items.some((i) => i.name)) {
    children.push(heading("Certifications"));
    S.certifications.items.forEach((item) => {
      if (!item.name) return;
      children.push(bullet(item.name + (item.issuer ? " \u2013 " + item.issuer : "")));
    });
  }

  if (S.strengths.visible && S.strengths.items.some(Boolean)) {
    children.push(heading("Additional Strengths"));
    S.strengths.items.filter(Boolean).forEach((s) => children.push(bullet(s)));
  }

  return new d.Document({
    styles: { default: { document: { run: { font } } } },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: d.LevelFormat.BULLET, text: "\u2022", alignment: d.AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } } }]
      }]
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children
    }]
  });
}

function exportDocx() {
  if (typeof window.docx === "undefined") {
    alert("Word export library hasn't finished loading. Check your connection and try again.");
    return;
  }
  const doc = buildDocxDocument();
  const filename = (state.header.name || "resume").trim().replace(/\s+/g, "_") + ".docx";
  window.docx.Packer.toBlob(doc).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch((err) => {
    console.error(err);
    alert("Could not build the Word document. See console for details.");
  });
}

/* =========================================================================
   TOP-LEVEL CONTROLS
   ========================================================================= */

function wireTopbar() {
  document.getElementById("btnNew").addEventListener("click", () => {
    if (!confirm("Start a new, blank CV? This clears the current draft (on this device).")) return;
    state = defaultState();
    scheduleSave(); renderEditor(); renderPreview();
  });
  document.getElementById("btnPdf").addEventListener("click", exportPdf);
  document.getElementById("btnDocx").addEventListener("click", exportDocx);
}

function wireMobileTabs() {
  const editTab = document.getElementById("tabEdit");
  const previewTab = document.getElementById("tabPreview");
  const editorPane = document.getElementById("editor");
  const previewPane = document.getElementById("previewPane");
  function show(which) {
    editTab.classList.toggle("active", which === "edit");
    previewTab.classList.toggle("active", which === "preview");
    editorPane.classList.toggle("active", which === "edit");
    previewPane.classList.toggle("active", which === "preview");
  }
  editTab.addEventListener("click", () => show("edit"));
  previewTab.addEventListener("click", () => show("preview"));
  show("edit");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("Service worker registration failed (offline support disabled):", err);
      });
    });
  }
}

/* =========================================================================
   INIT
   ========================================================================= */

function init() {
  wireTopbar();
  wireMobileTabs();
  renderEditor();
  renderPreview();
  registerServiceWorker();
  setStatus("Loaded");
}

document.addEventListener("DOMContentLoaded", init);
