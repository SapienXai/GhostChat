import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from '@/components/link'
import { version } from '@/../package.json'
import browser from 'webextension-polyfill'

const compareSemver = (a: string, b: string) => {
  const aParts = a.split('.').map((item) => Number.parseInt(item, 10) || 0)
  const bParts = b.split('.').map((item) => Number.parseInt(item, 10) || 0)
  const maxLength = Math.max(aParts.length, bParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const aValue = aParts[index] ?? 0
    const bValue = bParts[index] ?? 0
    if (aValue > bValue) return 1
    if (aValue < bValue) return -1
  }

  return 0
}

type ChromeUpdateStatus = 'throttled' | 'no_update' | 'update_available'
type ChromeUpdateDetails = {
  version?: string
}
type RemoteReleaseInfo = {
  version?: string
  downloadUrl?: string
  notesUrl?: string
  downloads?: {
    chrome?: string
    edge?: string
    firefox?: string
  }
}
type GitHubLatestRelease = {
  tag_name?: string
  html_url?: string
  assets?: Array<{
    browser_download_url?: string
    name?: string
  }>
}
type UpdateState = 'idle' | 'checking' | 'upToDate' | 'updateAvailable' | 'error'

const getBrowserKey = (): 'chrome' | 'edge' | 'firefox' => {
  if (import.meta.env.FIREFOX) return 'firefox'
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Edg/')) return 'edge'
  return 'chrome'
}

const getPlatformDownloadUrl = (data: RemoteReleaseInfo): string | null => {
  const browserKey = getBrowserKey()
  const browserDownloadUrl = data.downloads?.[browserKey]
  if (browserDownloadUrl) return browserDownloadUrl
  if (data.downloadUrl) return data.downloadUrl
  if (data.notesUrl) return data.notesUrl
  return null
}

const VersionLink: FC = () => {
  const installedVersion = useMemo(() => {
    try {
      return browser.runtime.getManifest().version
    } catch {
      return version
    }
  }, [])

  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [updateUrl, setUpdateUrl] = useState('https://sapienx.app/ghostchat/')
  const [updateState, setUpdateState] = useState<UpdateState>('idle')

  const checkUpdates = async () => {
    if (updateState === 'checking') return
    setUpdateState('checking')

    let candidateVersion: string | null = null
    let candidateUrl = 'https://github.com/SapienXai/GhostChat/releases'
    let checkedAnySource = false
    let remoteChecked = false

    const runtime = (
      globalThis as typeof globalThis & {
        chrome?: {
          runtime?: {
            requestUpdateCheck?: (callback: (status: ChromeUpdateStatus, details?: ChromeUpdateDetails) => void) => void
          }
        }
      }
    ).chrome?.runtime

    try {
      const requestUpdateCheck = runtime?.requestUpdateCheck
      if (typeof requestUpdateCheck === 'function') {
        const chromeVersion = await new Promise<string | null>((resolve) => {
          requestUpdateCheck((status: ChromeUpdateStatus, details?: ChromeUpdateDetails) => {
            if (status === 'update_available' && details?.version) {
              resolve(details.version)
              return
            }
            resolve(null)
          })
        })

        if (chromeVersion && compareSemver(installedVersion, chromeVersion) < 0) {
          candidateVersion = chromeVersion
        }
      }
    } catch {
      // Ignore runtime check errors and continue with fallback.
    }

    try {
      const remoteUrls = [
        'https://raw.githubusercontent.com/SapienXai/GhostChat/master/public/update.json',
        'https://raw.githubusercontent.com/SapienXai/GhostChat/main/public/update.json'
      ]

      for (const remoteUrl of remoteUrls) {
        const response = await fetch(remoteUrl, { cache: 'no-store' })
        if (!response.ok) continue

        remoteChecked = true
        checkedAnySource = true

        const data = (await response.json()) as RemoteReleaseInfo
        const platformUrl = getPlatformDownloadUrl(data)
        if (platformUrl) candidateUrl = platformUrl

        if (data.version && compareSemver(installedVersion, data.version) < 0) {
          if (!candidateVersion || compareSemver(candidateVersion, data.version) < 0) {
            candidateVersion = data.version
          }
        }

        break
      }

      if (!remoteChecked) {
        const latestReleaseResponse = await fetch('https://api.github.com/repos/SapienXai/GhostChat/releases/latest', {
          cache: 'no-store'
        })
        if (latestReleaseResponse.ok) {
          checkedAnySource = true
          remoteChecked = true
          const release = (await latestReleaseResponse.json()) as GitHubLatestRelease
          const tagVersion = (release.tag_name ?? '').replace(/^v/i, '')

          const browserKey = getBrowserKey()
          const assetNamePart = `-${browserKey}.zip`
          const preferredAssetUrl = release.assets?.find((asset) =>
            asset.name?.includes(assetNamePart)
          )?.browser_download_url
          const fallbackAssetUrl = release.assets?.find((asset) => asset.name?.endsWith('.zip'))?.browser_download_url
          candidateUrl = preferredAssetUrl || fallbackAssetUrl || release.html_url || candidateUrl

          if (tagVersion && compareSemver(installedVersion, tagVersion) < 0) {
            candidateVersion = tagVersion
          }
        }
      }
    } catch {
      // Ignore network errors and use available data.
    }

    if (candidateVersion && compareSemver(installedVersion, candidateVersion) < 0) {
      setAvailableVersion(candidateVersion)
      setUpdateUrl(candidateUrl)
      setUpdateState('updateAvailable')
      return
    }

    if (!remoteChecked && !checkedAnySource) {
      setUpdateState('error')
      return
    }

    if (!remoteChecked) {
      setUpdateState('error')
      return
    }

    setAvailableVersion(null)
    setUpdateUrl('https://github.com/SapienXai/GhostChat/releases')
    setUpdateState('upToDate')
  }

  return (
    <div className="fixed right-4 top-2 flex items-center gap-2">
      <Button size="lg" variant="ghost" className="rounded-full px-3 text-base font-medium text-primary">
        <Link href="https://github.com/SapienXai/GhostChat">Version: v{installedVersion}</Link>
      </Button>
      {updateState === 'updateAvailable' && availableVersion && (
        <span className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Update v{availableVersion}
        </span>
      )}
      {updateState === 'upToDate' && (
        <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-100">
          You are up to date
        </span>
      )}
      {updateState === 'error' && (
        <span className="rounded-full bg-rose-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Update check failed
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        className="rounded-full px-3 text-xs font-medium"
        onClick={() => {
          void checkUpdates()
        }}
      >
        {updateState === 'checking' ? 'Checking...' : 'Check update'}
      </Button>
      {updateState === 'updateAvailable' && (
        <Button size="sm" className="rounded-full px-3 text-xs font-medium">
          <Link href={updateUrl}>Download update</Link>
        </Button>
      )}
    </div>
  )
}

VersionLink.displayName = 'VersionLink'

export default VersionLink
