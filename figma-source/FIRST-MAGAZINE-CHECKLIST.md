# First Magazine Checklist

Use this checklist for the current GitHub-content + WordPress-plugin workflow.

## 1. Confirm GitHub content files exist

Keep these in the GitHub repo:

```text
public/content/articles.json
public/content/chapters.json
public/content/front-matter.json
public/content/chapter-descriptions.json
public/content/articles/
public/content/pages/
public/images/articles/
public/images/author/
public/images/brand/
public/fonts/Priestacy.otf
public/publish_manifest.json
public/share/
```

## 2. Confirm the Figma/app package has only shell assets in `public/`

The Figma/app package should keep:

```text
public/images/brand/gold-logo.png
public/images/brand/Cover_Logo.png
```

Do not place the full article library in the Figma package unless intentionally testing offline.

## 3. Confirm app content source

Open:

```text
src/app/config/data-source.ts
```

Confirm it points to GitHub raw URLs for:

```text
articles.json
chapters.json
front-matter.json
chapter-descriptions.json
publish_manifest.json
```

## 4. Confirm WordPress PHP config

Open:

```text
the-words-we-carry/The_Words_We_Carry.php
```

Confirm it passes these values to JavaScript:

```text
articlesUrl
chaptersUrl
frontMatterUrl
chapterDescriptionsUrl
publishManifestUrl
baseRawUrl
```

## 5. Build WordPress assets

From the project root:

```bat
npm install
npm run build:wp
```

Confirm these files updated:

```text
the-words-we-carry/assets/the-words-we-carry.js
the-words-we-carry/assets/the-words-we-carry.css
```

## 6. Upload plugin to WordPress

Zip only:

```text
the-words-we-carry/
```

Upload that plugin zip in WordPress.

## 7. Test

On the WordPress page using the shortcode, confirm:

```text
front matter loads
chapter descriptions load
articles load
article images load
share pages are available where expected
music/top bar still works
closed cover/opening animation still works
```

## 8. Do not delete these unless confirmed unused

```text
public/content/articles/
public/content/pages/
public/images/articles/
public/share/
```
