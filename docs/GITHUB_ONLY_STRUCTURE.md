# GitHub-Only Reader Structure

Public content source:

`Joliel21/bta_public/public/content/issue.json`

Private repo owns:

- Figma/source code
- WordPress plugin source folders
- WordPress install zips
- private docs/build notes

Private repo does not own:

- article text
- front matter text
- chapter descriptions
- cover/back-cover wording
- reader-facing images/fonts/content

Main reader plugin loads built JS/CSS only and points the reader to public GitHub `issue.json`.
