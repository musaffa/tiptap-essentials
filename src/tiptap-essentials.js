import { Extension } from '@tiptap/core'
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Document from '@tiptap/extension-document'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import History from '@tiptap/extension-history'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Image from '@tiptap/extension-image'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import Superscript from '@tiptap/extension-superscript'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Text from '@tiptap/extension-text'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { SpanWrapper } from './marks/span-wrapper';
import { Iframe } from './nodes/iframe';
import { Youtube } from './extensions/youtube';

export const TiptapEssentials = Extension.create({
  name: 'tiptapEssentials',

  addOptions() {
    return {
      ...this.parent?.(),
      blockquote: true,
      bold: true,
      bulletList: true,
      code: true,
      codeBlock: true,
      document: true,
      dropcursor: true,
      gapcursor: true,
      hardBreak: true,
      heading: true,
      history: true,
      horizontalRule: true,
      iframe: true,
      image: true,
      italic: true,
      link: true,
      listItem: true,
      orderedList: true,
      paragraph: true,
      spanWrapper: true,
      strike: true,
      superscript: true,
      table: true,
      tableCell: true,
      tableHeader: true,
      tableRow: true,
      text: true,
      textAlign: true,
      underline: true,
      youtube: true
    }
  },

  addExtensions() {
    const extensions = []

    if (this.options.blockquote !== false) {
      extensions.push(Blockquote)
    }

    if (this.options.bold !== false) {
      extensions.push(Bold)
    }

    if (this.options.bulletList !== false) {
      extensions.push(BulletList)
    }

    if (this.options.code !== false) {
      extensions.push(Code)
    }

    if (this.options.codeBlock !== false) {
      extensions.push(CodeBlock)
    }

    if (this.options.document !== false) {
      extensions.push(Document)
    }

    if (this.options.dropcursor !== false) {
      extensions.push(Dropcursor)
    }

    if (this.options.gapcursor !== false) {
      extensions.push(Gapcursor)
    }

    if (this.options.hardBreak !== false) {
      extensions.push(HardBreak)
    }

    if (this.options.heading !== false) {
      extensions.push(Heading)
    }

    if (this.options.history !== false) {
      extensions.push(History)
    }

    if (this.options.horizontalRule !== false) {
      extensions.push(HorizontalRule)
    }

    if (this.options.iframe !== false) {
      extensions.push(Iframe)
    }

    if (this.options.image !== false) {
      extensions.push(Image.extend({
        addAttributes() {
          return {
            ...this.parent(),
            srcset: { default: null },
            sizes: { default: null },
            classNames: { default: null },
            style: { default: null },
            loading: { default: 'lazy' }
          }
        }
      }))
    }

    if (this.options.italic !== false) {
      extensions.push(Italic)
    }

    if (this.options.link !== false) {
      extensions.push(Link.extend({
        addAttributes() {
          return {
            ...this.parent(),
            title: { default: null }
          };
        }
      }))
    }

    if (this.options.listItem !== false) {
      extensions.push(ListItem)
    }

    if (this.options.orderedList !== false) {
      extensions.push(OrderedList)
    }

    if (this.options.paragraph !== false) {
      extensions.push(Paragraph)
    }

    if (this.options.spanWrapper !== false) {
      extensions.push(SpanWrapper)
    }

    if (this.options.strike !== false) {
      extensions.push(Strike)
    }

    if (this.options.superscript !== false) {
      extensions.push(Superscript)
    }

    if (this.options.table !== false) {
      extensions.push(Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            class: { default: 'tiptap-table' }
          };
        }
      }))
    }

    if (this.options.tableCell !== false) {
      extensions.push(TableCell)
    }

    if (this.options.tableHeader !== false) {
      extensions.push(TableHeader)
    }

    if (this.options.tableRow !== false) {
      extensions.push(TableRow)
    }

    if (this.options.text !== false) {
      extensions.push(Text)
    }

    if (this.options.textAlign !== false) {
      extensions.push(TextAlign.configure({
        types: ['heading', 'paragraph']
      }))
    }

    if (this.options.underline !== false) {
      extensions.push(Underline)
    }

    if (this.options.youtube !== false) {
      extensions.push(Youtube)
    }

    return extensions
  }
})
