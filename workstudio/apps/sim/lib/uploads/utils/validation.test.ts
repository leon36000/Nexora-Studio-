import { describe, expect, it } from 'vitest'
import {
  sniffImageContentType,
  validateAttachmentFileType,
  validateKnowledgeFileType,
} from '@/lib/uploads/utils/validation'

describe('sniffImageContentType', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
  const gif87 = Buffer.from('GIF87a....', 'latin1')
  const gif89 = Buffer.from('GIF89a....', 'latin1')
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP', 'latin1'),
  ])

  it('detects real raster image formats from magic bytes', () => {
    expect(sniffImageContentType(png)).toBe('image/png')
    expect(sniffImageContentType(jpeg)).toBe('image/jpeg')
    expect(sniffImageContentType(gif87)).toBe('image/gif')
    expect(sniffImageContentType(gif89)).toBe('image/gif')
    expect(sniffImageContentType(webp)).toBe('image/webp')
  })

  it('rejects non-image content, including image-shaped strings and SVG', () => {
    expect(
      sniffImageContentType(Buffer.from('<html><script>x</script></html>', 'utf-8'))
    ).toBeNull()
    expect(sniffImageContentType(Buffer.from('<svg xmlns="...">', 'utf-8'))).toBeNull()
    expect(sniffImageContentType(Buffer.from('RIFFxxxxAVI ', 'latin1'))).toBeNull()
    expect(sniffImageContentType(Buffer.alloc(0))).toBeNull()
    expect(sniffImageContentType(Buffer.from([0x89, 0x50]))).toBeNull()
  })
})

describe('validateAttachmentFileType', () => {
  it('rejects executables and unknown extensions', () => {
    expect(validateAttachmentFileType('virus.exe')?.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(validateAttachmentFileType('installer.msi')?.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(validateAttachmentFileType('archive.dmg')?.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(validateAttachmentFileType('binary.bin')?.code).toBe('UNSUPPORTED_FILE_TYPE')
  })

  it('rejects files with non-alphanumeric extensions', () => {
    expect(validateAttachmentFileType('odd.<>')?.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(validateAttachmentFileType('foo. ')?.code).toBe('UNSUPPORTED_FILE_TYPE')
  })
})

describe('validateKnowledgeFileType', () => {
  it('names the recordings and images a knowledge base accepts when it refuses a file', () => {
    const refusal = validateKnowledgeFileType('setup.exe', 'application/octet-stream')

    expect(refusal?.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(refusal?.message).toMatch(/^Unsupported file type: exe\. Supported types are: pdf, /)
    for (const extension of ['pdf', 'docx', 'wav', 'mp3', 'png', 'jpg']) {
      expect(refusal?.message).toContain(extension)
      expect(refusal?.supportedTypes).toContain(extension)
    }
  })
})
