import { browser } from '#imports'
import type { PublicPath } from 'wxt/browser'
import createElement from './createElement'

const injectScript = async (path: PublicPath) => {
  const src = browser.runtime.getURL(path)
  const script = createElement<HTMLScriptElement>(`<script src="${src}"></script>`)
  script.async = false
  script.defer = false

  return await new Promise<Event>((resolve, reject) => {
    script.onload = (e) => {
      script.parentElement?.removeChild(script)
      resolve(e as Event)
    }
    script.onerror = (e) => {
      script.parentElement?.removeChild(script)
      reject(e)
    }

    document.documentElement.appendChild(script)
  })
}

export default injectScript
