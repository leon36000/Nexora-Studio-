import type { ComponentType, SVGProps } from 'react'
import {
  ChartColumn,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageUp as ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Table as TableIcon,
  TextQuote,
} from '@sim/emcn/icons'
import type { Editor, Range } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { DASHBOARD_EMBED_LANGUAGE } from '@/lib/dashboards/embed-language'

/** A time-series starter; the table id is left for the author to fill in. */
const DASHBOARD_EMBED_STARTER = `title: Rows over time
time: 7d
source:
  tableId: # table id
blocks:
  - chart: Rows per day
    source:
      groupBy: [createdAt]
      bucket: day
      aggregate:
        rows: { op: count }
    option:
      xAxis: { type: time }
      yAxis: { type: value }
      series:
        - { type: line, encode: { x: createdAt, y: rows } }
`

export interface SlashCommandContext {
  editor: Editor
  range: Range
}

/**
 * Per-editor storage on the `slashCommand` extension. The host editor component sets `insertImage`
 * after mount; it opens an image file picker and uploads + inserts the chosen image(s) at `at`. Null
 * in headless/read-only contexts, where the Image command is a no-op.
 */
export interface SlashCommandStorage {
  insertImage: ((at: number) => void) | null
}

/** Stable command ids; each one's menu title is `files.editor.slashCommands.items.<id>`. */
type SlashCommandId =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletedList'
  | 'numberedList'
  | 'checklist'
  | 'quote'
  | 'codeBlock'
  | 'chart'
  | 'table'
  | 'divider'
  | 'image'

/** Localized command titles, matched against the slash query alongside the aliases. */
export type SlashCommandTitles = Partial<Record<SlashCommandId, string>>

export interface SlashCommandItem {
  id: SlashCommandId
  /** Group the item is shown under in the menu (`files.editor.slashCommands.groups.<group>`). */
  group: 'basic' | 'lists' | 'blocks' | 'media'
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Search terms matched against the slash query, beyond the localized title (English names included). */
  aliases: string[]
  /** Keyboard shortcut shown on the right of the item (omitted when there is none). */
  shortcut?: string
  run: (ctx: SlashCommandContext) => void
}

/**
 * The blocks insertable via the `/` menu. Each `run` first deletes the typed `/query`
 * (`deleteRange(range)`) so the command replaces the trigger text rather than appending.
 * Kept to blocks that round-trip cleanly through markdown — no media/embeds.
 */
export const SLASH_COMMANDS: readonly SlashCommandItem[] = [
  {
    id: 'text',
    group: 'basic',
    icon: Pilcrow,
    aliases: ['text', 'paragraph', 'body'],
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: 'heading1',
    group: 'basic',
    icon: Heading1,
    aliases: ['heading 1', 'h1', 'title'],
    shortcut: '⌘⌥1',
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    group: 'basic',
    icon: Heading2,
    aliases: ['heading 2', 'h2', 'subtitle'],
    shortcut: '⌘⌥2',
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    group: 'basic',
    icon: Heading3,
    aliases: ['heading 3', 'h3'],
    shortcut: '⌘⌥3',
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletedList',
    group: 'lists',
    icon: List,
    aliases: ['bulleted list', 'unordered', 'ul', 'bullet'],
    shortcut: '⌘⇧8',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'numberedList',
    group: 'lists',
    icon: ListOrdered,
    aliases: ['numbered list', 'ordered', 'ol'],
    shortcut: '⌘⇧7',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    group: 'lists',
    icon: ListChecks,
    aliases: ['checklist', 'todo', 'task', 'checkbox'],
    shortcut: '⌘⇧9',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'quote',
    group: 'blocks',
    icon: TextQuote,
    aliases: ['quote', 'blockquote', 'citation'],
    shortcut: '⌘⇧B',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    group: 'blocks',
    icon: Code,
    aliases: ['code block', 'codeblock', 'snippet', 'fence'],
    shortcut: '⌘⌥C',
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'chart',
    group: 'blocks',
    icon: ChartColumn,
    aliases: ['chart', 'dashboard', 'graph', 'metric', 'live data'],
    run: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'codeBlock',
          attrs: { language: DASHBOARD_EMBED_LANGUAGE },
          content: [{ type: 'text', text: DASHBOARD_EMBED_STARTER }],
        })
        .command(({ tr }) => {
          let fence = -1
          tr.doc.nodesBetween(range.from - 1, tr.doc.content.size, (node, pos) => {
            if (fence < 0 && node.type.name === 'codeBlock') fence = pos
            return fence < 0
          })
          if (fence < 0) return false
          tr.setSelection(TextSelection.create(tr.doc, fence + 1))
          return true
        })
        .run(),
  },
  {
    id: 'table',
    group: 'blocks',
    icon: TableIcon,
    aliases: ['table', 'grid', 'rows', 'columns'],
    run: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'divider',
    group: 'blocks',
    icon: Minus,
    aliases: ['divider', 'hr', 'horizontal rule', 'separator'],
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'image',
    group: 'media',
    icon: ImageIcon,
    aliases: ['image', 'picture', 'photo', 'upload', 'img'],
    run: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      editor.storage.slashCommand.insertImage?.(editor.state.selection.from)
    },
  },
]

/**
 * Filters commands by a case-insensitive match against the localized title or the aliases. Order is
 * preserved so the menu stays stable as the query narrows. The Image command is dropped when image
 * insertion isn't available (`allowImages: false`) — e.g. the modal field editors, which have no
 * upload affordance.
 */
export function filterSlashCommands(
  query: string,
  options?: { allowImages?: boolean; titles?: SlashCommandTitles }
): SlashCommandItem[] {
  const allowImages = options?.allowImages ?? true
  const titles = options?.titles ?? {}
  const available = allowImages ? SLASH_COMMANDS : SLASH_COMMANDS.filter((c) => c.id !== 'image')
  const q = query.trim().toLowerCase()
  if (!q) return [...available]
  return available.filter(
    (command) =>
      (titles[command.id]?.toLowerCase().includes(q) ?? false) ||
      command.aliases.some((alias) => alias.includes(q))
  )
}
