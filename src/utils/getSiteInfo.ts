import { buildFullURL } from '@/utils'

export interface SiteInfo {
  host: string
  hostname: string
  href: string
  origin: string
  title: string
  icon: string
  description: string
  twitter?: string
  telegram?: string
  discord?: string
}

const resolveIconURL = (path: string) => {
  if (path.startsWith('data:') || path.startsWith('//')) {
    return path
  }
  return buildFullURL(document.location.origin, path)
}

const getIconScore = (el: HTMLLinkElement): number => {
  const href = el.getAttribute('href') || ''
  const sizes = (el.getAttribute('sizes') || '').toLowerCase()
  if (!href) return -1

  // Prefer vector icons, then largest declared pixel size.
  if (sizes.includes('any') || href.endsWith('.svg')) return 10000

  const values = sizes
    .split(/\s+/)
    .map((item) => item.match(/^(\d+)x(\d+)$/i))
    .filter(Boolean)
    .map((match) => {
      const size = Number.parseInt(match![1], 10)
      return Number.isNaN(size) ? 0 : size
    })

  if (values.length > 0) {
    return Math.max(...values)
  }

  if (el.rel.toLowerCase().includes('apple-touch-icon')) return 180
  if (el.rel.toLowerCase().includes('icon')) return 16
  return 0
}

const getIcon = (): string => {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel*="icon" i]')].filter((el) =>
    Boolean(el.getAttribute('href'))
  )
  const bestLink = links.sort((a, b) => getIconScore(b) - getIconScore(a))[0]

  const path =
    bestLink?.getAttribute('href') ??
    document.querySelector('meta[property="og:image" i]')?.getAttribute('content') ??
    '/favicon.ico'

  return resolveIconURL(path)
}

const getSocialLink = (selector: string): string | undefined => {
  return document.querySelector<HTMLAnchorElement>(selector)?.href
}

const getSiteInfo = (): SiteInfo => {
  return {
    host: document.location.host,
    hostname: document.location.hostname,
    href: document.location.href,
    origin: document.location.origin,
    title:
      document.querySelector('meta[property="og:site_name" i]')?.getAttribute('content') ??
      document.querySelector('meta[property="og:title" i]')?.getAttribute('content') ??
      document.title,
    icon: getIcon(),
    description:
      document.querySelector('meta[property="og:description" i]')?.getAttribute('content') ??
      document.querySelector('meta[name="description" i]')?.getAttribute('content') ??
      '',
    twitter: getSocialLink('a[href*="twitter.com"]'),
    telegram: getSocialLink('a[href*="t.me"]'),
    discord: getSocialLink('a[href*="discord.gg"]')
  }
}

export default getSiteInfo
