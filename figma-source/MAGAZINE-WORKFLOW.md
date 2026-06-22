# Magazine Workflow

This project uses a GitHub-content + WordPress-plugin workflow.

## Source roles

```text
Figma/exported app = reader source code and shell visuals
GitHub repo = public magazine content and public asset source
WordPress plugin = built reader shell that pulls content from GitHub
```

## Files that belong in GitHub content

Keep these files in the GitHub repo:

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

`public/share/` is kept because the share pages are part of the magazine flow and appear after pieces.

## Files that belong in the Figma/app package

The Figma-side app should keep code and shell assets only:

```text
src/
the-words-we-carry/
package.json
vite.config.ts
vite.config.wp.ts
index.html
postcss.config.mjs
pnpm-workspace.yaml
public/images/brand/gold-logo.png
public/images/brand/Cover_Logo.png
```

Do not add the full GitHub article/image library into Figma unless intentionally doing offline local testing.

## Required content URLs

The reader expects the GitHub repo to provide:

```text
public/content/articles.json
public/content/chapters.json
public/content/front-matter.json
public/content/chapter-descriptions.json
public/publish_manifest.json
```

The app should read these through `src/app/config/data-source.ts` and the WordPress PHP config.

## WordPress build

From the project root, run:

```bat
npm install
npm run build:wp
```

The WordPress build must output to:

```text
the-words-we-carry/assets/the-words-we-carry.js
the-words-we-carry/assets/the-words-we-carry.css
```

## Full build check

Run this when checking both the regular app build and the WordPress plugin build:

```bat
npm run build:all
```

## WordPress plugin upload

Zip and upload only this folder as the plugin:

```text
the-words-we-carry/
```

Do not upload the entire GitHub repository as a WordPress plugin.

## After Figma updates

1. Export/update the app files.
2. Preserve the current GitHub-pulling `data-source.ts`.
3. Preserve the current WordPress PHP file with `frontMatterUrl` and `chapterDescriptionsUrl`.
4. Run `npm install` if `node_modules` is missing.
5. Run `npm run build:wp`.
6. Confirm the files in `the-words-we-carry/assets/` updated.
7. Upload the `the-words-we-carry/` plugin zip to WordPress.
8. Add article/content/page updates to GitHub, not Figma.
