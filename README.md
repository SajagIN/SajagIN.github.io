# Sajag Kamthan's portfolio

A Windows XP-inspired portfolio built with React and Vite, deployed as a static site to [sajagin.thedev.id](https://sajagin.thedev.id/). There is one website source: the React app in `website/`.

## Layout

```text
.github/workflows/deploy.yml  # GitHub Pages workflow
website/                      # React source, Vite configuration and HTML metadata
  src/App.jsx                 # Windows XP portfolio UI
  src/styles.css              # Visual theme
  index.html                  # HTML template, homepage meta tags and JSON-LD
  scripts/sync-shared.mjs     # Copies shared files for local preview/build
seo/pages.json                # Fallback metadata by route
scripts/prepare_site.py       # Assembles deployable output
scripts/inject_seo.py         # Adds missing metadata to built HTML
assets/                       # Shared favicon, social previews, app icons
robots.txt, sitemap.xml       # Crawler instructions and canonical URLs
llms.txt, manifest.json       # Optional AI summary and web-app manifest
Resume.pdf, 404.html          # Shared résumé and not-found page
CNAME                         # Custom domain reference
```

## Local development

Install Node.js 20.19+ or 22.12+ (the workflow uses Node 24), then from the repository root:

```sh
cd website
npm ci
npm run dev
```

Open Vite's local URL. The `predev` and `prebuild` scripts copy root `assets/`, `Resume.pdf` and `manifest.json` to `website/public/`. Edit the **root** files; the copies are generated and ignored by Git. Don't put unrelated files in `website/public/assets/` with the same names.

To test the production build:

```sh
cd website
npm run build
npm run preview
```

## GitHub Pages deployment

1. Back up your existing repository and compare this snapshot against any newer work. Extract the archive into the root of a clone of `SajagIN/SajagIN.github.io`, including hidden `.github` and `.gitignore` files. Delete the old root `index.html` and any `temp.html` if present. These removals won't happen automatically when extracting over an existing clone.
2. Commit and push to `main`. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Make sure the custom domain is still set to `sajagin.thedev.id` and DNS/HTTPS are configured. GitHub's custom workflow deployment uses the domain in Pages settings; `CNAME` alone does not configure it.
3. In **Actions**, check the workflow succeeds or manually run “Build and deploy portfolio”. Verify the homepage, résumé, contact form, sitemap, icons and a nonexistent URL after deployment. Switching the source publishes the React build when the workflow succeeds; keep a backup for rollback.

The workflow checks out the repo; runs `npm ci` and `npm run build` with `working-directory: website`; copies `website/dist` and shared root files into `.pages-output/`; adds missing metadata; and deploys that artifact. It doesn't commit generated files. The website opens at the domain root without a redirect or iframe. Form submissions use the external FormSubmit service, which may require email activation.

## SEO and future changes

Homepage tags and existing JSON-LD live in `website/index.html`. `seo/pages.json` provides fallbacks used by `scripts/inject_seo.py` on generated HTML. The injector preserves existing metadata, canonicals, robots directives and JSON-LD, and skips error pages; it won't fix incorrect pre-existing tags. `/projects/` in the config is only an example and doesn't create a page. Update the config and `sitemap.xml` when real pages are added. Shared root files are authoritative for deployment; assets with conflicting contents fail the assembly rather than silently overwrite.

This is a basic **client-rendered** React app, not a static prerendered multi-page site. The built HTML contains homepage metadata but React renders visible content using JavaScript. For future multi-page SEO and direct route refreshes on GitHub Pages, choose static generation or prerendering and adapt the workflow's build commands/output directory. Metadata and schema don't guarantee ranking or rich results.

`llms.txt` is optional and is not a Google Search ranking signal. The existing page embeds an independently sourced Bliss wallpaper; verify its usage rights before publication. Never put private secrets in a public repository or frontend bundle.
