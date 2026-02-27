import type { SeedDomain } from './suggested-rooms'

export interface SuggestedRoomProjectSnapshot {
  projectName: string
  badges: string[]
  sourceLabel: string
}

const formatUsdCompact = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return null
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return `$${Math.round(value)}`
}

const formatSourceLabel = (source?: string) => {
  if (!source) return 'Source: on-chain index'
  if (source.toLowerCase() === 'defillama') return 'Source: DeFiLlama'
  return `Source: ${source}`
}

const resolveChainLabel = (room: SeedDomain) => {
  if (typeof room.chain === 'string' && room.chain.trim().length > 0) {
    return room.chain.trim()
  }
  if (Array.isArray(room.chains) && room.chains.length > 0) {
    return room.chains.slice(0, 2).join(' / ')
  }
  return 'Chain: n/a'
}

export const buildSuggestedRoomProjectSnapshot = (room: SeedDomain): SuggestedRoomProjectSnapshot => {
  const badges: string[] = []
  const chainLabel = resolveChainLabel(room)
  if (chainLabel) {
    badges.push(chainLabel)
  }

  const tvlLabel = typeof room.tvlUsd === 'number' ? formatUsdCompact(room.tvlUsd) : null
  if (tvlLabel) {
    badges.push(`TVL ${tvlLabel}`)
  }

  if (typeof room.sourceRank === 'number' && Number.isFinite(room.sourceRank)) {
    badges.push(`Rank #${room.sourceRank}`)
  }

  if (!badges.length) {
    badges.push('Metrics syncing')
  }

  return {
    projectName: room.project?.trim() || room.hostname,
    badges: badges.slice(0, 3),
    sourceLabel: formatSourceLabel(room.source)
  }
}
