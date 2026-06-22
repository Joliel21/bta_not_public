# The Words We Carry Magazine

Static GitHub Pages magazine reader for Jolie Lizana / Breathtaking Awareness.

## Current content source

The reader loads the magazine from the public content system:

```text
public/content/articles.json
public/content/chapters.json
public/content/articles/{chapterSlug}/{articleSlug}.md
public/images/...
public/fonts/...
public/share/...
```

Example article path:

```text
public/content/articles/the-phlip-side/a-ph-advocate-finds-hope-in-new-research-anxiety-at-the-airport.md
```

## Deployment URL

The GitHub Pages deployment is expected to live at:

```text
https://joliel21.github.io/Magazine/
```

Use `/Magazine/` for GitHub Pages paths in this repo.

## Share pages

Static article share pages are generated from `public/content/articles.json` and article markdown files by:

```text
scripts/generate-share-pages.mjs
```

Generated pages are written to:

```text
public/share/{articleSlug}/index.html
```

## Build commands

```bash
npm install
npm run build
```

WordPress bundle build, when needed:

```bash
npm run build:wp
```
