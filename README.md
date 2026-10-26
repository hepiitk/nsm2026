# National Strings Meeting 2026 · IIT Kanpur — website

Eight static pages for the National Strings Meeting 2026, hosted by the Department of Physics, IIT Kanpur. Plain HTML, one stylesheet and four small scripts. There is no build step, no database, no server-side code and no framework. Everything the pages need is in this folder, including fonts, maths typesetting and images.

**Editing:** the site has its own visual editor (section 3). Click any text and type, copy or move blocks, change photos and links, add pages, then save. Every page and file can also be edited by hand (sections 3b and 4).

```
index.html               Home: hero + string animation, IIT Kanpur photo slideshow, About,
                         news & dates, registration summary, sponsors (hidden for now)
registration.html        Registration (one step): dates, form, how to register, fees
speakers.html            Speakers
shortlisted.html         Shortlisted Posters & Talks (two separate lists)
participants.html        List of participants (a table with a search box)
schedule.html            Day-by-day timetable + Talk Materials (slides, videos)
venue-organizers.html    Information: venue, getting here, accommodation, organising committee, contact
gallery.html             Photo gallery of the meeting (empty until photos are added)
edit.html                The visual editor (a tool for you; not needed on the server)

css/style.css            The whole design. Section 1 = colours and fonts, section 4 = string animation
js/main.js               Mobile menu, hiding empty sections and missing photos, maths, preview mode,
                         click-to-copy e-mails, the participants search box
js/string-animation.js   The string animation (speed and labels in its CONFIG block)
js/slideshow.js          The photo slideshow on the home page
js/gallery.js            The photo viewer of the Gallery page
js/editor.js             The visual editor (used only by edit.html and the preview file)

assets/images/           Emblem, campus plan (Information page), favicon
assets/images/campus/    Photos for the home-page slideshow
assets/images/sponsors/  Sponsor logos
assets/images/gallery/   Gallery photos (+ thumbs/ with small copies for the grid)
assets/images/uploads/   Photos added with the editor (created when needed)
assets/images/places/    Photos of the cafés on campus (Information page)
assets/talks/            Slide PDFs              assets/docs/             Other downloads
assets/fonts/            EB Garamond, Newsreader, Instrument Sans, IBM Plex Mono (+ licences)
assets/vendor/katex/     KaTeX maths typesetting (do not edit)
```

The page called **Information** in the menu is the file `venue-organizers.html`. The file name was kept when the page was renamed, so links that were already shared still work.

---

## 1. Preview on your computer

Double-click `index.html`. Everything works offline.

To see the example entries hidden from visitors (sample timetable rows and Talk Materials), add `?preview` to the address, for example `schedule.html?preview`. A banner at the bottom confirms preview mode.

---

## 2. Put it online at IIT Kanpur

The site is plain files with relative links, so it works from any folder: `https://home.iitk.ac.in/~userid/`, `https://home.iitk.ac.in/~userid/nsm2026/`, or a department address. The steps below follow the Computer Centre page <https://home.iitk.ac.in/hosting/>.

1. **Get a web directory.** Request a homepage directory from the Computer Centre (the hosting page names Mr. Prajwal Bajpai, prajwalb@iitk.ac.in). For a department or event address, ask the Physics department web administrator or the CC help desk (CC-101, phone 7239, helpdesk[AT]iitk.ac.in). Files live in `/www/<user-id>/www` and appear at `https://home.iitk.ac.in/~<user-id>`.
2. **Upload from the campus network** (the CC page requires the campus LAN).
   - **Windows:** WinSCP, protocol SFTP, host `webhome.cc.iitk.ac.in`, your CC user-id and password. Create a folder (e.g. `nsm2026`) and drag the *contents* of this folder into it.
   - **Linux / macOS:**
     ```bash
     cd nsm2026-iitk
     sftp <user-id>@webhome.cc.iitk.ac.in
     mkdir nsm2026
     cd nsm2026
     put *.html
     mkdir css
     mkdir js
     mkdir assets
     put -r css
     put -r js
     put -r assets
     bye
     ```
3. **Check it** at `https://home.iitk.ac.in/~<user-id>/nsm2026/`. If you see "403 Forbidden", log in with `ssh <user-id>@webhome.cc.iitk.ac.in` and run `chmod -R u=rwX,go=rX nsm2026`.
4. **Updating one page later:** upload just that file again (e.g. `put schedule.html`), plus any new photos the editor stored in `assets/images/gallery/` (with its `thumbs/` folder) or `assets/images/uploads/`. If an old version still shows, reload with `Ctrl+Shift+R`.

`edit.html` and `js/editor.js` are only for you. Uploading them does no harm (they cannot change anything on the server), but they are not needed there.

**The Computer Centre e-mail.** The mandatory conditions from the CC e-mail were not included in the brief (it still had the placeholder), so the site follows the public hosting page and makes conservative choices that suit any static host:

- static files only: no PHP, CGI, database, `.htaccess` or server configuration;
- no runtime requests to other sites: no CDNs, web fonts, trackers, embeds or iframes. The only outside addresses are ordinary links;
- relative links, lower-case file names without spaces, `index.html` as the entry page;
- about 2 MB in total.

When you have the e-mail, check its conditions against this list. If one conflicts, compatibility wins. For example, if JavaScript were disallowed, the pages still work: only the animation, the slideshow controls, the mobile menu toggle and maths typesetting need it (the first photo still shows).

---

## 3. Edit visually (no code needed)

The visual editor shows the pages exactly as visitors see them. You change them in place, and it writes clean HTML back into the same files.

**Start it**

- **From the preview file** (`nsm2026-website-preview.html`, which contains the whole website): open it and press **Edit this page**. Inside a chat preview, downloads can be blocked and changes are lost when the preview closes. Download the preview file and open it in Chrome, Edge or Firefox to save your work, or use **Save → Copy changes as text** and paste the text to Claude (attach any new photos as well: the text lists them by name only).
- **On your computer:** double-click `edit.html` in the website folder and choose that folder (the one that contains `index.html`). In Chrome and Edge, **Save** writes the changes straight into the folder; in other browsers it downloads the edited website as a .zip.

**What you can do**

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
| Add photos to the Gallery | On the Gallery page: **Page → Add photos to the gallery**, and pick many photos at once. Each is scaled to web size, gets a small copy for the grid, and a caption you can change by clicking it. Select a photo to move it, replace it or delete it. |
| Tables | Click a cell, then **＋**: a new row, a new column after that cell, or delete that cell's column. |
| Fill a long table at once (participants) | **Page → Fill a table from a spreadsheet**. In Excel or Google Sheets (for example the responses of the registration form), select and copy the rows, paste them, and choose which column goes where. Repeated rows can be left out and the list sorted by surname. You can also open a .csv file. Undo brings the old rows back. |
| Change where a link goes | Click the link (or select a button) and press the link button. You can also upload a PDF and link to it. Every link of the site opens in the same tab. |
| Edit the HTML of anything | `</>` in the block toolbar (one block), **Page → Edit this page's HTML**, or **Site → Files and code** (any file: CSS, JavaScript, README; add, replace or delete files). |
| Page title and description | **Page → Title and description**. |
| Add or remove a page | **Page → Add a page** (it can be added to the menu and footer of every page) or **Remove this page**. |
| Change some text everywhere | **Site → Find and replace** (every page, and optionally titles and image descriptions). |
| Check for mistakes | **Site → Check the website**: links that go nowhere or to the wrong place (for example a "Day 5" link going to Day 4), two links to the same place, empty headings, cells or paragraphs, missing images or descriptions, dates whose text does not match the date given to search engines, and the "to be announced" marks left. **Show** jumps to each one. |
| Short notes | **＋ → Note (confirmed information)** for a highlighted note; **"To be announced" note** for something still unknown. |
| Colours and fonts | **Site → Colours and fonts** (the settings at the top of `css/style.css`). |
| Header and footer | Edit them on any page; every page follows. (Switch this off in the **Site** menu.) |
| Undo / redo | `Ctrl`+`Z` / `Ctrl`+`Shift`+`Z`, as many steps as you like. |
| Save | **Save**: into the website folder (Chrome, Edge), the whole website as a .zip, only the changed files as a .zip, this page, or your changes as text. |

Saving also sets the "Last updated" date in the footer of every page to today. Unsaved changes are kept in the browser and offered back when you open the editor again (not inside chat previews). Pages written by the editor keep their comments, line breaks and templates, and a page you did not change is saved exactly as it was. Press **?** in the editor for the full help.

---

## 3b. Editing the HTML by hand: the basics

Open the `.html` files in any plain-text editor (VS Code, Notepad++, Gedit; not Word). Every section starts with a large comment like this:

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
| `<span class="tba">To be announced</span>` | a small dashed orange label | the confirmed text, e.g. `14–19 December 2026` |
| `<p class="tba-note">…</p>` | a dashed orange note | a normal paragraph `<p>…</p>` |

Search all `.html` files for `tba` to find every remaining one.

**Header and footer** appear on every page. In the visual editor, change them once and every page follows. By hand, change a menu item, the office phone or a footer link in every `.html` file (most editors have "Find in files").

**Maths** works anywhere in the text: `$\mathcal{N}=4$` inline, `$$ … $$` on its own line.

---

## 4. Recipes (by hand)

Each of these is also a few clicks in the visual editor (section 3).

### 4.1 Dates and venues
The meeting dates (15–19 December 2026) appear in several places; if they change, update all of them (the editor's **Site → Find and replace** does it in one go):

- `index.html`: the hero facts (`KEY FACTS`), the "At a glance" card, `IMPORTANT DATES`, the registration summary card, the page description in `<head>`, and the `EVENT DETAILS FOR SEARCH ENGINES` block in `<head>` (the `startDate` and `endDate` lines, written as 2026-12-15);
- `registration.html`: the status box;
- `schedule.html`: the introduction, the day links at the top and the date line of each day;
- `venue-organizers.html`: the page description.

Known dates are written `<time datetime="2026-11-20">20 Nov 2026</time>`: the visible text for people and the `datetime` (year-month-day) for search engines and calendars. Change both together. While a date is unknown, write `<span class="tba">TBA</span>` instead of a `<time>`. The editor does this for you, and **Site → Check the website** flags a date whose text and `datetime` disagree.

The two halls (Outreach Auditorium and Lecture Hall 18, L-18) are named in the "At a glance" card, on the Information page (note, photos and "Conference location" card) and in the date line of each day of the schedule.

### 4.2 Change a link
A link is `<a href="ADDRESS">visible text</a>`. Change the part between the quotes. All links open in the same tab, so do not add `target="_blank"`. Pages of this site are written as `schedule.html`, a section as `schedule.html#day-2`, other sites as full `https://…` addresses, and e-mails as `mailto:name@iitk.ac.in`.

### 4.3 The registration form
Registration is a single step, on `registration.html`. When the form is ready, put its link in the "Form" row (replacing `<span class="tba">Link to be added</span>`) and replace the comment `BUTTON GOES HERE` with

```html
<a class="btn btn--primary" href="https://YOUR-FORM-LINK">Open the registration form</a>
```
When registration closes, change the status line. The home page has a summary card in the "03 · REGISTRATION" section and an announcement under "News"; keep them in step.

### 4.3b E-mail addresses that copy on a click
On the Information page (`CONTACT`), each address is written as

```html
<li><a class="copy-email" href="mailto:name@iitk.ac.in">name@iitk.ac.in</a></li>
```
A click copies the address and shows "Copied ✓" (js/main.js, section 7). Without JavaScript the link opens the e-mail program instead. The class `copy-email` works on any e-mail link of the site.

### 4.4 Add an announcement
`index.html` → `ANNOUNCEMENTS`: copy the template in the comment and put the newest first.

### 4.5 Add a speaker
`speakers.html` → `SPEAKERS`: one `<li class="speaker">` per person (name, institute, optional homepage link, talk title). Copy the template in the comment and delete one "TBA" row for each speaker you add. The order on the page is the order in the file.

### 4.5a The list of participants
`participants.html` → `PARTICIPANTS`: a table with one row per person, `<tr><th scope="row">Name</th><td>Institution</td><td>Postdoc</td></tr>`. For a long list use the editor: **Page → Fill a table from a spreadsheet** (section 3); it puts a "Position" column of the spreadsheet into the Position column by itself.

- **Position:** write Faculty, Postdoc or Student. Longer words work too ("PhD student", "Assistant Professor", "Postdoctoral fellow"): the `data-rank` attribute of the `<table>` lists which words belong to which group (faculty | postdoc | student), and that order is used for sorting and counting.
- **Above the table** visitors get a search box (name, institution or position), a **Sort by** menu and a count such as "42 participants · 10 faculty · 12 postdocs · 20 students". The menu offers: List order (the order in the file, the default), Name (alphabetical by first name), Institution (everyone from the same institution together, institutions and then names alphabetical; "IIT Kanpur", "IIT, Kanpur" and "iit kanpur" count as one) and Position (faculty, then postdocs, then students). A line separates the groups.
- To add another column, click a cell in the editor and use **＋ → A new column after the clicked cell**.

### 4.5b Shortlisted posters and talks
`shortlisted.html` has two separate lists, `SHORTLISTED TALKS` and `SHORTLISTED POSTERS`. Each entry is one `<li class="entry">` with a number (T01, P01 …), title, authors, affiliations, an optional abstract link and the session. Wrap the presenting author in `<span class="presenter">…</span>` to underline the name. Copy the template in each comment and delete the "TBA" rows as real entries arrive.

### 4.6 Add, remove or reorder sponsors
`index.html` → `04 · SPONSORS`. Each sponsor is one `<li>`: logo, name, type, optional link. The order on the page is the order in the file. Logos go in `assets/images/sponsors/` (transparent PNG or SVG, about 400 px wide). Delete the "Sponsor TBA" tiles as real ones are added.

### 4.7 Update the schedule
`schedule.html`: each day is a `<section class="day" id="day-N">` and each row an `<li class="slot slot--KIND">`, where the kind is `review`, `talk`, `poster`, `discussion`, `break` or `social`. The template with every field is in the comment "HOW THE TIMETABLE WORKS". Delete the "Sessions to be announced" row of a day once it has real rows. To add a day, copy a whole day section, change its number, and add a link for it in the day links at the top. The example rows (`data-preview-only hidden`) are invisible to visitors: copy one, delete `data-preview-only hidden` and the Example badge, and edit it.

### 4.8 Attach slides or a video
1. Put the PDF in `assets/talks/` (e.g. `sen-day1.pdf`). Videos stay where they are hosted: you only need the link.
2. In `schedule.html` → `TALK MATERIALS`, copy the template into `<ul class="materials">`. Keep only the links that exist: `res-link--slides`, `res-link--video` or `res-link--other`.
3. Optionally add the same links under the talk's row in the timetable (the `<ul class="slot__res">` lines in the template).

The Talk Materials section stays hidden while it has no real entries, so nothing empty ever shows. To remove a resource, delete its `<li class="material">`. To hide the whole section even with entries, add `hidden` to its `<section …>` tag.

### 4.9 Organising committee
`venue-organizers.html` → `ORGANISING COMMITTEE`: one `<li>` per person (template in the comment). Delete the TBA lines.

### 4.9b Food and coffee on campus
`venue-organizers.html` → `FOOD AND COFFEE ON CAMPUS`, in the Venue section, in three groups: "In the academic area" (Café Coffee Day, Subway, Starbucks), "In the hostels" (the hostel canteens, a wide highlighted card, `place-card place-card--feature`, with the photo beside the text) and "Elsewhere on campus" (CF ’98 Café at VH-1, the eateries at OAT, Zing Pizza & Café, the residential-area food court). Opening hours are those supplied by the organisers in October 2026; the introduction says that they can differ on some days and during the winter break. Each place is one `<li class="place-card">` with, as needed, a photo, where it is, its name, one line, opening hours and a Google Maps link (in Google Maps: **Share → Copy link**). A card without a photo simply leaves out the `<img>`. Copy the template in the comment to add a place. Photos go in `assets/images/places/`. In the visual editor, select a card and use **Duplicate**, then double-click the photo to replace it.

### 4.9c The two venues on the campus plan and on maps
The Outreach Auditorium (1) and the New Lecture Hall Complex with L-18 (2) are highlighted on `assets/images/iitk-campus-plan.svg` (search `CONFERENCE VENUES` in that file; the legend follows it). Their Google Maps links are in the "Conference location" card, in the caption of the plan, and on the venue of each day of the schedule. If a venue changes, update these places and the "At a glance" card on the home page.

### 4.10 The photo slideshow (home page)
The four photos of IIT Kanpur change every 6 seconds: a soft cross-fade while each photo slowly drifts and zooms, its caption rising in, and the active dot filling up as time runs. Visitors can use the arrows, the dots, a swipe or the arrow keys, and the pause button. It does not stop under the mouse (so it never looks stuck); it waits off screen, in background tabs and while keyboard focus is on its buttons. Visitors who prefer reduced motion get the cross-fade without drift and zoom. The campus map is only on the Information page.

In `index.html`, search for `PHOTO SLIDESHOW`. Each photo is one `<li class="slide">` with an image, its `alt` text (what it shows, for screen readers) and a caption.
- **Replace a photo:** save the new file in `assets/images/campus/` under the same name, or change `src="…"`.
- **Add a photo:** copy a `<li class="slide">` block. **Remove one:** delete its block. The dots update by themselves.
- **Very wide or tall photo:** add `data-fit="contain"` to its `<li>`, as for the lecture-hall panorama. It is then shown whole, over a blurred copy of itself.
- **Speed:** `data-interval="6"` (seconds). **Shape, fade and drift:** `--slide-ratio`, `--slide-fade`, `--slide-zoom` and the `--kb-x` / `--kb-y` pairs (direction of each photo's drift) in `css/style.css`, section 9.1.

The supplied photos are 549 to 1200 px wide. Larger originals (about 2000 px wide) will look sharper on big screens. Resize and compress them with <https://squoosh.app> (runs in the browser) before uploading.

### 4.10b The Gallery page
`gallery.html` → `PHOTOS`. The easiest way is the visual editor (section 3): **Page → Add photos to the gallery**.

By hand: put each photo (about 2000 px wide at most) in `assets/images/gallery/` and a copy about 800 px wide, with the same name, in `assets/images/gallery/thumbs/`. Then copy the template in the comment into `<ul class="gallery" data-gallery>`, once per photo: the link (`href`) points to the large photo, the image (`src`) to the small copy, and `alt` says what the photo shows. Without a small copy, use the same file in both places.

- The note "Photographs from the meeting will be posted here after the meeting" disappears by itself once the first photo is in.
- A click on a photo opens it large; visitors move through the photos with the arrows, the arrow keys or a swipe, and close it with Esc.
- **Groups** (e.g. one per day): copy the whole `<section … id="photos">` block, change its heading and give it a new `id`.
- **Tile size and shape:** `--tile-min` and `--tile-ratio` in `css/style.css`, section 12b.

### 4.11 Replace the institute logo
The header uses `assets/images/iitk-emblem.png` (dark, for light backgrounds), and the footer uses `assets/images/iitk-emblem-white.png`. Replace either file with one of the same name, ideally square and transparent. The size on the page is set in `css/style.css` (`.brand img` and `.footer__brand img`).

### 4.12 The string animation
- **Where:** `index.html`, the `<figure class="string-figure …">` in the hero (search `STRING ANIMATION`).
- **Size and position:** `css/style.css` section 4: `--string-size` (e.g. `min(600px, 46vw)`), `--string-shift-x` and `--string-shift-y` to nudge it, `--string-fade` for the soft edge.
- **Colours:** the `--string-…` variables in the same section. Add `string-figure--night` to the figure's class for the original dark version.
- **Speed, labels, marks:** the `CONFIG` block at the top of `js/string-animation.js`.
- It pauses off screen and in background tabs, and stays still for visitors who prefer reduced motion.
- The fixed "σ" arc that used to cross the top of the tube was removed (October 2026), because it did not move with the rings. The τ arrow beside the tube stays: it is a fixed axis on purpose.

### 4.13 Colours and fonts
`css/style.css` section 1. `--ember` is the accent colour, `--link` the link colour, and `--paper` the background. Headings use `--font-display` (EB Garamond); to try another heading font, add its `.woff2` file to `assets/fonts/`, add an `@font-face` rule next to the others, and put its name first in `--font-display`.

---

## 5. Before announcing the site

- [ ] In the editor, **Site → Check the website** reports no problems.
- [ ] No `tba` marks left that should be filled (the check counts them per page).
- [ ] Photo captions checked and photo credits recorded (section 6).
- [ ] Contact e-mails and phone on the Information page, and the office phone in the footer, checked.
- [ ] Registration links tested.
- [ ] "Last updated" date in the footer (the editor sets it to the day you save).
- [ ] Checked on a phone.

---

## 6. Image sources and licences

| File | Source | Licence / permission |
| --- | --- | --- |
| `assets/images/iitk-emblem.png`, `iitk-emblem-white.png` | IIT Kanpur emblem, taken from the website repository of the High Energy Physics group, Department of Physics, IIT Kanpur (github.com/hepiitk/website, `assets/favicon.png`, white on transparent). The dark version is the same artwork recoloured. | The emblem belongs to IIT Kanpur. It is used here for an official institute event. The institute's own copy is at `https://www.iitk.ac.in/data/IITK.png`, which could not be downloaded from the build environment. Swap it in if preferred (4.11). |
| `assets/images/iitk-campus-plan.svg` (Information page) | Drawn for this site from OpenStreetMap data for the IIT Kanpur campus (boundary, buildings, roads, land use, landmarks), as published in the open `ni5arga/iitk` campus-map project, retrieved October 2026. The two conference venues and the legend were added in October 2026. | © OpenStreetMap contributors, Open Database Licence (ODbL). The credit printed on the plan and in its caption must stay. |
| `assets/images/campus/campus-1.jpg` … `campus-4.jpg` (home-page slideshow) | Supplied by the organisers (October 2026). | **To complete:** photographer or source and licence of each photo. If a photo comes from Wikimedia Commons or the institute's website, credit it as its licence requires (e.g. add "Photo: Name, CC BY-SA 4.0" to the caption). |
| `assets/images/uploads/images-2.jpeg` (Information page) | Photo of the Outreach Auditorium, supplied by the organisers (October 2026). | **To complete:** photographer or source, and licence or permission. |
| `assets/images/places/cafe-coffee-day.jpg`, `subway.jpg`, `starbucks.jpg`, `cf98-cafe.jpg`, `oat-eateries.jpg`, `zing-pizza.jpg`, `food-court.jpg`, `hostel.jpg` (Information page) | Photos of the places to eat on campus, supplied by the organisers (October 2026); scaled or cropped to a 4 : 3 shape. | **To complete:** photographer or source, and permission. |
| `assets/images/gallery/…` (Gallery page, when added) | Photos of the meeting. | **To complete:** photographer of each photo, and permission to publish it. Ask participants before publishing photos in which they can be recognised, if the institute requires it. |
| `assets/images/favicon.svg` | Made for this site. | Free to use. |
| Fonts | EB Garamond (headings), Newsreader (text), Instrument Sans (menus, buttons), IBM Plex Mono (labels) | SIL Open Font License 1.1 (`assets/fonts/LICENSE-*.txt`) |
| KaTeX 0.16.11 | <https://katex.org> | MIT (`assets/vendor/katex/LICENSE.txt`) |

---

## 7. Accessibility and browsers

The site has a skip link, one `h1` per page, labelled sections, visible keyboard focus, text contrast at WCAG AA, no colour-only cues, and alt text on images. All motion stops for visitors who prefer reduced motion. The pages were checked with axe-core at desktop and phone widths, and they work in current Chrome, Edge, Firefox and Safari.
