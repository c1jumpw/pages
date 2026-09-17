# UnyBase — Landing Page & Checkout

Static site, no build step. Plain HTML/CSS/JS, ready to push to GitHub and deploy on Vercel.

## Files

```
index.html          Landing page (hero, problem, solution, pricing)
checkout.html        Checkout / order summary page
css/style.css         Shared styles for both pages
js/config.js          Plan prices + the 4 checkout link placeholders — edit this file
js/main.js            Pricing toggle + checkout page logic (reads config.js)
assets/logo.png        Full UnyBase wordmark
assets/favicon.png      Cropped icon mark, used as the browser favicon
```

## Before launch — things to plug in

All in **`js/config.js`**:

1. **Checkout links.** Replace the four `null` values in `checkoutUrls` with the real
   Stripe Payment Links (or System.io checkout URLs) for Standard/Premium ×
   Monthly/Yearly. Until then, "Complete Setup" on the checkout page is a visibly
   disabled placeholder with a note underneath it.
2. **Pricing.** `plans.standard` / `plans.premium` hold the monthly and yearly
   prices shown on both pages. The yearly numbers currently assume a
   "2 months free" annual discount — adjust if the real pricing differs.
3. **Post-payment automation** (Resend confirmation email, System.io list/tag) is
   intentionally not built — see the comment block at the bottom of `config.js`
   for what still needs to be wired up via Stripe webhook / Zapier.

## Local preview

Any static file server works, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/index.html`.

## Deploy

Push this folder to a GitHub repo, then import it in Vercel as a static project
(no framework/build command needed — root directory, output = `/`).

## Note on copy

The approved copy in the original build brief described Unibase as a full
infrastructure layer (hosting + database + deployment + CDN). Per the corrected
product description, UnyBase is a **managed backend** (database, authentication,
file storage, realtime, server-side functions) — the headings, feature list, and
pricing inclusions in this build were adapted to that description rather than
used verbatim. Flag anything you'd like worded differently.
