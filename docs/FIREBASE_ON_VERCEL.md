# Connect Firebase to the Vercel site

The **Doodle Catcher** and **Shabd Khoj** leaderboards keep their data in
Firebase Firestore. Until the site is built with a Firebase project's
settings, both say "The leaderboard is not set up yet". Setting it up takes
about 15 minutes and is done once.

You need:

- owner or editor access to a Firebase project
- access to the Vercel project **social-awareness-hp**

## 1. Create the database and a web app

In the [Firebase console](https://console.firebase.google.com):

1. Create a project, or open an existing one. Google Analytics is not needed.
2. Go to **Build → Firestore Database → Create database** and choose
   **Production mode**. Pick a location near the visitors; it cannot be
   changed later.
3. Go to **Project settings** (the gear icon) → **General** → **Your apps** →
   **Web** (`</>`). Give it a nickname, leave Firebase Hosting unticked, and
   choose **Register app**.
4. Keep the `firebaseConfig` it shows. You need four of its values: `apiKey`,
   `projectId`, `authDomain` and `appId`.

## 2. Publish the security rules and the index

From a copy of the repository, on `main`, run:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools deploy --only firestore --project YOUR_PROJECT_ID
```

This publishes two things:

- `firestore.rules`: visitors can only save a valid name with a higher score,
  or a valid daily streak. Everything else is locked.
- the index in `firestore.indexes.json` that the streak board needs. It takes
  a few minutes to build.

**Without the command line**, do it in the console:

1. Paste the contents of `firestore.rules` into **Firestore → Rules** and
   choose **Publish**.
2. In **Firestore → Indexes → Composite → Create index**, set:
   - collection: `wordStreaks`
   - fields: `lastDay` Ascending, then `streak` Descending
   - query scope: Collection

## 3. Add the settings in Vercel

Open **Vercel → social-awareness-hp → Settings → Environment Variables** and
add these four, ticking the **Production** environment:

| Name                        | Value from `firebaseConfig` |
| --------------------------- | --------------------------- |
| `VITE_FIREBASE_API_KEY`     | `apiKey`                    |
| `VITE_FIREBASE_PROJECT_ID`  | `projectId`                 |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain`                |
| `VITE_FIREBASE_APP_ID`      | `appId`                     |

- **Not secret:** these values end up in the site's code, and the rules are
  what protect the data.
- **Preview:** tick it too only if pull-request previews should have working
  leaderboards. They would then share the live data.

## 4. Redeploy

The settings are built into the site, so deployments made before you added
them do not have them. Go to **Deployments**, open the latest Production
deployment, then choose **⋯ → Redeploy**. Pushing any commit to `main` also
works.

## 5. Check it works

1. Go to **Yuvako → Activity → Shabd Khoj** and solve today's word. A "Join the
   streak leaderboard" box should ask for a name, and the board should show it.
2. Go to **Bhulkao → Activity → Doodle Catcher** and play a round. The score
   should appear on the board.
3. In **Firestore → Data**, documents should appear under `wordStreaks` and
   `doodlePlayers`.

If a board says:

- **"The leaderboard is not set up yet"**: a variable is missing or misspelt
  for that environment, or the site has not been redeployed since.
- **"The leaderboard could not be loaded right now"**: the rules or the index
  are not published yet, or the index is still building.

## Also worth doing

- **GitHub Pages copy:** it reads the same four values from GitHub, under
  **Settings → Secrets and variables → Actions → Variables**. Add them there
  too if that copy should work.
- **Restrict the API key (optional):** in Google Cloud console, go to **APIs &
  Services → Credentials** and open the browser key Firebase created. Limit it
  to:
  - these websites: `social-awareness-hp.vercel.app/*`, any custom domain, and
    `localhost:*` for development
  - the Cloud Firestore API
