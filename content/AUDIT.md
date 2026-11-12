# Content & UX audit — fahmiadyportofolio.netlify.app

> **Decisions since the audit (2026-11-12):** title is **Software Developer**; Calculator, TodoList,
> Tictactou and Snake Game are dropped; Webtix, Lapetshop and Restaurant become projects once the user
> sends descriptions (`pendingProjects` in content.json). Concept A was picked and reworked as a
> detective office (`mockups/a-detective-room.html`).

Audited 2026-11-12 against `../WebPortofolio` (HEAD `1b5b007`, plus uncommitted edits) and the live site.
Structured content lives in [`content.json`](content.json).

## 1. Source vs live

- The live bundle (`main.a5baafe3.js`) is byte-identical by hash to `../WebPortofolio/build/`, and it contains the
  **uncommitted** experience rewrite (400+ universities, SDMPKS, Patriot Connect). GitHub does not have the
  version that is live. Commit those edits or treat the live text as the source of truth (content.json does).
- Last commit: 2025-07-26 ("update project").

## 2. Outdated content

| Item | Problem |
|---|---|
| Footer | `Muhammad Fahmi ady susilo © 2022` — stale year, wrong casing. |
| Headline | Says "Fullstack Developer"; About says "Software Developer"; CV says "Frontend Engginering". Pick one. |
| CV (`src/assets/cv.pdf`) | From 2022: student in semester 8, GPA "sementara", no Sentra Vidya job, typo "Engginering". The Download button is commented out, so the site has **no CV link** at all. |
| About | One sentence, no mention of current job, impact numbers, or what he wants next. |
| Experience | "Juli 2023" mixes Indonesian into English copy; "Frontend Development" is a field, not a role title. Ruangguru item text is a program blurb, not what he did (no mention of GPA 4.00, CodeIn, Snake Game team). |
| Projects | Strongest professional work (400+ universities, SDMPKS, Patriot Connect, custom reports) is not shown as projects; the list is mostly 2021–2022 course exercises (calculator, todo, tic-tac-toe). |
| Certificates | 23 images, no titles/dates in the UI; mostly beginner course certs from 2020–2022. |
| Missing sections | Education (UTM Informatika, GPA 3.70), organizations (GenBI, IMALA), achievements (Bank Indonesia scholarship, 1st place robot competition ITS) exist only in the old CV. |
| Copy typos | "Hello I'am", "Wwebsite", "Tictactou", "Project Me", "Skill Me", "Experince.js". |

## 3. Broken / risky links

| Link | Status |
|---|---|
| Snake Game demo `https://rg-km.github.io/se-fe6-kelompok8/` | **404** |
| Batik prediction `https://fahmiskripsi2.streamlit.app/` | 303 → Streamlit login/wake page (app asleep or private) |
| LinkedIn profile | 999 to bots (normal for LinkedIn); verify manually |
| Lanjalan `aleng-fe-fahmiady11.vercel.app` | 200 |
| All other GitHub / Netlify / GitHub Pages links | 200 |
| `https://www.instagram.com/uiux_11/` (CV only) | 200, not linked on site |

## 4. Missing / unused images

- **No profile photo on site** — `image/fotoutama.jpeg` (498×498) exists but its import is commented out.
- Orphan screenshots with no metadata: `project/restourant/*` (restaurant listing, dropped from an older build, hero still Lorem Ipsum), `project/webtix/*` (cinema ticketing), `project/lapetshop/*` (pet shop),
  `project/profileImage/1–10.png` (mobile profile UI). Decision: Webtix, Lapetshop, Restaurant become projects (user supplies descriptions); profileImage screenshots are dropped.
- Unused: `wajah.svg`, `fotoutamadark.png` (4059×5601), `logoSkill/next.png`, `logoSkill/zustand.png`.
- CBT and Lanjalan have no live link or repo; CodeIn has no demo.

## 5. Performance

- `src/assets/image` is **36 MB**. Worst: `lanjalan/image1.png` 6.8 MB, `cbt/cbt1.png` 3.2 MB,
  `restourant/resto.png` 1.4 MB, `codein/detailblog.png` 1.2 MB — all PNG, no WebP/AVIF, no `srcset`.
- All project screenshots are imported eagerly into the JS graph (`ProjectMe.js`), so they are fetched as soon as /project renders.
- **Forced 4-second loader** on every visit (`setTimeout(..., 4000)` in `App.js`) regardless of load state — biggest UX/perf hit; hurts LCP and bounce rate.
- 460 KB main JS for six mostly static pages; `framer-motion` + `motion` both installed, `animate.css`, `react-typed`, `fslightbox-react`, `react-helmet`, `react-toastify`.
- 17 skill icons hot-linked from jsDelivr (`devicon@latest` for some → can change under you).
- Google Fonts loaded via CSS `@import` (render-blocking), 3 families × many weights.
- `console.log` in render (`App.js` logs the ref every render; `ItemExperience` logs JSX).

## 6. UX

- Content is split across 6 routes with prev/next arrows; a recruiter needs 5 clicks to reach Contact, and there is no CV.
- Every page is `h-screen` with an **inner scroll box** (projects, experience, certificates in a `h-72`/`h-2/3` div) — double scrollbars on desktop, scroll traps on mobile.
- Fixed footer overlaps content on short screens; pages compensate with ad-hoc `mb-36`/`mb-20`.
- Left half of each page is just the page title ("Project Me — Page"), wasting 50% of the viewport.
- Cursor-follow ball runs on touch devices too and sits in document flow.
- Project screenshots open in a lightbox but there are no project detail pages, roles, or outcomes.
- Default theme is dark, persisted in localStorage; no `prefers-color-scheme` respect.

## 7. Accessibility

- Interactive `<div onClick>` everywhere (theme toggle, burger menu, prev/next arrows, copy email, image zoom) — not focusable, no keyboard support, no roles/labels.
- Images: `alt=""` on skill icons (17 icons with no text → skills are invisible to screen readers), `alt="github"` on all social icons (LinkedIn/Instagram too), `alt="certif"`, `alt="imageProject"`, `alt="mainImage"`.
- `<p>` wrapping `<ul>` in `ItemExperience` (invalid HTML), nested `<ul>` inside `<ul>`.
- Infinite animations (wave, floating rocket, typed text, jackInTheBox) ignore `prefers-reduced-motion`.
- Low contrast: cyan `#12F3D8` on white in light-mode buttons; `text-gray-700` "/ 06" on `slate-900` in dark mode.
- `<html lang="en">` but mixed Indonesian strings.

## 8. SEO / meta

- `<title>React App</title>` and `meta description = "Web site created using create-react-app"`; Helmet titles are just "Home", "About"…
- No Open Graph / Twitter card, no canonical, no favicon of his own (CRA React logo), `manifest.json` still "Create React App Sample".
- SPA with `/* /index.html 200` — fine for Netlify, but zero prerendered content for crawlers/link previews.

## 9. Content still needed from the user

1. Up-to-date CV (PDF) — English or Indonesian?
2. Final degree info: graduation year and final GPA (UTM Teknik Informatika).
3. ~~Which title~~ — decided: Software Developer.
4. Any shareable work from Sentra Vidya (screens, case-study numbers) — or NDA-safe descriptions.
5. ~~Course projects~~ — dropped. Descriptions, tags and links for Webtix, Lapetshop and Restaurant (pending). Profile UI screens: keep or drop?
6. New photo (current one is a cropped event photo).
7. Wake or replace the Streamlit batik app (Snake Game is dropped, so its dead link no longer matters).
