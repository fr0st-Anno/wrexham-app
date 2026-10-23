# Install and publish Wrexham Reds

## Release checklist for the owner

1. Review draft PR #1. The app can be published with football data still in setup mode while the replacement API key is pending. RSS and YouTube do not require that key.
2. When ready to release, merge the reviewed PR and set repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. Keep the `github-pages` environment restricted to `main`. The first run may fail until the source setting is changed; rerun **Publish app** afterwards.
3. Verify **Actions → Publish app** succeeds, then visit https://fr0st-anno.github.io/wrexham-app/ and check news, videos and the installation guide.
4. Once your replacement football-data.org key arrives, save it under **Settings → Secrets and variables → Actions → New repository secret**, named `FOOTBALL_DATA_TOKEN`. Never place it in source, screenshots or chat. Run **Update news and videos** on `main`; verify the sports snapshot and the following **Publish app** run.

The publish workflow checks and deploys current `main` after a push, manual run, or completion of **Update news and videos** on `main`. It also publishes saved news if sports refresh fails. This handles the GitHub rule that commits made using `GITHUB_TOKEN` do not trigger ordinary Pages builds. Development branches and pull requests are not published.

The updater retains `contents: write`. The publishing job uses `contents: read`, `pages: write`, and `id-token: write` through GitHub's temporary token; no personal access token is needed. Environment rules may require owner approval. Only the explicit public file list in `scripts/package_site.py` is uploaded, never source scripts, tests, Git metadata or secret files.

## Add to your iPhone

After the release is published:

1. Open **Safari** on your iPhone and visit https://fr0st-anno.github.io/wrexham-app/.
2. Tap **Share** (depending on Safari layout, first open the page menu).
3. Choose **Add to Home Screen**. Enable **Open as Web App** if offered.
4. Tap **Add**. Open the red W icon from your home screen.

The W is the project's existing generic symbol, not a newly copied club crest. The manifest uses relative paths so launch and icons work under `/wrexham-app/`. Installed mode hides the installation instructions. Phone controls have larger tap targets, readable search inputs and safe-area padding.

This is a website installed on the home screen, not an App Store release. It requires an internet connection. There is no service worker or offline caching in this release, so old cached app versions cannot pin news or scores. Videos remain standard YouTube embeds. No notification permission is requested. Bookmarks stay in local browser storage; Safari and the installed app may have separate storage.

Android users can use their browser's **Install app** or **Add to Home screen** option when available. A local `file://` preview cannot be installed on another device.

## Verify before release

Run:

```
python -m unittest discover -s tests -v
node --check app.js
node --check install.js
node --test tests/*.cjs
python scripts/package_site.py
```

Packaging requires a new `_site` directory and refuses to reuse one. CI uses a clean checkout each time. The tests verify provider error handling, delayed/stale match UI, installation help, icon dimensions, subdirectory paths and the public file list.

On an actual iPhone, check the icon, standalone launch, portrait/landscape layout, search, bookmarks and YouTube playback after deployment. Desktop checks do not replace this device test. Real football data still needs an authenticated provider check with the replacement key.

References: [Apple installation steps](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
