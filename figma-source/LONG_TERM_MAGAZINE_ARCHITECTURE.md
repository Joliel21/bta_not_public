# The Words We Carry — Long-Term Content Architecture

## Core principle

The reader experience should look the same everywhere. Figma/app source controls the reader design. WordPress and GitHub provide content. The reader displays one normalized magazine plan.

## Sources

1. **WordPress** — easiest entry for articles, images, captions, alt text, video/podcast embeds, ads, sponsor pages, and quick changes.
2. **GitHub** — versioned content, designed pages, share pages, fallback/archive, precise placement rules, and override manifests.
3. **Built-in fallback** — emergency only.

## Page types

Supported long-term page types:

- article
- page
- front-matter
- chapter-opener
- ad
- sponsor
- video
- podcast
- media-page
- share
- custom

## Placement and override model

Each page may include a placement object:

```json
{ "after": "existing-page-id" }
```

or:

```json
{ "before": "existing-page-id" }
```

or:

```json
{ "replace": "existing-page-id" }
```

or:

```json
{ "hide": "existing-page-id" }
```

This keeps the system open so future pages, ads, videos, podcasts, and sponsor placements can be added from either WordPress or GitHub without redesigning the reader.

## Clickable items

Clickable words should use normal Markdown/WordPress links. Clickable images/buttons/hotspots use:

```json
"imageLinkUrl": "https://example.com",
"buttonText": "Learn More",
"buttonUrl": "https://example.com",
"hotspots": [
  {
    "id": "main-link",
    "label": "Learn more",
    "url": "https://example.com",
    "ariaLabel": "Learn more about this page",
    "analyticsEvent": "link_clicked"
  }
]
```

Every clickable image/hotspot must have useful `alt`, `label`, or `ariaLabel` text.

## Analytics foundation

Track source-aware events only. Do not create a heavy plugin dashboard until the reader is stable.

Initial events:

- magazine_opened
- page_viewed
- article_viewed
- ad_viewed
- ad_clicked
- share_clicked
- link_clicked
- content_source_used
- content_load_failed
- image_failed

Do not track `continue_reading_clicked` unless there is a visible user action for Continue Reading.
