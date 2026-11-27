/**
 * The markup the library writes for each feature, as it writes it. Its tests
 * read each back and write it out unchanged; a project storing bodies checks
 * against them that it keeps what the editor writes.
 */

export const picture =
  '<picture><source type="image/jxl" srcset="https://static.example/uploads/store/photo-300.jxl 300w" sizes="auto">' +
  '<img src="https://static.example/uploads/store/photo-1200.jpg" alt="A harbour" width="1200" height="800" ' +
  'srcset="https://static.example/uploads/store/photo-300.jpg 300w" sizes="auto" loading="lazy"></picture>';

// A photo as a figure holds it.
const photo = (alt: string) =>
  '<picture><source type="image/jxl" srcset="https://static.example/uploads/store/photo-300.jxl 300w" sizes="auto">' +
  `<img src="https://static.example/uploads/store/photo-1200.jpg" alt="${alt}" width="1200" height="800" ` +
  'srcset="https://static.example/uploads/store/photo-300.jpg 300w" sizes="auto" loading="lazy"></picture>';

export const figure =
  `<figure class="tiptap-figure tiptap-align-center">${photo('Fishing boats moored at a pier')}` +
  '<figcaption><span class="tiptap-figure-caption">The harbour at dawn</span> ' +
  '<span class="tiptap-figure-credit">Jane Doe</span></figcaption></figure>';

export const leftFigure =
  '<figure class="tiptap-figure tiptap-align-left" style="--tiptap-figure-width: 50%;">' +
  `${photo('Fishing boats moored at a pier')}` +
  '<figcaption><span class="tiptap-figure-caption">The harbour at <em>dawn</em></span> ' +
  '<span class="tiptap-figure-credit">Jane Doe</span></figcaption></figure>';

export const rightFigure =
  '<figure class="tiptap-figure tiptap-align-right" style="--tiptap-figure-width: 33%;">' +
  `${photo('Fishing boats moored at a pier')}` +
  '<figcaption><span class="tiptap-figure-caption">The harbour at dawn</span></figcaption></figure>';

export const wideFigure =
  `<figure class="tiptap-figure tiptap-align-wide">${photo('Fishing boats moored at a pier')}` +
  '<figcaption><span class="tiptap-figure-credit">Jane Doe</span></figcaption></figure>';

export const fullFigure = `<figure class="tiptap-figure tiptap-align-full">${photo('Fishing boats moored at a pier')}</figure>`;

// A photo as a gallery holds it: its shape, its width over its height, and
// its credit where it has one.
const galleryPhoto = (
  alt: string,
  [width, height, ratio]: [number, number, string],
  credit?: string
) =>
  `<picture style="--tiptap-ratio: ${ratio};"${credit ? ` data-credit="${credit}"` : ''}>` +
  '<source type="image/jxl" srcset="https://static.example/uploads/store/photo-300.jxl 300w" sizes="auto">' +
  `<img src="https://static.example/uploads/store/photo-1200.jpg" alt="${alt}" width="${width}" height="${height}" ` +
  'srcset="https://static.example/uploads/store/photo-300.jpg 300w" sizes="auto" loading="lazy"></picture>';

const LANDSCAPE: [number, number, string] = [1200, 800, '1.5'];
const PORTRAIT: [number, number, string] = [800, 1200, '0.6667'];
const SQUARE: [number, number, string] = [1000, 1000, '1'];

// Its caption followed by its images' credits, each once.
export const gallery =
  '<figure class="tiptap-gallery"><div class="tiptap-gallery-images">' +
  galleryPhoto('Fishing boats moored at a pier', LANDSCAPE, 'Jane Doe') +
  galleryPhoto('A lighthouse above the harbour', PORTRAIT, 'John Roe') +
  galleryPhoto('Nets drying on the quay', SQUARE, 'Jane Doe') +
  '</div><figcaption><span class="tiptap-figure-caption">The harbour at dawn</span> ' +
  '<span class="tiptap-figure-credit">Jane Doe; John Roe</span></figcaption></figure>';

export const wideGallery =
  '<figure class="tiptap-gallery tiptap-align-wide"><div class="tiptap-gallery-images">' +
  galleryPhoto('Fishing boats moored at a pier', LANDSCAPE) +
  galleryPhoto('A lighthouse above the harbour', PORTRAIT) +
  '</div><figcaption><span class="tiptap-figure-caption">The harbour at dawn</span></figcaption></figure>';

export const fullGallery =
  '<figure class="tiptap-gallery tiptap-align-full"><div class="tiptap-gallery-images">' +
  galleryPhoto('Fishing boats moored at a pier', LANDSCAPE, 'Jane Doe') +
  galleryPhoto('Nets drying on the quay', SQUARE) +
  '</div><figcaption><span class="tiptap-figure-credit">Jane Doe</span></figcaption></figure>';

// A table no line has moved, its columns at even shares.
export const table =
  '<div class="table-responsive" role="region" tabindex="0" aria-label="Table">' +
  '<table class="tiptap-table"><colgroup><col style="--tiptap-column-width: 50%;"><col style="--tiptap-column-width: 50%;"></colgroup><tbody>' +
  '<tr><th><p>Port</p></th><th><p>Ships</p></th></tr>' +
  '<tr><td><p>Chattogram</p></td><td><p>12</p></td></tr>' +
  '</tbody></table></div>';

export const captionedTable =
  '<div class="table-responsive" role="region" tabindex="0" aria-label="Ships by port">' +
  '<table class="tiptap-table"><caption>Ships by port</caption>' +
  '<colgroup><col style="--tiptap-column-width: 50%;"><col style="--tiptap-column-width: 50%;"></colgroup><tbody>' +
  '<tr><th><p>Port</p></th><th><p>Ships</p></th></tr>' +
  '<tr><td><p>Chattogram</p></td><td><p>12</p></td></tr>' +
  '</tbody></table></div>';

// A table whose lines have moved, a row given a height and a cell a colour.
export const styledTable =
  '<div class="table-responsive" role="region" tabindex="0" aria-label="Table">' +
  '<table class="tiptap-table"><colgroup><col style="--tiptap-column-width: 30.5%;"><col style="--tiptap-column-width: 69.5%;"></colgroup><tbody>' +
  '<tr><th><p>Port</p></th><th><p>Ships</p></th></tr>' +
  '<tr style="--tiptap-row-height: 2.5em;"><td style="background-color: var(--tiptap-highlight-yellow);"><p>Chattogram</p></td><td><p>12</p></td></tr>' +
  '</tbody></table></div>';

export const video =
  '<div data-youtube-video=""><iframe width="640" height="480" allowfullscreen="true" ' +
  'src="https://www.youtube.com/embed/M7lc1UVf-VE?start=90&amp;rel=1" title="A talk"></iframe></div>';

export const size =
  '<p><span style="font-size: var(--lg-font-size);">Large</span> text</p>';

export const color =
  '<p><span style="color: var(--tiptap-text-red);">Red</span> text</p>';

export const highlight =
  '<p><mark data-color="var(--tiptap-highlight-yellow)" ' +
  'style="background-color: var(--tiptap-highlight-yellow); color: inherit;">Marked</mark> text</p>';

export const spacing =
  '<p style="line-height: var(--tiptap-line-height-150); margin-top: var(--space-40); ' +
  'margin-bottom: var(--space-40);">Spaced</p>';

export const subscript = '<p>H<sub>2</sub>O</p>';
