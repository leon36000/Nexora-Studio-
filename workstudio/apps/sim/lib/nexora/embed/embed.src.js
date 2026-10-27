/*
 * Nexora WorkStudio chat widget (source of public/embed.js, built by `bun run build:embed`).
 *
 *   <script src="https://<instance>/embed.js" data-nexora-chat="<identifiant>" async></script>
 *
 * Plain browser JavaScript, no dependency. It never builds markup from an attribute (createElement,
 * textContent and setAttribute only) and adds no stylesheet, so a strict Content-Security-Policy on
 * the host site does not break it.
 */
;(() => {
  const w = window
  const d = document
  if (w.NexoraChat) return
  let me = d.currentScript
  if (!me || !me.hasAttribute('data-nexora-chat')) me = d.querySelector('script[data-nexora-chat]')
  if (!me) return
  const warn = (message) => {
    if (w.console) w.console.warn(`[Nexora] ${message}`)
  }
  const attr = (name) => me.getAttribute(`data-${name}`)
  const id = attr('nexora-chat') || ''
  let origin = ''
  try {
    origin = new URL(me.src, w.location.href).origin
  } catch {}
  if (!/^[a-z0-9-]{1,100}$/.test(id)) return warn('identifiant de chat invalide')
  if (!/^https?:\/\//.test(origin)) return warn('adresse du script invalide')

  const en = /^en/i.test(d.documentElement.lang || '')
  const label = attr('label') || (en ? 'Chat with us' : 'Discuter avec nous')
  const closeLabel = en ? 'Close' : 'Fermer'
  const color = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(attr('color') || '')
    ? attr('color')
    : '#4F46E5'
  const left = attr('position') === 'left'
  const inline = attr('mode') === 'inline'
  const url = `${origin}/chat/${id}`
  const SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
  const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'
  const raf = w.requestAnimationFrame || ((fn) => fn())

  const media = (query) => !!w.matchMedia?.(query).matches
  const make = (tag, style, attributes) => {
    const node = d.createElement(tag)
    for (const key in style) node.style[key] = style[key]
    for (const key in attributes) node.setAttribute(key, attributes[key])
    return node
  }
  const ink = (hex) => {
    let h = hex.slice(1)
    if (h.length === 3) h = h.replace(/./g, '$&$&')
    const weights = [299, 587, 114]
    let sum = 0
    for (let i = 0; i < 3; i++) sum += Number.parseInt(h.substr(i * 2, 2), 16) * weights[i]
    return sum / 1000 > 150 ? '#111827' : '#ffffff'
  }
  const ring = (node) => {
    node.addEventListener('focus', () => {
      let visible = true
      try {
        visible = node.matches(':focus-visible')
      } catch {}
      if (visible) node.style.outline = '3px solid #93c5fd'
    })
    node.addEventListener('blur', () => {
      node.style.outline = 'none'
    })
  }
  const makeFrame = (style) => {
    const f = make('iframe', style, {
      src: url,
      title: label,
      sandbox: SANDBOX,
      allow: 'microphone; clipboard-write',
    })
    f.style.border = '0'
    f.addEventListener('load', () => {
      f.setAttribute('data-nexora-loaded', '1')
    })
    return f
  }
  const emit = (type) => {
    try {
      w.dispatchEvent(new CustomEvent(`nexora:${type}`, { detail: { chat: id } }))
    } catch {}
  }

  let isOpen = false
  let button
  let panel
  let iframe

  const layout = () => {
    const phone = media('(max-width:640px)')
    const s = panel.style
    s.top = phone ? '0px' : 'auto'
    s.bottom = phone ? '0px' : '88px'
    s[left ? 'left' : 'right'] = phone ? '0px' : '20px'
    s[left ? 'right' : 'left'] = phone ? '0px' : 'auto'
    s.width = phone ? '100%' : '380px'
    s.height = phone ? '100%' : '640px'
    s.maxWidth = '100%'
    s.maxHeight = phone ? '100%' : 'calc(100vh - 110px)'
    s.borderRadius = phone ? '0px' : '16px'
    button.style.display = phone && isOpen ? 'none' : 'flex'
  }

  const setOpen = (next) => {
    if (next === isOpen || inline) return
    isOpen = next
    if (next) {
      if (!iframe) {
        iframe = makeFrame({ flex: '1', width: '100%', background: '#fff' })
        panel.appendChild(iframe)
      }
      layout()
      panel.style.display = 'flex'
      if (!media('(prefers-reduced-motion: reduce)')) {
        panel.style.opacity = '0'
        panel.style.transform = 'translateY(8px)'
        panel.style.transition = 'opacity .18s ease, transform .18s ease'
        raf(() => {
          panel.style.opacity = '1'
          panel.style.transform = 'none'
        })
      }
      try {
        iframe.focus()
      } catch {}
    } else {
      panel.style.display = 'none'
      layout()
      try {
        button.focus()
      } catch {}
    }
    button.setAttribute('aria-expanded', String(next))
    emit(next ? 'open' : 'close')
    try {
      if (iframe?.hasAttribute('data-nexora-loaded') && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: 'nexora-embed', type: next ? 'open' : 'close' },
          origin
        )
      }
    } catch {}
  }

  const buildBubble = () => {
    button = make(
      'button',
      {
        position: 'fixed',
        bottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '52px',
        padding: '0 20px',
        border: '0',
        borderRadius: '26px',
        background: color,
        color: ink(color),
        font: `600 15px/1 ${FONT}`,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,.25)',
        zIndex: '2147483000',
      },
      {
        type: 'button',
        'aria-label': label,
        'aria-expanded': 'false',
        'aria-controls': 'nexora-chat-panel',
        'aria-haspopup': 'dialog',
      }
    )
    button.style[left ? 'left' : 'right'] = '20px'
    if (!media('(prefers-reduced-motion: reduce)')) button.style.transition = 'transform .15s ease'
    const ns = 'http://www.w3.org/2000/svg'
    const svg = d.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('width', '22')
    svg.setAttribute('height', '22')
    svg.setAttribute('aria-hidden', 'true')
    const path = d.createElementNS(ns, 'path')
    path.setAttribute('d', 'M4 4h16v12H8l-4 4z')
    path.setAttribute('fill', 'currentColor')
    svg.appendChild(path)
    button.appendChild(svg)
    button.appendChild(d.createTextNode(label))
    ring(button)
    button.addEventListener('click', () => setOpen(!isOpen))

    panel = make(
      'div',
      {
        position: 'fixed',
        display: 'none',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,.28)',
        zIndex: '2147483001',
      },
      { id: 'nexora-chat-panel', role: 'dialog', 'aria-label': label }
    )
    const head = make('div', {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px 0 16px',
      height: '44px',
      flex: 'none',
      background: color,
      color: ink(color),
      font: `600 14px/1 ${FONT}`,
    })
    const title = d.createElement('span')
    title.textContent = label
    const closeButton = make(
      'button',
      {
        width: '32px',
        height: '32px',
        border: '0',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: '22px',
        cursor: 'pointer',
      },
      { type: 'button', 'aria-label': closeLabel }
    )
    closeButton.textContent = '×'
    ring(closeButton)
    closeButton.addEventListener('click', () => setOpen(false))
    head.appendChild(title)
    head.appendChild(closeButton)
    panel.appendChild(head)
    d.body.appendChild(panel)
    d.body.appendChild(button)
    d.addEventListener('keydown', (event) => {
      if (isOpen && event.key === 'Escape') setOpen(false)
    })
    w.addEventListener('resize', () => {
      if (isOpen) layout()
    })
    layout()
  }

  const buildInline = () => {
    let target = null
    try {
      target = d.querySelector(attr('target') || '')
    } catch {}
    if (!target) return warn('cible introuvable (data-target)')
    iframe = makeFrame({ width: '100%', height: '100%', minHeight: '420px' })
    target.appendChild(iframe)
    iframe.addEventListener('load', () => emit('ready'))
    return true
  }

  const build = () => {
    if (inline) {
      if (!buildInline()) return
    } else {
      buildBubble()
    }
    w.addEventListener('message', (event) => {
      const data = event.data
      if (!iframe || event.origin !== origin || event.source !== iframe.contentWindow) return
      if (!data || data.source !== 'nexora-chat') return
      if (data.type === 'close') setOpen(false)
      else if (data.type === 'open') setOpen(true)
    })
    w.NexoraChat = {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!isOpen),
      isOpen: () => isOpen,
    }
    if (!inline && attr('open') !== null && attr('open') !== 'false') setOpen(true)
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', build)
  else build()
})()
