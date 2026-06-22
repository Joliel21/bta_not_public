# BTA Magazine Not Tied to Figma

This source app is code-only.

## Content source

The reader loads magazine content from one GitHub master file:

https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json

That file points to all markdown, images, music, cover context, topbar context, ads, and back matter.

## Editing rule

Edit magazine content in `Joliel21/bta_public`, then refresh the Figma preview/dev server.

## Do not add copied content here

Do not add these folders back to this source app:

- `public/content/`
- `public/images/`
- `the-words-we-carry/`
- `node_modules/`
- `dist/`

## Local test

Run from this folder:

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```
