# National Strings Meeting 2026 · IIT Kanpur

**Live site: <https://hepiitk.github.io/nsm2026/>**

The website of the **National Strings Meeting 2026** (15–19 December 2026), hosted by the String theory group at the Department of Physics, Indian Institute of Technology Kanpur.

It is a static site: eight HTML pages, one stylesheet and a few small scripts. There is no build step, no framework, no database and no server-side code. Fonts, maths typesetting (KaTeX) and images are all in the repository, so the pages make no requests to other sites. GitHub Pages publishes the files exactly as they are in this repository.

| Page (opens the live site) | File |
| --- | --- |
| [Home](https://hepiitk.github.io/nsm2026/) | `index.html` |
| [Registration](https://hepiitk.github.io/nsm2026/registration.html) | `registration.html` |
| [Speakers](https://hepiitk.github.io/nsm2026/speakers.html) | `speakers.html` |
| [Posters & Talks](https://hepiitk.github.io/nsm2026/shortlisted.html) | `shortlisted.html` |
| [Participants](https://hepiitk.github.io/nsm2026/participants.html) | `participants.html` |
| [Schedule](https://hepiitk.github.io/nsm2026/schedule.html) | `schedule.html` |
| [Information](https://hepiitk.github.io/nsm2026/venue-organizers.html) | `venue-organizers.html` |
| [Gallery](https://hepiitk.github.io/nsm2026/gallery.html) | `gallery.html` |

The page called **Information** in the menu is the file `venue-organizers.html`. The file name was kept when the page was renamed, so links that were already shared still work.

---

## Contents

1. [Updating the site](#1-updating-the-site)
2. [The visual editor](#2-the-visual-editor)
3. [Editing the HTML by hand](#3-editing-the-html-by-hand)
4. [Recipes](#4-recipes)
5. [Publishing with GitHub Pages](#5-publishing-with-github-pages)
6. [Repository layout](#6-repository-layout)
7. [Before announcing a change](#7-before-announcing-a-change)
8. [Image sources and licences](#8-image-sources-and-licences)
9. [Accessibility and browsers](#9-accessibility-and-browsers)

---

## 1. Updating the site

Every change pushed to the publishing branch (usually `main`) appears on the live site within a few minutes. Choose the way that suits the change.

### A. A small text change: edit on GitHub

1. Open the file in this repository, for example `schedule.html`.
2. Click the pencil icon (**Edit this file**), change the text, and press **Commit changes**.
3. Wait one or two minutes (the **Actions** tab shows the "pages build and deployment" run), then reload the live page with `Ctrl`+`Shift`+`R` (`⌘`+`Shift`+`R` on a Mac).

Each section of every page starts with a large comment that explains it and contains a template to copy (section 3).

### B. Most changes: the visual editor, then upload

1. **Get the files.** On this repository's page, **Code → Download ZIP**, then unzip it. (Or `git clone https://github.com/hepiitk/nsm2026.git`.)
2. **Edit.** Double-click `edit.html` in that folder (Chrome or Edge recommended) and choose the folder. Change the pages visually (section 2).
3. **Save.** In Chrome and Edge, **Save → Save into the website folder**. In other browsers, **Save → Download only the changed files (.zip)** and unzip it.
4. **Upload.** On GitHub, **Add file → Upload files**, then drag in the changed files and folders, keeping their folders: a page goes at the top level, a new photo in its folder under `assets/`. GitHub keeps the folder structure and replaces files that have the same path. Write a short message (for example "Add speakers") and press **Commit changes**.

With git, step 4 is:

```bash
git add -A
git commit -m "Add speakers"
git push
```

To **delete** a file on GitHub, open it, then use the **⋯** menu → **Delete file**.

### C. Preview before publishing

Double-click `index.html`: everything works offline. To see the example entries hidden from visitors (sample timetable rows and Talk Materials), add `?preview` to the address, for example `schedule.html?preview`. A banner at the bottom confirms preview mode.

For a check that behaves exactly like GitHub Pages, run a small local server in the folder and open <http://localhost:8000>:

```bash
python3 -m http.server 8000
```

---

## 2. The visual editor

`edit.html` shows the pages exactly as visitors see them. You change them in place, and it writes clean HTML back into the same files. It runs entirely in your browser and works on the copy on your own computer. Nothing is uploaded until you upload it to GitHub yourself (section 1B).

`edit.html` is also reachable on the live site. That is harmless: it only asks to open a folder on the visitor's own computer, cannot change the published site, and is hidden from search engines.

| To … | Do this |
| --- | --- |
| Change any text | Click it and type. `Enter` starts a new paragraph or list item, `Shift`+`Enter` a new line. |
| Fill in a "TBA" placeholder | Click it and type the real value. The orange mark disappears by itself. A date typed there (for example 20 November 2026) is also stored as a date for search engines and calendars; typing TBA over a date turns it back into a TBA mark. |
| Bold, italic, link, superscript, "TBA" mark | Select words and use the small toolbar above the text (`Ctrl`+`B`, `Ctrl`+`I`, `Ctrl`+`K`). |
| Add a speaker, committee member, talk, poster, date, news item, photo or menu item | Click an existing one, press **Duplicate** in the block toolbar, and edit the copy. |
| Move, hide or delete something | Block toolbar: up/down arrows, eye (hide from visitors), bin. Hidden blocks stay in the file with `hidden`; tick **Show hidden** to see them. |
| Select a larger block | The first button of the block toolbar, or a name in the path at the bottom. `Alt`+click selects exactly what is under the mouse. |
| Add new content | **＋** in the block toolbar: paragraph, heading, list, button, image, "TBA" note, table, a whole section, or your own HTML. |
| Change a photo | Double-click it, or drop a photo file onto it. Large photos are scaled to web size and stored in `assets/images/uploads/`. Write the alt text in the same window. |
| Add photos to the Gallery | On the Gallery page: **Page → Add photos to the gallery**, and pick many photos at once. Each is scaled to web size, gets a small copy for the grid, and a caption you can change by clicking it. |
| Tables | Click a cell, then **＋**: a new row, a new column after that cell, or delete that cell's column. |
| Fill a long table at once (participants) | **Page → Fill a table from a spreadsheet**. In Excel or Google Sheets (for example the responses of the registration form), select and copy the rows, paste them, and choose which column goes where. Repeated rows can be left out. You can also open a .csv file. Undo brings the old rows back. |
| Change where a link goes | Click the link (or select a button) and press the link button. You can also upload a PDF and link to it. Every link of the site opens in the same tab. |
| Edit the HTML of anything | `</>` in the block toolbar (one block), **Page → Edit this page's HTML**, or **Site → Files and code** (any file: CSS, JavaScript, README). |
| Page title and description | **Page → Title and description**. |
| Add or remove a page | **Page → Add a page** (it can be added to the menu and footer of every page) or **Remove this page**. |
| Change some text everywhere | **Site → Find and replace** (every page, and optionally titles and image descriptions). |
| Check for mistakes | **Site → Check the website**: links that go nowhere or to the wrong place, empty headings, cells or paragraphs, missing images or descriptions, dates whose text does not match the date given to search engines, and the "to be announced" marks left. **Show** jumps to each one. |
| Colours and fonts | **Site → Colours and fonts** (the settings at the top of `css/style.css`). |
| Header and footer | Edit them on any page; every page follows. (Switch this off in the **Site** menu.) |
| Undo / redo | `Ctrl`+`Z` / `Ctrl`+`Shift`+`Z`, as many steps as you like. |
| Save | **Save**: into the website folder (Chrome, Edge), the whole website as a .zip, only the changed files as a .zip, or this page. |

Saving also sets the "Last updated" date in the footer of every page to today. Unsaved changes are kept in the browser and offered back when you open the editor again. Pages written by the editor keep their comments, line breaks and templates, and a page you did not change is saved exactly as it was. Press **?** in the editor for the full help.

---

## 3. Editing the HTML by hand

Open the `.html` files in any plain-text editor (VS Code, Notepad++, Gedit, or GitHub's own editor; not Word). Every section starts with a large comment like this:

```html
<!-- =====================================================================
     SHORTLISTED TALKS
     … instructions and a TEMPLATE to copy …
     ===================================================================== -->
```

Search for the section name, copy the template inside the comment, paste it where you want it, and edit the words. To remove something, delete its block, from its opening tag to its closing tag (`<li …> … </li>`). To reorder, move whole blocks.

**Unconfirmed information** is marked so nobody mistakes it for a fact:

| Mark | Looks like | Replace with |
| --- | --- | --- |
| `<span class="tba">To be announced</span>` | a small dashed orange label | the confirmed text |
| `<p class="tba-note">…</p>` | a dashed orange note | a normal paragraph `<p>…</p>` |

Search all `.html` files for `tba` to find every remaining one.

**Header and footer** appear on every page. In the visual editor, change them once and every page follows. By hand, change a menu item, the contact e-mail or a footer link in every `.html` file (on GitHub, search the repository; in VS Code, "Find in files").

**Maths** works anywhere in the text: `$\mathcal{N}=4$` inline, `$$ … $$` on its own line.

**File names** are case-sensitive on GitHub Pages: `Photo.JPG` and `photo.jpg` are different files. Keep names lower-case, without spaces, and write them in the HTML exactly as they are.

---

## 4. Recipes

Each of these is also a few clicks in the visual editor (section 2).

### 4.1 Dates and venues

The meeting dates (15–19 December 2026) appear in several places; if they change, update all of them (the editor's **Site → Find and replace** does it in one go):

- `index.html`: the hero facts (`KEY FACTS`), the "At a glance" card, `IMPORTANT DATES`, the registration summary card, the page description in `<head>`, and the `EVENT DETAILS FOR SEARCH ENGINES` block in `<head>` (the `startDate` and `endDate` lines, written as 2026-12-15);
- `registration.html`: the status box;
- `schedule.html`: the introduction, the day links at the top and the date line of each day;
- `venue-organizers.html`: the page description.

Known dates are written `<time datetime="2026-11-20">20 Nov 2026</time>`: the visible text for people and the `datetime` (year-month-day) for search engines and calendars. Change both together. While a date is unknown, write `<span class="tba">TBA</span>` instead of a `<time>`.

The two halls (Outreach Auditorium and Lecture Hall 18, L-18) are named in the "At a glance" card on the home page, on the Information page (note, photos, "Conference location" card and campus plan) and in the date line of each day of the schedule.

### 4.2 Change a link

A link is `<a href="ADDRESS">visible text</a>`. Change the part between the quotes. All links open in the same tab, so do not add `target="_blank"`. Pages of this site are written as `schedule.html`, a section as `schedule.html#day-2`, other sites as full `https://…` addresses, and e-mails as `mailto:name@iitk.ac.in`.

### 4.3 The registration form

Registration is a single step, on `registration.html`. When the form is ready, put its link in the "Form" row (replacing `<span class="tba">Link to be added</span>`) and replace the comment `BUTTON GOES HERE` with

```html
<a class="btn btn--primary" href="https://YOUR-FORM-LINK">Open the registration form</a>
```

The steps under "How to register" are hidden for now (`hidden` in each `<li>`); remove `hidden` to show them, and the "steps will be posted" note disappears by itself. Fill in the fees table. The home page has a summary card ("03 · REGISTRATION") and an announcement under "News": keep them in step.

### 4.4 E-mail addresses and phone numbers

The organisers' address is **nsm2026iitk@proton.me**. It appears in the footer of every page (a click opens the e-mail program) and in the Contact card of the Information page (a click copies it). To change it, use the editor's **Site → Find and replace**, or search all `.html` files for it.

On the Information page (`CONTACT`), each e-mail address is written as

```html
<li><a class="copy-email" href="mailto:name@iitk.ac.in">name@iitk.ac.in</a></li>
```

A click copies the address and shows "Copied ✓" (`js/main.js`, section 7). Without JavaScript the link opens the e-mail program instead. Phone numbers are written `<a href="tel:+915122590000">0512-259-0000</a>`; the template is in the same comment.

### 4.5 Announcements

`index.html` → `ANNOUNCEMENTS`: copy the template in the comment and put the newest first.

### 4.6 Speakers

`speakers.html` → `SPEAKERS`: one `<li class="speaker">` per person (name, institute, optional homepage link, talk title). Copy the template in the comment and delete the "TBA" row when the first speaker is added. The order on the page is the order in the file.

### 4.7 Participants

`participants.html` → `PARTICIPANTS`: a table with one row per person:

```html
<tr><th scope="row">Name</th><td>Institution</td><td>Postdoc</td></tr>
```

For a long list use the editor: **Page → Fill a table from a spreadsheet**. It puts the name, institution and position columns of the spreadsheet in the right places by itself.

- **Position:** write Faculty, Postdoc or Student. Longer words work too ("PhD student", "Assistant Professor", "Postdoctoral fellow"): the `data-rank` attribute of the `<table>` lists which words belong to which group.
- **Search and count:** above the table, a search box (name, institution or position) and a count such as "42 participants · 10 faculty · 12 postdocs · 20 students".
- **Sorting:** visitors click the arrow next to **Name** (by first name), **Institution** (everyone from the same institution together, then names alphabetically; "IIT Kanpur", "IIT, Kanpur" and "iit kanpur" count as one) or **Position** (faculty, postdocs, students). A second click reverses the order. A line separates the groups. The arrows come from `data-sort` on each `<th>` heading; until a visitor clicks, the order is the order in the file.
- **Trying it out:** 26 made-up example rows are in the file, visible only with `?preview` (<https://hepiitk.github.io/nsm2026/participants.html?preview>). Delete them once the real list is in.

### 4.8 Shortlisted posters and talks

`shortlisted.html` has two lists, `SHORTLISTED TALKS` and `SHORTLISTED POSTERS`. Each entry is one `<li class="entry">` with a number (T01, P01 …), title, authors, affiliations, an optional abstract link and the session. Wrap the presenting author in `<span class="presenter">…</span>` to underline the name.

### 4.9 The schedule

`schedule.html`: each day is a `<section class="day" id="day-N">` and each row an `<li class="slot slot--KIND">`, where the kind is `review`, `talk`, `poster`, `discussion`, `break` or `social`. The template with every field is in the comment "HOW THE TIMETABLE WORKS". Delete the "Sessions to be announced" row of a day once it has real rows. Each day's venue links to Google Maps.

To add a day, copy a whole day section, change its number, and add a link for it in the day links at the top. The example rows (`data-preview-only hidden`) are invisible to visitors: copy one, delete `data-preview-only hidden` and the Example badge, and edit it.

### 4.10 Slides and videos

1. Put the PDF in `assets/talks/` (for example `sen-day1.pdf`). Videos stay where they are hosted: you only need the link.
2. In `schedule.html` → `TALK MATERIALS`, copy the template into `<ul class="materials">`. Keep only the links that exist.

The Talk Materials section stays hidden while it has no real entries, so nothing empty ever shows. GitHub refuses single files larger than 100 MB, and recordings belong on a video site anyway: link to them.

### 4.11 Information page: venues, food, committee

- **Venues.** The Outreach Auditorium (1) and the New Lecture Hall Complex with L-18 (2) are highlighted on `assets/images/iitk-campus-plan.svg` (search `CONFERENCE VENUES` in that file). Their Google Maps links are in the "Conference location" card, in the caption of the plan and on each day of the schedule.
- **Food and coffee.** `FOOD AND COFFEE ON CAMPUS`, in three groups: the academic area (Café Coffee Day, Subway, Starbucks), the hostel canteens (a wide card, `place-card--feature`) and elsewhere on campus (CF ’98 Café, OAT, Zing Pizza & Café, the food court). Each place is one `<li class="place-card">` with, as needed, a photo, where it is, a line about it, opening hours and a Google Maps link (in Google Maps: **Share → Copy link**). Photos go in `assets/images/places/`.
- **Organising committee.** `ORGANISING COMMITTEE`: one `<li>` per person.

### 4.12 The home-page slideshow

Four photos of IIT Kanpur cross-fade every 6 seconds while each slowly drifts and zooms. In `index.html`, search for `PHOTO SLIDESHOW`. Each photo is one `<li class="slide">` with an image, its `alt` text (what it shows, for screen readers) and a caption.

- **Replace a photo:** save the new file in `assets/images/campus/` under the same name, or change `src="…"`.
- **Add or remove a photo:** copy or delete a `<li class="slide">` block. The dots update by themselves.
- **Very wide or tall photo:** add `data-fit="contain"` to its `<li>`. It is then shown whole, over a blurred copy of itself.
- **Speed:** `data-interval="6"` (seconds). **Look:** `--slide-ratio`, `--slide-fade`, `--slide-zoom` in `css/style.css`, section 9.1.

### 4.13 The Gallery

`gallery.html` → `PHOTOS`. The easiest way is the visual editor: **Page → Add photos to the gallery**. By hand: put each photo (at most about 2000 px wide) in `assets/images/gallery/` and a copy about 800 px wide, with the same name, in `assets/images/gallery/thumbs/`, then copy the template in the comment once per photo. The note "Photographs … will be posted here" disappears by itself once the first photo is in. Resize photos before uploading (for example with <https://squoosh.app>): the repository stays small and the page loads fast.

### 4.14 Sponsors

`index.html` → `04 · SPONSORS`. The section is hidden for now: delete the word `hidden` in its `<section>` tag to show it. Each sponsor is one `<li>`: logo, name, type, optional link. Logos go in `assets/images/sponsors/`.

### 4.15 Look and feel

- **Colours and fonts:** `css/style.css`, section 1. `--ember` is the accent colour, `--link` the link colour, `--paper` the background.
- **String animation:** size and position in `css/style.css`, section 4 (`--string-size`, `--string-shift-x`, `--string-shift-y`); speed and labels in the `CONFIG` block of `js/string-animation.js`.
- **Logo:** replace `assets/images/iitk-emblem.png` (header) and `assets/images/iitk-emblem-white.png` (footer) with files of the same names.

---

## 5. Publishing with GitHub Pages

The site is published from this repository by GitHub Pages:

- **Settings → Pages → Build and deployment → Source:** *Deploy from a branch*, branch **`main`** (or the branch you use), folder **`/ (root)`**.
- **Address:** <https://hepiitk.github.io/nsm2026/>. All links in the pages are relative, so the site works under `/nsm2026/` and would also work at a custom domain or on another host without changes.
- **Recommended:** add an empty file named `.nojekyll` at the top of the repository (**Add file → Create new file**, name it `.nojekyll`, commit). GitHub then publishes the files as they are, without running them through Jekyll, which makes deployments a little faster.

**If a change does not show:** check the **Actions** tab for a failed "pages build and deployment" run, then reload with `Ctrl`+`Shift`+`R`. GitHub Pages lets browsers keep pages for up to 10 minutes.

**If a photo or page is missing (404):** compare the file name in the repository with the name written in the HTML, letter by letter. Upper and lower case count.

**Custom domain (optional):** **Settings → Pages → Custom domain**. Nothing in the site needs to change.

---

## 6. Repository layout

```
index.html               Home: hero + string animation, IIT Kanpur photo slideshow, About,
                         news & dates, registration summary, sponsors (hidden for now)
registration.html        Registration: dates, form, how to register, fees
speakers.html            Speakers
shortlisted.html         Shortlisted Posters & Talks (two lists)
participants.html        Participants: table with search, sorting arrows and counts
schedule.html            Day-by-day timetable + Talk Materials (slides, videos)
venue-organizers.html    Information: venues, food and coffee, campus plan, getting here,
                         accommodation, organising committee, contact
gallery.html             Photo gallery (empty until photos are added)
edit.html                The visual editor (a tool for organisers)
README.md                This file

css/style.css            The whole design. Section 1 = colours and fonts
js/main.js               Mobile menu, empty sections, maths, preview mode, copy-on-click
                         e-mails, the participants search and sort
js/string-animation.js   The string animation on the home page
js/slideshow.js          The photo slideshow on the home page
js/gallery.js            The photo viewer of the Gallery page
js/editor.js             The visual editor (used only by edit.html)

assets/images/           NSM 2026 logo (favicon.svg + PNG copies), IIT Kanpur emblem, campus plan
assets/images/campus/    Photos for the home-page slideshow
assets/images/places/    Photos of the places to eat (Information page)
assets/images/gallery/   Gallery photos (+ thumbs/ with small copies for the grid)
assets/images/uploads/   Photos added with the editor
assets/images/sponsors/  Sponsor logos
assets/talks/            Slide PDFs
assets/docs/             Other downloads
assets/fonts/            EB Garamond, Newsreader, Instrument Sans, IBM Plex Mono (+ licences)
assets/vendor/katex/     KaTeX maths typesetting (do not edit)
```

---

## 7. Before announcing a change

- [ ] In the editor, **Site → Check the website** reports no problems.
- [ ] No `tba` marks left that should be filled (the check counts them per page).
- [ ] Dates agree on the Home, Registration and Schedule pages.
- [ ] Registration and map links tested on the live site.
- [ ] Photo captions checked and photo credits recorded (section 8).
- [ ] Checked on a phone.

---

## 8. Image sources and licences

Content © 2026 Department of Physics, IIT Kanpur. Third-party parts keep their own licences:

| File | Source | Licence / permission |
| --- | --- | --- |
| `assets/images/iitk-emblem.png`, `iitk-emblem-white.png` | IIT Kanpur emblem, from the website repository of the High Energy Physics group, IIT Kanpur ([hepiitk/website](https://github.com/hepiitk/website), `assets/favicon.png`). The dark version is the same artwork recoloured. | The emblem belongs to IIT Kanpur and is used for an official institute event. |
| `assets/images/iitk-campus-plan.svg` | Drawn for this site from OpenStreetMap data for the IIT Kanpur campus, as published in the open `ni5arga/iitk` campus-map project (October 2026). Venue highlights and legend added in October 2026. | © OpenStreetMap contributors, [ODbL](https://opendatacommons.org/licenses/odbl/). The credit on the plan and in its caption must stay. |
| `assets/images/campus/campus-1.jpg` … `campus-4.jpg` | Supplied by the organisers (October 2026). | **To complete:** photographer or source and licence of each photo. |
| `assets/images/uploads/images-2.jpeg` | Outreach Auditorium, supplied by the organisers (October 2026). | **To complete:** photographer or source, and permission. |
| `assets/images/places/*.jpg` | Places to eat on campus, supplied by the organisers (October 2026); scaled or cropped to a 4 : 3 shape. | **To complete:** photographer or source, and permission. |
| `assets/images/gallery/…` (when added) | Photos of the meeting. | **To complete:** photographer of each photo, and permission to publish it. |
| `assets/images/favicon.svg` (the NSM 2026 logo), `favicon-32.png`, `apple-touch-icon.png` | The NSM 2026 logo, made for this site (October 2026): a vibrating closed string around the letters NSM, drawn with the same vibration modes as the string animation. Letters in EB Garamond and IBM Plex Mono, converted to shapes. | © 2026 Department of Physics, IIT Kanpur. |
| Fonts | EB Garamond, Newsreader, Instrument Sans, IBM Plex Mono | SIL Open Font License 1.1 (`assets/fonts/LICENSE-*.txt`) |
| KaTeX 0.16.11 | <https://katex.org> | MIT (`assets/vendor/katex/LICENSE.txt`) |

---

## 9. Accessibility and browsers

Every page has a skip link, one main heading, labelled sections, visible keyboard focus, text contrast at WCAG AA, no colour-only cues and alt text on images. The pages were checked with axe-core at desktop and phone widths. Every internal link and button was click-tested, and all links open in the same tab. Visitors who ask their system for reduced motion get still pages: the string animation stops, and the slideshow changes photos with a plain cross-fade, without drift or zoom. The site works in current Chrome, Edge, Firefox and Safari, on desktop and phone.

Questions about the meeting: see the [Contact section](https://hepiitk.github.io/nsm2026/venue-organizers.html#contact) of the Information page.
