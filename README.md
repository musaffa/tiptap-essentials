# tiptap-essentials

Tiptap's extensions as one, `TiptapEssentials`, and the nodes they lack.

- `npm install`, then `npm run build`, writes `dist/`
- `npm test` runs the tests
- `npm run write-samples -- <dir>` writes each sample to `<dir>`, a file
  each, with the version they are from
- `npm pack` writes the tarball an app tries an unpublished change from,
  each try a prerelease of its own:
  `npm version prerelease --preid beta --no-git-tag-version`, the flag
  keeping `npm version` from committing and tagging
- A prerelease is the tarball an app passed on, published as it is once its
  version is committed: `npm publish <tarball> --tag beta`. `npm version`
  run again would publish the next number, or stop at the try's uncommitted
  change
- A release: `npm version major|minor|patch`, then `npm publish`, which
  builds and tests first
