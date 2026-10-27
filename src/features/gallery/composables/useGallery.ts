import PhotoSwipe from 'photoswipe'
import { ovDone, ovPush } from '../../../composables/useApp'

export interface Shot {
  o: string
  m: string
  s: string
}

interface GalleryHost {
  setIndex: (index: number) => void
  onClose: () => void
}

export const openGallery = async (name: string, imgs: Shot[], index: number, host: GalleryHost) => {
  if (!imgs.length) return
  const items = imgs.map((shot, position) => ({
    src: shot.o,
    msrc: shot.m,
    width: 1280,
    height: 720,
    alt: `${name} — foto ${position + 1} de ${imgs.length}`,
  }))
  const pswp = new PhotoSwipe({
    dataSource: items,
    index,
    bgOpacity: 0.97,
    loop: false,
    wheelToZoom: true,
    returnFocus: false,
    closeTitle: 'Cerrar',
    zoomTitle: 'Ampliar o reducir',
    arrowPrevTitle: 'Foto anterior',
    arrowNextTitle: 'Foto siguiente',
    errorMsg: 'No se pudo cargar la foto',
    indexIndicatorSep: ' / ',
    preloaderDelay: 200,
  })
  pswp.on('loadComplete', ({ content, slide }) => {
    const el = content.element as HTMLImageElement | undefined
    if (!el || !el.naturalWidth) return
    if (content.data.width === el.naturalWidth && content.data.height === el.naturalHeight) return
    content.data.width = el.naturalWidth
    content.data.height = el.naturalHeight
    content.width = el.naturalWidth
    content.height = el.naturalHeight
    slide.width = el.naturalWidth
    slide.height = el.naturalHeight
    if (slide.calculateSize) {
      slide.calculateSize()
      slide.zoomAndPanToInitial()
      slide.applyCurrentZoomPan()
    }
  })
  pswp.addFilter('contentErrorElement', (el, content) => {
    const box = document.createElement('div')
    box.className = 'pswp__err'
    const label = document.createElement('span')
    label.textContent = 'No se pudo cargar esta foto'
    const retry = document.createElement('button')
    retry.textContent = 'Reintentar'
    retry.onclick = () => {
      try {
        if (content.slide) content.slide.container.innerText = ''
        content.state = 'loading'
        content.displayedImageWidth = 0
        content.load(false, true)
      } catch (e) {
        pswp.refreshSlideContent(content.index)
      }
    }
    box.append(label, retry)
    return box
  })
  if (imgs.length > 1) pswp.on('uiRegister', () => pswp.ui?.registerElement({
    name: 'thumbs',
    order: 9,
    isButton: false,
    appendTo: 'root',
    html: '<div class="pswp__thumbs" role="group" aria-label="Fotos"></div>',
    onInit: (el, ps) => {
      el.innerHTML = imgs.map((shot, position) => `<button aria-label="Foto ${position + 1}"><img src="${shot.s}" alt=""></button>`).join('')
      const mark = () => [...el.children].forEach((button, position) => {
        if (position === ps.currIndex) button.setAttribute('aria-current', 'true')
        else button.removeAttribute('aria-current')
      })
      el.addEventListener('click', (ev) => {
        const button = (ev.target as HTMLElement).closest('button')
        if (button) ps.goTo([...el.children].indexOf(button))
      })
      ps.on('change', mark)
      mark()
    },
  }))
  pswp.on('change', () => host.setIndex(pswp.currIndex))
  pswp.on('close', () => {
    window.PSWP = null
    const restore = () => host.onClose()
    if (!ovDone('gal', restore)) restore()
  })
  window.PSWP = pswp
  ovPush('gal')
  pswp.init()
}

export const useGallery = () => ({ openGallery })
