import { normalizeRoomHostname } from '@/utils/roomRouting'

export interface SeedDomain {
  hostname: string
  category: string
  project?: string
  chain?: string | null
  tvlUsd?: number
  sourceRank?: number
  source?: string
  trafficTier?: 'high' | 'medium' | 'emerging'
}

interface SelectSuggestedRoomsOptions {
  seedDomains: SeedDomain[]
  currentHostname: string
  count?: number
}

const shuffle = <T>(list: T[]) => {
  const next = [...list]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[randomIndex]] = [next[randomIndex], next[index]]
  }
  return next
}

export const selectSuggestedRooms = ({
  seedDomains,
  currentHostname,
  count = 3
}: SelectSuggestedRoomsOptions): SeedDomain[] => {
  const normalizedCurrentHostname = normalizeRoomHostname(currentHostname)
  const filtered = seedDomains.filter((domain) => normalizeRoomHostname(domain.hostname) !== normalizedCurrentHostname)
  return shuffle(filtered).slice(0, Math.max(0, count))
}
