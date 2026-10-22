import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { FileViewer } from './file-viewer'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('files.page')
  return { title: t('fileTitle'), robots: { index: false } }
}

export default FileViewer
