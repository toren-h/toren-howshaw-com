# toren.howshaw.com

Star Wars–themed personal site for Toren H, served by GitHub Pages from the `gh-pages` branch.
Plain HTML/CSS/JS — no build step.

## Features
- Opening crawl intro (skippable, shown once per browser session, replay button in footer)
- Animated twinkling starfield
- Light Side / Dark Side colour toggle (remembered between visits)
- Lightsaber skill bars, holo-card profile, missions, timeline, contact links
- Themed 404 page, SEO meta, Open Graph image, sitemap, robots.txt
- Respects `prefers-reduced-motion`

## Editing content
All content lives in `index.html` — look for `TODO` comments:
bio, skills (`data-level` 0–100), missions, timeline, and contact links.
The crawl text is in the `<div class="crawl">` block.

## Run locally
```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy
1. Create a GitHub repo and push:
   ```sh
   git remote add origin git@github.com:<you>/toren-howshaw-com.git
   git push -u origin gh-pages
   ```
2. Repo **Settings → Pages**: Source = *Deploy from a branch*, branch = `gh-pages`, folder = `/ (root)`.
3. DNS for `howshaw.com`: add a `CNAME` record `toren` → `<you>.github.io`.
4. Once the certificate is issued, tick **Enforce HTTPS**.

The `CNAME` file sets the custom domain. If the domain is different, update `CNAME`,
the canonical/OG URLs in `index.html`, `robots.txt` and `sitemap.xml`.

---
Fan-made theme. Not affiliated with Lucasfilm or Disney.
