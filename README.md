# Light the diya — Annakut Mahotsav 2026

One page, in English and Gujarati. It opens on an unlit diya. The visitor
brings out a burning fuljadi, touches it to the wick, and the fireworks begin.

- Live site: <https://sanketsh4h.github.io/light-diya/>
- This is the `light-diya` branch of
  [thebaylabs/social-awareness](https://github.com/thebaylabs/social-awareness).
  The full Digital Outreach site (Bhulkao, Yuvako, the games, scenarios and
  prasangs) is on that repository's `main` branch; none of it is here.

> Gujarati text is an unreviewed draft, and the footer says so.

## What the page does

1. **Unlit diya.** The page shows only the diya, the line "Light the diya to
   begin Annakut Mahotsav" and a **Light the diya** button.
2. **Fuljadi.** The button brings out a burning fuljadi. Drag it anywhere on
   the screen; when its tip reaches the wick, the diya lights.
3. **Waiting bar.** Once the diya is lit, a bar appears under it with "Let's
   wait for others to light their diya" and a count such as "37 of 100 diyas
   lit". The shared value is set from `/admin` (not by how many people lit).
   The bar is not shown before the diya is lit.
4. **Welcome and fireworks.** When the shared count reaches 100, the fireworks
   start and the title "Annakut Mahotsav 2026", "Atmiyata" and "True happiness
   lies in living in harmony" appear. These lines are out of sight until then,
   though screen readers can read them at any time.

Things to know:

- **Keyboard:** Enter or Space on the button brings out the fuljadi. Enter or
  Space again lights the diya; Escape puts the fuljadi away.
- **Reduced motion:** for visitors whose device asks for less motion, one
  press lights the diya, with no fuljadi and no fireworks. The bar and the
  welcome work the same.
- **Every visit:** each time the page is opened or reloaded, the diya is
  unlit again. Lighting is local; only the shared bar is driven from `/admin`.
- **After the count reaches 100:** anyone who lights their diya later sees the
  welcome and the fireworks straight away.
- **Other addresses:** any address other than the home page and `/admin`
  shows "Page not found" with a link back.

## Progress control (`/admin`)

Operators open `/admin` (not linked from the header or footer). On it you can
change the shared count (−1 / +1 / +5, set an exact value, jump to 100, or
reset to 0).

The count is stored in the browser (`localStorage`). Other tabs on the **same
browser** update live. There is no cloud database on this branch.

## Run it on your computer

You need Node.js 26 (see `.nvmrc`).

```bash
npm install
npm run dev
```

Then open the address it prints (normally <http://localhost:5173/>). Control
the bar at <http://localhost:5173/admin>.

## Change the text

All visible text is in `locales/en.json` and `locales/gu.json`. Both files
have the same keys; change the text on the right of each line and keep the key
on the left. A unit test fails if a key is missing from either file.

Settings that are not translated (the organisation name, the copyright
holder, whether a translation has been reviewed) are in `src/config/site.ts`.

## For developers

### Stack

React, TypeScript and Vite, with React Router for the home page, `/admin`,
and the not-found page. Production builds carry a Content-Security-Policy
limited to the site's own origin.

### Scripts

| Command                | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                         |
| `npm run build`        | Type check, build to `dist/`, copy to `404.html`   |
| `npm run preview`      | Serve the built site                               |
| `npm run lint`         | ESLint, including the "no text in components" rule |
| `npm run format:check` | Prettier                                           |
| `npm run typecheck`    | TypeScript only                                    |
| `npm test`             | Unit tests (Vitest)                                |
| `npm run test:e2e`     | Browser tests (Playwright) on phone and desktop    |

### Layout

| Path                              | What is there                                     |
| --------------------------------- | ------------------------------------------------- |
| `src/pages/Intro.tsx`             | The page: diya, title and fireworks               |
| `src/pages/AdminControl.tsx`      | `/admin` page that writes the shared count        |
| `src/components/DiyaLighting.tsx` | The lighting ritual and its keyboard support      |
| `src/components/Fuljadi.tsx`      | The fuljadi and its sparks                        |
| `src/components/DiyaLamp.tsx`     | The diya drawing, unlit and lit                   |
| `src/components/Fireworks.tsx`    | The fireworks canvas                              |
| `src/crowd/`                      | The shared count, its polling and the waiting bar |
| `src/components/Layout.tsx`       | Header (logo, language switch), main area, footer |
| `src/i18n/`                       | Language detection, storage and lookup            |
| `locales/`                        | Interface text                                    |
| `tests/e2e/`                      | Browser tests                                     |

### Tests

The site plays no opening fade-in or fireworks in an automated browser, where
a page mid-fade would fail colour-contrast checks. `tests/e2e/intro.spec.ts`
hides that flag and goes through the lighting as a visitor does: by dragging,
by keyboard, and with reduced motion. Shared progress is seeded in
localStorage via `tests/e2e/fake-crowd.ts`. Every page is also checked with
axe for accessibility violations, for horizontal overflow, and for requests
that leave the site.

## Hosting

Every push to `light-diya` runs `.github/workflows/pages.yml`, which lints,
type checks, runs the unit tests, builds with the repository name as the base
path and deploys to GitHub Pages.

The live site is served from a copy of this branch at
[sanketsh4h/light-diya](https://github.com/sanketsh4h/light-diya), because
GitHub Pages is not switched on for thebaylabs/social-awareness. To deploy
there, push the branch to that repository as well.

To serve the site from a sub-path anywhere else, build with
`BASE_PATH=/your-path/ npm run build`. The build copies `index.html` to
`404.html` so that static hosts send unknown addresses to the app.
