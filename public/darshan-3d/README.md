# Annakut Darshan: the 3D viewer

This folder is a complete static web page that shows the Annakut 2026 display
as a 3D scene. The site shows it inside the Annakut Darshan page
(`src/pages/DarshanPage.tsx`, address `/annakut-darshan`) in an iframe. Nothing
here goes through the site's build, linter or Prettier; the files are served
as they are.

It can also be opened by itself: `/darshan-3d/index.html`.

## What is here

| File or folder        | What it is                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | The page. Its import map points the viewer at the engine in `vendor/`.                                                             |
| `app.js`              | Everything on top of the 3D picture: the view limits, the walk along the display, "Reset view", the two languages, the readout.   |
| `styles.css`          | Styles for those controls.                                                                                                        |
| `annakut-2026.json`   | The scene description: which scene to load, the starting view, how far the camera may turn and zoom, and the path of the walk.    |
| `scene-annakut-2026/` | The scene itself, 36 files, about 34 MB: 822,794 points at four levels of detail, fetched in pieces as the camera needs them.     |
| `poster.webp`         | A picture of the scene, shown on the Annakut Darshan page before the visitor loads the 3D view.                                    |
| `vendor/`             | PlayCanvas SuperSplat Viewer 1.43.1 and PlayCanvas engine 2.24.0, unchanged. Both are MIT licensed; the licences are in the folder. |

The scene was made from video of the display (a "Gaussian splat"). The video,
the photos and the full-size model files are not here and must never be added:
they are large, and the photos carry location data.

## The two views

- **Full view** (the starting view): drag to turn the display, pinch or scroll
  to zoom. The camera is held to the front of the display: 75° to either side,
  never below the floor, never further out than the starting view.
- **Walk view**: "Walk along the display" moves the camera to eye height at the
  right-hand end and steps it along the front; "Full view" returns.

"Reset view" goes back to the starting view. The readout at the bottom left
shows the renderer, the picture quality level and the frame rate; a tap on it
changes the quality level.

## How the site's page and this page talk

The Annakut Darshan page opens `index.html?embed&lang=en` (or `lang=gu`).

- `?embed` hides this page's own title and language button, because the site's
  page has a heading and a language switch of its own.
- When the visitor changes language on the site, the site's page sends
  `{ type: 'annakut-darshan:lang', lang: 'gu' }` with `postMessage`, and this
  page redraws its text without reloading the scene.
- This page sends `{ type: 'annakut-darshan:ready' }` once the scene is on
  screen, or `{ type: 'annakut-darshan:error', message }` if the 3D viewer
  could not start.

Both sides ignore messages from any other origin.

## Other address switches (for testing)

`?webgl` (force WebGL 2), `?webgpu` (use WebGPU in Safari too), `?budget=1`
(cap the points drawn, in millions), `?stats` (performance graphs), `?walk`
(start in the walk), `?nolimits` (free camera), `?cam=px,py,pz,tx,ty,tz[,fov]`
(try a starting view), `?config=name` (load `name.json` from this folder).

## Things to know before changing anything

- **Renderer.** WebGPU where the browser has it, otherwise WebGL 2. Safari and
  every browser on an iPhone or iPad are given WebGL 2 on purpose: Safari's
  WebGPU drew this scene with streaks. A device with neither gets a message in
  place of the scene.
- **No request leaves the site.** There are no web fonts; text uses the fonts
  on the visitor's device. Keep it that way: the site's tests fail on any
  request to another website.
- **Browser storage.** One localStorage key, `quality` (the picture quality
  level: `default` on the first visit, then whatever the visitor chose on the
  readout). The viewer library would also save `performanceMode`,
  `gamingControls`, `showAnnotations` and `iceCream` if those settings changed,
  but nothing on this page changes them.
- **Content-Security-Policy.** The site's policy is a `<meta>` tag on its own
  page and does not apply to this one. If the policy is ever moved to a
  response header that covers this folder, this page needs, for itself:
  an inline import map (`script-src 'self' 'unsafe-inline'`), WebAssembly
  (`'wasm-unsafe-eval'`), and workers and fetches from `blob:` addresses.
- **Caching.** `app.js` fetches the scene description with `cache: 'no-cache'`.
  The scene's own files never change once published, so the site's
  `vercel.json` tells browsers to keep everything in a `scene-…/` folder for a
  year without asking again. That is why a new scene needs a new folder name
  (see below): a browser that has the old files will not look for changes to
  them. The viewer in `vendor/` and the other files here are not covered; they
  are checked on every visit.

## Putting a new scene in

A new scene arrives as a description (`name.json`) and a folder
(`scene-name/`) from the Annakut 3D darshan project, where the scan pipeline
and the tuning of the view limits and walk live.

1. Copy both in beside the current ones. Use a new name; do not overwrite the
   old folder, so a cached copy of the old scene is never mixed with the new.
2. In `app.js`, set `DEFAULT_CONFIG` to the new name.
3. Replace `poster.webp` with a picture of the new scene (1600 × 1000).
4. Update the size in the site's `darshan.loadNote` text (`locales/*.json`) if
   it changed.
5. Delete the old description and folder once the new one is live.

## Where this differs from the original viewer

`index.html`, `app.js` and `styles.css` come from the Annakut 3D darshan
project's `splat-prototype/site`. Four things were changed for this site: the
`?embed` mode and its messages, no Google Fonts, only the `quality` key in
storage when embedded, and `role="application"` on the 3D picture's element.
`vendor/`, the scene description and the scene are unchanged.
