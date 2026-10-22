import { useTranslations } from 'next-intl'
import type { ImageUploadCopy } from '@/app/workspace/[workspaceId]/files/components/file-viewer/rich-markdown-editor/image-upload'
import type { SlashCommandTitles } from '@/app/workspace/[workspaceId]/files/components/file-viewer/rich-markdown-editor/slash-command/commands'

/** Text the plain extensions render, translated by the React host that builds the editor. */
export interface MarkdownEditorCopy {
  slashCommandTitles: SlashCommandTitles
  imageUpload: ImageUploadCopy
}

/** The {@link MarkdownEditorCopy} for the current locale, read once when a host builds its extensions. */
export function useMarkdownEditorCopy(): MarkdownEditorCopy {
  const t = useTranslations('files.editor')
  return {
    slashCommandTitles: {
      text: t('slashCommands.items.text'),
      heading1: t('slashCommands.items.heading1'),
      heading2: t('slashCommands.items.heading2'),
      heading3: t('slashCommands.items.heading3'),
      bulletedList: t('slashCommands.items.bulletedList'),
      numberedList: t('slashCommands.items.numberedList'),
      checklist: t('slashCommands.items.checklist'),
      quote: t('slashCommands.items.quote'),
      codeBlock: t('slashCommands.items.codeBlock'),
      chart: t('slashCommands.items.chart'),
      table: t('slashCommands.items.table'),
      divider: t('slashCommands.items.divider'),
      image: t('slashCommands.items.image'),
    },
    imageUpload: {
      uploading: (label) => t('imageUpload.uploading', { label }),
      cancel: t('imageUpload.cancel'),
      cancelAriaLabel: (label) => t('imageUpload.cancelAriaLabel', { label }),
      cancelTitle: t('imageUpload.cancelTitle'),
    },
  }
}
