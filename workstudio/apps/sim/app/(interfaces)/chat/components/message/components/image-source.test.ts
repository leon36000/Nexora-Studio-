/**
 * A model's answer can embed `![](https://tracker.example/pixel?q=…)`: displaying it sends the
 * reader's request (and whatever the model put in the address) to a third party. Only images of
 * this origin and inline `data:image` images are displayed; others become links, anything else text.
 */
import { describe, expect, it } from 'vitest'
import { imageSourcePolicy } from '@/app/(interfaces)/chat/components/message/components/image-source'

const ORIGIN = 'https://studio.pme.fr'

describe('imageSourcePolicy', () => {
  it.each([
    ['/api/files/serve/logo.png', 'embed'],
    ['https://studio.pme.fr/api/files/serve/logo.png', 'embed'],
    ['data:image/png;base64,iVBORw0KGgo=', 'embed'],
    ['https://tracker.example/pixel.gif?q=secret', 'link'],
    ['//tracker.example/pixel.gif', 'link'],
    ['http://studio.pme.fr.evil.example/a.png', 'link'],
    ['data:text/html;base64,PHNjcmlwdD4=', 'text'],
    ['javascript:alert(1)', 'text'],
    ['', 'text'],
  ])('treats %s as %s', (src, expected) => {
    expect(imageSourcePolicy(src, ORIGIN)).toBe(expected)
  })
})
