# gosshive-applinks
App Links configuration for GossHive Android/iOS, and the public site at gosshive.app.

## App links

- `.well-known/apple-app-site-association` (iOS universal links)
- `.well-known/assetlinks.json` (Android app links)

These must stay at the site root and be served without redirects.

### How the site and the app are linked

The app claims these paths on `gosshive.app` (see `DeepLinkService` in the app):

| Link | What the app does |
|---|---|
| `/post/<id>` (optional `?comments=true`, `?comment_id=`) | Opens the post |
| `/profile/<id>` | Opens the profile |
| `/hive/<id>` | Opens the hive |
| `/auth/callback#...` | Finishes email confirmation |
| `/reset-password...` | Opens the password reset screen |
| `/` with `utm_*` parameters | Opens the feed and records the campaign |

With the app installed, the phone opens it and never loads the site. Without it, or inside a browser
that keeps the link to itself, the visitor lands on `404.html`, which offers "Open in the app"
(an Android intent for the same https link, or `gosshive:/post/<id>` on iOS) next to the store link.

### The post page

`/post/<uuid>` is meant to be answered by the Cloudflare Worker in the app repository
(`post-page/`, pull request 197 there): the visitor sees the post, votes without an account, and the
vote reaches the app through Supabase. Its route covers `gosshive.app/post/*` only; everything else,
including `/.well-known/`, is still served from this repository. Until that route is live, post links
fall back to `404.html` here.

Play Store links carry an install referrer so installs can be told apart:
`utm_source=website` with `utm_campaign=landing` (home page) or `link_fallback` (`404.html`);
the post page uses `utm_source=post_page`.

## Site

Plain HTML, CSS and JavaScript. No build step.

| File | What it is |
|---|---|
| `index.html` | Home page: headline, store links, the warm-up deck, how it works, the two hives |
| `privacy.html`, `child-safety.html`, `contact.html`, `delete-account.html` | Document pages. Their text is the source of truth; only the page chrome is shared |
| `auth/callback.html` | Email confirmation landing page (opens the app through `gosshive://auth/callback`) |
| `404.html` | Shown for any missing path, including post, profile and hive links opened without the app |
| `assets/site.css` | All styles. Colours mirror the app theme (`lib/themes/app_theme.dart`) |
| `assets/site.js` | Hive switch, After Dark clock, store link per device |
| `assets/deck.js` | The swipe deck on the home page |
| `assets/fonts/` | Archivo variable font, self-hosted (SIL Open Font License, see `OFL.txt`). The post page loads these two files too, so their paths must not change |

### Things to keep in sync with the app

- After Dark hours (21:00 to 04:00 local time) are set in `assets/site.js` (`OPEN_HOUR`, `CLOSE_HOUR`), in the small inline script at the top of each page, and in the After Dark text on the home page.
- Store links: App Store id `6757358951`, Play package `app.gosshive`.
- Brand colour `#FFBD59`, cream `#FFF8F0`, night `#0A0A12`.

### Preview locally

```bash
python3 -m http.server 8000
```

`404.html` links its files from the site root (`/assets/...`), so it only renders correctly when served from the root of a domain.
