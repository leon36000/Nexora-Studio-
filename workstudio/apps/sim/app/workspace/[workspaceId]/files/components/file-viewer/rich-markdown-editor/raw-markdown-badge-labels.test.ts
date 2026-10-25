import { afterEach, describe, expect, it } from 'vitest'
import {
  FootnoteDef,
  FootnoteRef,
  RawHtmlBlock,
  RawInlineHtml,
  setRawMarkdownBadgeLabels,
} from '@/app/workspace/[workspaceId]/files/components/file-viewer/rich-markdown-editor/raw-markdown-snippet-schema'

/** The badge text a verbatim node renders into its `data-raw-markdown-label` attribute. */
function badgeOf(node: { config: { renderHTML?: unknown } }): unknown {
  const render = node.config.renderHTML as (props: { HTMLAttributes: object }) => unknown[]
  return (render({ HTMLAttributes: {} })[1] as Record<string, unknown>)['data-raw-markdown-label']
}

const ORIGINAL = { rawHtml: 'Raw HTML', footnote: 'Footnote', footnoteRef: 'Footnote ref' }

afterEach(() => setRawMarkdownBadgeLabels(ORIGINAL))

describe('raw markdown badges', () => {
  it('keep the original English text until the editor supplies its own', () => {
    expect(badgeOf(RawHtmlBlock)).toBe('Raw HTML')
    expect(badgeOf(RawInlineHtml)).toBe('Raw HTML')
    expect(badgeOf(FootnoteDef)).toBe('Footnote')
    expect(badgeOf(FootnoteRef)).toBe('Footnote ref')
  })

  it('read the interface language once the editor supplies it', () => {
    setRawMarkdownBadgeLabels({
      rawHtml: 'HTML brut',
      footnote: 'Note de bas de page',
      footnoteRef: 'Appel de note',
    })
    expect(badgeOf(RawHtmlBlock)).toBe('HTML brut')
    expect(badgeOf(RawInlineHtml)).toBe('HTML brut')
    expect(badgeOf(FootnoteDef)).toBe('Note de bas de page')
    expect(badgeOf(FootnoteRef)).toBe('Appel de note')
  })
})
