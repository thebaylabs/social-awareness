# ak_outreach — Digital Outreach

A static, mobile-first website with an intro page and two audience sections,
**Bhulkao** (younger children) and **Yuvako** (youth). Each section has games,
an interactive story (called a scenario in Yuvako) and a prasang, in English and
Gujarati.

- Live preview: <https://social-awareness-hp.vercel.app/>
- Build plan: [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) (the owner-amended version)

> **Everything on the site is placeholder content.** It is marked as such on
> every page and will be replaced with final content from the content owners.
> Gujarati text is an unreviewed draft.

## Contents

1. [What is built](#what-is-built)
2. [Run it on your computer](#run-it-on-your-computer)
3. [How to edit content (no coding needed)](#how-to-edit-content-no-coding-needed)
4. [Open questions](#open-questions)
5. [Launch blockers](#launch-blockers)
6. [Where this build departs from the plan](#where-this-build-departs-from-the-plan)
7. [Known gaps and follow-ups](#known-gaps-and-follow-ups)
8. [For developers](#for-developers)
9. [Hosting](#hosting)

## What is built

| Page                                                                      | Address                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| Intro                                                                     | `/`                                             |
| Section home (three cards)                                                | `/bhulkao`, `/yuvako`                           |
| Games list                                                                | `/bhulkao/activity`, `/yuvako/activity`         |
| Doodle catcher (Bhulkao)                                                  | `/bhulkao/activity/doodle`                      |
| Pill game (Yuvako)                                                        | `/yuvako/activity/pills`                        |
| Word game "Shabd Khoj" (Yuvako)                                           | `/yuvako/activity/words`                        |
| Story / scenario list (goes straight to the item while there is only one) | `/bhulkao/story`, `/yuvako/scenario`            |
| Story / scenario player                                                   | `/bhulkao/story/<id>`, `/yuvako/scenario/<id>`  |
| Prasang list (same rule)                                                  | `/bhulkao/prasang`, `/yuvako/prasang`           |
| Prasang reader                                                            | `/bhulkao/prasang/<id>`, `/yuvako/prasang/<id>` |
| Not found                                                                 | any other address                               |

Every game, story and prasang is at most three taps from the intro page.

- **Languages**: a switch in the header (English, ગુજરાતી). The first
  visit follows the browser's language; after that the choice is remembered.
- **Placeholder marking**: a striped "Placeholder content" banner on every
  placeholder story, prasang, game and word-game result; "Placeholder" badges
  on cards and inside pictures; titles that start with "Placeholder:"; and a
  thin "This site is a preview" strip under the header while any placeholder
  content remains. The strip disappears by itself once nothing is marked
  placeholder.
- **Privacy and safety**: no cookies and no requests to any other website
  (fonts are bundled), except Firestore for the doodle leaderboard once
  Firebase is set up. The Vercel deployment counts page views with Vercel Web
  Analytics, which runs through the site's own domain and sets no cookies (see
  Hosting). The only free-text input in Bhulkao is the doodle
  player's name: a first name or nickname, letters only, up to 12 letters,
  with a basic rude-word filter. It is shown on that day's leaderboard. The
  browser's local storage keeps only the language choice, today's word-game
  guesses, the doodle best score and the doodle player's name. Every link that
  leaves the site first shows "You are leaving this site".
- **Accessibility**: works by keyboard, skip link, visible focus, one main
  heading per page, colour is never the only signal (ticks, dots, dashes,
  shapes and text), reduced-motion support, and tap targets of 56px in
  Bhulkao and 44px in Yuvako. Checked automatically with axe.

## Run it on your computer

You need [Node.js](https://nodejs.org/) (the version in `.nvmrc`, currently 26).

```sh
npm install
npm run dev        # open the address it prints, e.g. http://localhost:5173
```

## How to edit content (no coding needed)

All text, stories, prasangs, words, game items and pictures live in two folders
at the top of the repository: **`content/`** and **`locales/`**. You never need
to open `src/`.

### The easiest way: edit on GitHub

1. Open the repository on github.com and go to the file you want to change
   (for example `content/words.json`).
2. Click the pencil icon ("Edit this file"). To add a new file, open the folder
   and choose **Add file → Create new file** (or **Upload files** for pictures).
3. Make your change, then click **Commit changes…**. Choose **Create a new
   branch** and open a pull request, so someone can review it.
4. GitHub checks the content automatically. A green tick means it is valid. A
   red cross means something needs fixing: click **Details**, open the
   "validate" step, and it lists the file and the problem in plain words.
5. Once the change is merged into `main`, the live site updates by itself
   within a few minutes.

On your own computer you can run the same check with `npm run validate`.

### Rules that apply everywhere

- **Every visitor-facing text has two languages**, written like this:
  `{ "en": "Hello", "gu": "નમસ્તે" }`. English is required. If
  Gujarati is missing, English is shown instead and the check lists
  what is missing.
- **`"placeholder": true`** marks an item as placeholder. Change it to
  `false` when the final, approved content is in place; its placeholder
  banner and badges then disappear.
- **Ids** (used in web addresses) use lowercase letters, digits and hyphens
  only, for example `homework-time`.
- **JSON files** need exact punctuation: double quotes, commas between items,
  no comma after the last item. If the check says "not valid JSON", look for a
  missing or extra comma near the line it names.

### Add or change a story (or scenario)

Stories are in `content/stories/`, one file per story.

1. Copy an existing story file (for example `homework-time.json`) and rename
   the copy, for example `kind-words.json`.
2. Change `"id"` to match (`"kind-words"`) and set `"audience"` to
   `"bhulkao"` or `"yuvako"`.
3. Change `"title"`. Set `"startNode"` to the id of the first step.
4. Each step in `"nodes"` has an `"id"`, its `"text"`, an optional `"image"`,
   and **either** `"choices"` **or** an `"ending"`:
   - `"choices"`: a list of `{ "label": {…}, "next": "<id of the step it leads to>" }`
   - `"ending"`: `{ "outcome": {…}, "lesson": {…} }`. The lesson is shown in
     the highlighted box.
5. Aim for three to five steps from the start to each ending. The check warns
   (but does not fail) if a path is shorter or longer, and fails if a choice
   points to a step that does not exist or a step can never reach an ending.
6. A picture is `"image": { "src": "file-name.svg", "alt": {…}, "source": "where it comes from" }`.
   Put the file in `content/images/`. `alt` describes the picture for people
   who cannot see it; `source` records who made it or where it is licensed
   from. Both are required.

The story appears at `/bhulkao/story/<id>` or `/yuvako/scenario/<id>`. When a
section has more than one story, a list page appears automatically.

### Add or change a prasang

Prasangs are in `content/prasangs/`, **one file per language**, named
`<id>.<language>.md`, for example `honest-shopkeeper.en.md` and
`honest-shopkeeper.gu.md`.

1. Copy an existing English file and rename it. Each file starts with a block
   between two `---` lines:

   ```yaml
   ---
   id: honest-shopkeeper
   audience: yuvako
   placeholder: false
   title: 'The Honest Shopkeeper'
   moral: 'What would you do if nobody would ever find out?'
   images:
     - src: shopkeeper.svg
       source: Drawn by … for this project
       alt: 'A shopkeeper handing back extra change.'
     - src: market.svg
       source: Licensed from …
   ---
   ```

   - `moral` is shown in the box at the end, under "What we learn" (Bhulkao)
     or "Reflect" (Yuvako, where it reads best as a question).
   - The first picture in `images` is the cover, shown under the title, and
     needs an `alt` line.
   - Put quotes around any text that contains a colon (`:`).

2. Below the second `---`, write the story. Leave an empty line between
   paragraphs. To place a picture in the text, write
   `![what the picture shows](market.svg)`. Every picture used in the text
   must also be listed under `images` with its source.
3. **To translate**, copy the English file, change only the language part of
   the name (`.gu.md`) and translate the title, moral, alt text
   and story. Keep `id`, `audience`, `placeholder` and the picture files and
   sources the same in every language (the check fails if they differ). If a
   language file is missing, the English one is shown with a short note.

### Add or change a word for the word game

Words are in `content/words.json`:

```json
{
  "word": "seva",
  "native": { "gu": "સેવા" },
  "meaning": { "en": "…", "gu": "…" },
  "reflection": { "en": "…", "gu": "…" },
  "placeholder": false
}
```

- `word` is played in English letters: lowercase a–z only, 3 to 10 letters.
- `native` is the word in Gujarati script, shown on the result
  screen.
- The word of the day is chosen from the list by date (day number modulo the
  number of words), so adding or removing words changes which word falls on
  which day. Add new words at the end of the list.

### Add or change a doodle-catcher item

Items are in `content/doodle-items.json`, under `"items"`:

```json
{ "label": {…}, "kind": "positive", "icon": "book", "placeholder": false }
{ "label": {…}, "kind": "negative", "icon": "phone", "explanation": {…}, "placeholder": false }
```

- `kind` is `positive` (good habit, round and green: catch it) or
  `negative` (distraction, spiky and orange: dodge it).
- A negative item needs an `explanation`: one short sentence shown when it
  ends the game.
- `icon` is one of: book, moon, family, ball, hands, heart, pencil, tree, sun,
  phone, bell, loop, clock, screen, controller. Any other name shows a star
  and the check warns.
- Keep labels short (one or two words): they are drawn under the falling item.

The `"config"` block tunes the game: `startSpeed` and `maxSpeed` (how fast items
fall, in play-area pixels per second; the play area is 360 wide),
`speedPerPoint` (how much faster for each good habit caught), `spawnInterval`
(seconds between items) and `negativeShare` (share of distractions, from 0 to
1; currently 0.7).

### Doodle leaderboard

Before each game the player types a name. When the game ends, the score is
saved and the game-over screen shows today's top three names and how many
different names played today. Each name keeps only its best score for the
day; "Riya" and "riya" count as the same player. "Today" is the player's local
date.

Scores are stored in Firebase Firestore, at
`doodleLeaderboard/<YYYY-MM-DD>/players/<name>`. To connect a Firebase project:

1. In the Firebase console, create a Firestore database and a web app.
2. Publish the rules in `firestore.rules` (Firestore → Rules, or
   `firebase deploy --only firestore:rules`). They let visitors save only a
   valid name and a higher score for it, and lock everything else.
3. For your computer, copy `.env.example` to `.env.local` and fill in the web
   app's settings.
4. For the live site, add the same four values as repository variables
   (Settings → Secrets and variables → Actions → Variables):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`.

Without these settings, the dev server keeps scores in memory until the page
is reloaded, and a production build shows "The leaderboard is not set up yet".
Scores are reported by the browser, so a technically skilled visitor could
submit a false one; preventing that fully would need a server.

### Change the pill game

The red cards, the guide's line for the blue pill and the green pill pages
are in `content/pills.json`.

- The flow: on the landing screen a cartoon guide (an original drawing) holds
  out the red and blue pills, and asks which one you will take. The pills in
  his hands are the buttons; each shows its name and hint on hover or keyboard
  focus, and always on touch screens. After the last red card it returns to
  the landing screen. Choosing the blue pill keeps you on the same screen: the
  guide grins, tosses the blue pill away, and a green pill comes down into his
  hand, so the choice becomes **Red pill** or **Green pill**. The green pill opens two or three solution pages, ending
  with **Exit**, which returns to the landing screen. Start over works from
  every red card and green page; there is no way back to the blue pill once
  it is tossed.
- `"blue"`: `message`, the guide's speech bubble as he tosses the blue pill.
  Keep it short (it must fit a phone screen) and light-hearted.
- `"green"`: `pages` (two or three). Each page has `title`, `text`, `action`
  ("What you can do"), `why` ("Why it helps"), an optional `visual`, and a
  `source` (plus `moreSources`) written like the red cards' sources below.
- Red cards (`"path": "red"`) are shown one at a time. A finished red card
  (`"placeholder": false`) needs: `title`, `text` (the main point),
  `visual`, `takeaway`, `audienceImpacts` (`children` and `adults`),
  `recommendation` ("What can help?") and a `source`. The takeaway and the
  recommendation are shown together in one box.
- Red cards and green pages cite their references in the same way.
- **References are IEEE style.** A source is
  `{ "citation": "…", "url": "https://…" }`. Write the citation as IEEE
  does, for example `Organisation, "Title," Publisher, City, Country, 2023.`
  or `A. Author and B. Author, "Title," Journal, vol. 9, Feb. 2019, doi: …`
  (use `n.d.` when no date is known); the page adds "[Online]. Available:
  <url>". Give `source` first, then any `moreSources`. Cite them in the
  card's texts as `[1]`, `[2]`… by that order, at the claim they support, in
  every language (a test checks that every reference is cited and every
  marker has a reference). Only state what the source says, and use careful
  wording ("is associated with", "may contribute to").
- The `visual` is one of `impact-bars` (qualitative levels
  `lower`/`moderate`/`higher`, never numbers), `timeline` (`steps`),
  `before-after` (`before`, `after`) or `group-compare` (`labels` per group),
  and always needs an `alt` text in all three languages. A card with
  `"source": null` and `"placeholder": true` still shows the plain layout and
  "Source needed".

### Change interface text (buttons, headings, labels)

Interface text is in `locales/en.json` and `locales/gu.json`.
Each line is `"key": "text"`. Change the text, never the
key. Words in curly brackets such as `{n}` or `{page}` are filled in by the
site and must stay exactly as they are in every language. A key must exist in
`en.json` before it can be translated.

### Pictures

Put picture files (SVG, PNG, JPG or WebP) in `content/images/` and refer to them
by file name. Use only pictures you made or are licensed to use, record their
source, and keep files small (under about 200 KB) for phones. The check warns
about pictures that nothing uses.

### Settings that need a developer (one line each)

These live in `src/config/site.ts`:

- `ORGANISATION`: the organisation's name and contact for the footer (empty
  until branding is confirmed).
- `TRANSLATION_REVIEWED`: set `gu` to `true` once a fluent reviewer
  has checked that language; the "draft translation" note in the footer then
  disappears.
- `INTRO_COPY_IS_PLACEHOLDER`: set to `false` once the intro text in
  `locales/*.json` (`site.tagline`, `intro.*`) is final.

The palette and type sizes are in `src/styles/tokens.css`. The section URLs
(`bhulkao`, `yuvako`, `story`, `scenario`) are set in one place,
`src/config/sections.ts`.

## Open questions

From section 2 of the build plan, with their status after this build.

| #   | Question                                             | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Commit to the default branch, or a branch with a PR? | **Answered.** Work happens on `claude/webapp-build-plan-initial-0ecfpc`. When the owner asked for the site to go live, they approved fast-forwarding `main` to it, so `main` matches the build branch. No pull request has been opened.                                                                                                                                                                                                                                                                                   |
| 2   | What does the green pill open?                       | **Answered.** An on-site set of three solution pages (reconnect with people, digital boundaries, move and be present), reached from the green pill the guide offers after tossing the blue one. Nothing leaves the site except the cited sources, which ask first.                                                                                                                                                                                                                                                        |
| 3   | Word list spellings and length rule                  | **Partly answered.** Owner-confirmed words: `seva`, `swadharma`, `prarthna` (native forms included). The other nine words (daya, satya, shanti, dhyan, bhakti, kshama, santosh, vinay, sanyam) and all meanings and reflections were drafted by the builder. At the owner's request they are no longer marked as placeholder (no badge, banner or "Placeholder reflection:" prefix), but they still need the owner's review. The length rule (a–z, 3 to 10 letters) is the plan's default and **still needs confirming**. |
| 4   | Who translates and reviews Gujarati?                 | **Open.** All Gujarati text is a draft written by the builder, flagged unreviewed, with a note in the footer. Hindi was dropped.                                                                                                                                                                                                                                                                                                                                                                                          |
| 5   | Native-script play in the word game?                 | **Open (default applied).** Played in Latin transliteration in all languages; meaning, reflection and native-script forms are shown in the chosen language.                                                                                                                                                                                                                                                                                                                                                               |
| 6   | Who supplies and approves real content?              | **Open.** The owner asked for the placeholders to stay until real content arrives. All content is marked placeholder.                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | Bhulkao age range                                    | **Open (default applied).** Primary-school age assumed: short sentences, slow starting speed in the doodle game.                                                                                                                                                                                                                                                                                                                                                                                                          |
| 8   | Branding                                             | **Open (default applied).** Working title "Digital Outreach" (a locale string), no logo, placeholder palette in `src/styles/tokens.css`, empty organisation slots in the footer.                                                                                                                                                                                                                                                                                                                                          |
| 9   | Hosting                                              | **Answered.** The owner chose to go live: GitHub Pages at <https://sanketsh4h.github.io/ak_outreach/>, deployed from `main` after CI passes. A custom domain is still possible.                                                                                                                                                                                                                                                                                                                                           |

## Launch blockers

Before this site is presented as final:

1. **Translation review**: a fluent reviewer for Gujarati checks
   every interface string and content file, then `TRANSLATION_REVIEWED` is set.
   Two wording choices to confirm: "Placeholder" is translated as "કામચલાઉ"
   and "अस्थायी" (both mean "temporary"), and the section names are written
   ભૂલકાઓ / भूलकाओ and યુવકો / युवको.
2. **Real content**: stories, scenarios, prasangs, word meanings and
   reflections, doodle items and their explanations, pill cards, and the intro
   text, all approved by the content owners, with `placeholder` set to `false`.
3. **Sources for every red-pill claim**: each red card needs a real, checked
   source. The placeholder cards say what will go there and carry no source;
   no statistics or findings were invented.
4. **Green pill pages and sources**: a reviewer checks each green page and each red card against its cited source, and the Gujarati wording.
5. **Branding**: name, logo, palette and the organisation's name and contact.
6. **Hosting**: decided (GitHub Pages). Remaining: a custom domain if wanted.

## Where this build departs from the plan

1. **Followed the owner-amended plan.** The build was started from the first
   version of the plan. The branch then turned out to hold an amended version
   with owner corrections (the green pill's destination is not yet supplied; the third word
   is `prarthna` with native forms; much stronger placeholder marking). The
   build follows the amended version, which is now `docs/BUILD_PLAN.md`.
2. **Went live.** The plan said nothing would be deployed until the owner
   chose a host. The owner asked for the work so far to go live. The Pages
   workflow therefore runs automatically after CI passes on `main` (and can
   still be run by hand); the plan described a manual-only workflow.
3. **TypeScript 6.0, not 7.0.** TypeScript 7 is the current release, but
   typescript-eslint (needed for linting) supports only versions below 6.1.
   All other dependencies are on their current releases.
4. **No jsx-a11y lint plugin**, because it does not support ESLint 10.
   Accessibility is checked with axe in the end-to-end tests instead. A small
   local lint rule fails the build if visible text is written directly in a
   component.
5. **Language-switch labels use two tiny fonts** (about 2 KB each, cut from
   the Noto fonts by `scripts/subset-switch-fonts.sh`), so "ગુજરાતી"
   displays correctly on devices without a Gujarati font, while the full
   Gujarati font still loads only when Gujarati is chosen.
6. **Prasang cover alt text.** The plan's `images` entries have only `src` and
   `source`; the cover is not placed in the text, so it had no alt text. The
   first `images` entry therefore takes an `alt` line.
7. **Story videos record a `source`** as pictures do (none are shipped).
8. **Pill content details** the plan left open: a source is `{ text, url? }`
   or `null`.
9. **Word-game keys are narrower than 44px.** At 360px wide, a ten-key keyboard
   row leaves about 30px per key. Keys are 52px tall and meet the WCAG 2.2 AA
   minimum target size (24px), but not the plan's 44px Yuvako guideline in
   width. Every other control meets the 44px (Yuvako) and 56px (Bhulkao)
   guideline, checked by a test.
10. **Story and prasang pages load on demand**, to keep the first download
    smaller on phones (not required by the plan).
11. **The pill game has a guide, and the blue pill no longer goes dark.** At
    the owner's request, an animated cartoon guide (an original character, not
    from any film) offers the pills on the landing screen. Choosing the blue
    pill no longer shows the plan's "blissful ignorance" screen, the blackout
    or the "no escape" screen: the guide tosses the blue pill away with a short,
    light-hearted line and offers a green pill instead, on the same screen.
    With reduced motion the guide is shown still, holding the pills.

## Known gaps and follow-ups

- **Download size.** The main script is about 166 KB compressed, mostly
  because content is checked (Zod) and front matter parsed (YAML) in the
  browser, as the plan specifies. Doing that at build time instead would cut
  it substantially.
- **Browsers tested.** Automated and manual checks ran in Chromium (desktop,
  and a 360px phone viewport with touch). Safari, Firefox and real phones
  have not been tested yet.
- **Deep links on GitHub Pages** are served by `404.html`, so they display
  correctly but return HTTP status 404 to crawlers.
- **`npm audit`** reports 7 moderate issues, all in development-only lint
  tooling (minimatch via typescript-eslint); nothing that ships to visitors.
- **GitHub Actions** warns that `actions/deploy-pages@v4` targets an older
  Node.js; it still runs. Bump the action versions when newer majors are out.

## For developers

### Stack

- Vite, React, TypeScript (strict). No backend.
- React Router (`BrowserRouter`), base path from the `BASE_PATH` env var.
- CSS Modules plus CSS custom properties for design tokens.
- A small in-house i18n module; interface keys are typed from
  `locales/en.json`, so a missing key fails type-checking.
- Zod schemas for content (`src/content/schemas.ts`), shared by the app and
  `scripts/validate-content.ts`.
- Self-hosted fonts via `@fontsource`.
- Vitest for logic, Playwright with axe for end-to-end and accessibility tests.
- ESLint and Prettier. Node version in `.nvmrc`.

### Scripts

| Command             | What it does                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                                                                       |
| `npm run build`     | Validate content, type-check, build to `dist/`, copy `index.html` to `404.html`                            |
| `npm run preview`   | Serve the production build locally                                                                         |
| `npm run validate`  | Check every content and locale file (`validate:strict` also fails on missing translations; CI uses strict) |
| `npm run lint`      | ESLint                                                                                                     |
| `npm run format`    | Prettier (`format:check` to check only)                                                                    |
| `npm run typecheck` | TypeScript                                                                                                 |
| `npm test`          | Unit tests (Vitest)                                                                                        |
| `npm run test:e2e`  | End-to-end tests (Playwright; builds and serves the site itself)                                           |

Set `PLAYWRIGHT_CHROMIUM_PATH` to use a Chromium other than Playwright's own.

### Layout

```
content/        stories, prasangs, images, doodle-items.json, pills.json, words.json
locales/        en.json, gu.json
scripts/        validate-content.ts (+ tests), postbuild.mjs, subset-switch-fonts.sh
src/config/     sections.ts (slugs, games), site.ts (organisation, review flags, storage keys)
src/i18n/       provider, t(), localized fields, fonts, storage
src/content/    schemas, loaders (import.meta.glob), front matter parser
src/components/ layout, header, footer, cards, placeholder marking, lesson box, external link
src/pages/      intro, section home, games list, item list, story, prasang, not found
src/features/   story engine (validate, state, player), prasang reader
src/games/      pills/, words/, doodle/ (each with pure logic and unit tests)
tests/e2e/      Playwright tests
```

### Conventions

- No visible text in components: interface text from `locales/*.json`,
  content text from `content/`. ESLint enforces this.
- Game logic is pure and unit-tested (`games/*/machine.ts`, `logic.ts`,
  `sim.ts`); components only render and wire up input.
- localStorage holds only the keys in `STORAGE_KEYS`.

### Tests

- `npm test`: story validation and state, front matter, i18n, the pill
  machine, word scoring (two-pass, including the three a's in "swadharma") and
  the daily word, doodle `step()` with a seeded random source, the content
  validator against deliberately broken copies of the content, and a guard
  that the green pill's old stand-in link and wording appear nowhere.
- `npm run test:e2e`, at 360px with touch and at desktop size: every route in
  every language (no horizontal scroll, no axe violations, no request to any
  other site); language persistence; two story endings; a prasang to its
  lesson box; each game's main flow by touch and by keyboard; placeholder
  marking; tap-target sizes; three-tap reachability; the skip link; the CSP
  tag; the "leaving this site" step.

## Hosting

The site is a static build and can be hosted anywhere. The owner chose
**GitHub Pages**: <https://sanketsh4h.github.io/ak_outreach/>.

- `.github/workflows/pages.yml` builds with `BASE_PATH=/ak_outreach/` and
  deploys after the CI workflow passes on `main`. It can also be run by hand
  from the Actions tab ("Deploy to GitHub Pages" → "Run workflow").
- One-time setup in the repository (done): **Settings → Pages → Build and
  deployment → Source: GitHub Actions**.
- Deep links work on Pages because the build copies `index.html` to `404.html`.
  On another host, add a rewrite that serves `index.html` for every path that
  is not a file (for example Netlify `/* /index.html 200`, or nginx
  `try_files $uri /index.html`).
- Production builds include a Content-Security-Policy meta tag that limits
  every request to the site's own origin.
- **Vercel** also deploys every push (live preview above, and a preview per
  pull request). Builds made there turn on Vercel Web Analytics
  (`@vercel/analytics`, mounted in `src/App.tsx`): anonymous page-view counts
  with no cookies, loaded from `/_vercel/insights/` on the site's own domain,
  so the Content-Security-Policy still holds. Builds anywhere else (GitHub
  Pages, local, tests) leave it out; `vite.config.ts` checks for Vercel's
  `VERCEL=1`. To see the numbers, turn on **Analytics** in the Vercel
  project's dashboard.
