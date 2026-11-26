/**
 * The markup the library writes for each feature, as it writes it. Its tests
 * read each back and write it out unchanged; a project storing bodies checks
 * against them that it keeps what the editor writes.
 */

export const picture =
  '<picture><source type="image/jxl" srcset="https://static.example/uploads/store/photo-300.jxl 300w" sizes="auto">' +
  '<img src="https://static.example/uploads/store/photo-1200.jpg" alt="A harbour" title="A harbour" ' +
  'srcset="https://static.example/uploads/store/photo-300.jpg 300w" sizes="auto" loading="lazy" ' +
  'style="width: 100%; aspect-ratio: 3 / 2;"></picture>';

export const table =
  '<div class="table-responsive" role="region" tabindex="0" aria-label="Table">' +
  '<table class="tiptap-table"><tbody>' +
  '<tr><th><p>Port</p></th><th><p>Ships</p></th></tr>' +
  '<tr><td><p>Chattogram</p></td><td><p>12</p></td></tr>' +
  '</tbody></table></div>';

export const captionedTable =
  '<div class="table-responsive" role="region" tabindex="0" aria-label="Ships by port">' +
  '<table class="tiptap-table"><caption>Ships by port</caption><tbody>' +
  '<tr><th><p>Port</p></th><th><p>Ships</p></th></tr>' +
  '<tr><td><p>Chattogram</p></td><td><p>12</p></td></tr>' +
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
