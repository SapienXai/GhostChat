import type { NormalMessage } from '@/domain/MessageList'
import type { SiteStats } from '@/domain/VirtualRoom'
import { normalizeRoomHostname } from '@/utils/roomRouting'
import type { SeedDomain } from './suggested-rooms'

const SIGNAL_WINDOW_MS = 90 * 60 * 1000

const FEE_KEYWORDS = ['fee', 'fees', 'gas', 'slippage', 'spread', 'bridge fee', 'maker fee', 'taker fee']
const RISK_KEYWORDS = ['scam', 'phishing', 'rug', 'exploit', 'drainer', 'drain', 'hack', 'malware']

export type SuggestedRoomSignalTone = 'hot' | 'info' | 'alert' | 'neutral'

export interface SuggestedRoomSignal {
  text: string
  tone: SuggestedRoomSignalTone
}

export interface SuggestedRoomWithSignal extends SeedDomain {
  signal: SuggestedRoomSignal
}

interface BuildSuggestedRoomSignalsOptions {
  rooms: SeedDomain[]
  siteStats: SiteStats[]
  globalMessages: NormalMessage[]
  now?: number
}

interface MessageSignals {
  feeMentions: number
  riskMentions: number
}

const formatCompactCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  }
  return String(value)
}

const countKeywordHits = (text: string, keywords: string[]) => {
  const normalized = text.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword)) ? 1 : 0
}

const buildMessageSignalsByHostname = (messages: NormalMessage[], now: number) => {
  const recentMessages = messages.filter((message) => {
    if (message.sendTime < now - SIGNAL_WINDOW_MS) return false
    return typeof message.fromInfo?.hostname === 'string' && message.fromInfo.hostname.length > 0
  })

  return recentMessages.reduce<Map<string, MessageSignals>>((acc, message) => {
    const normalizedHostname = normalizeRoomHostname(message.fromInfo?.hostname ?? '')
    if (!normalizedHostname) return acc

    const body = typeof message.body === 'string' ? message.body : ''
    const current = acc.get(normalizedHostname) ?? { feeMentions: 0, riskMentions: 0 }
    const next: MessageSignals = {
      feeMentions: current.feeMentions + countKeywordHits(body, FEE_KEYWORDS),
      riskMentions: current.riskMentions + countKeywordHits(body, RISK_KEYWORDS)
    }
    acc.set(normalizedHostname, next)
    return acc
  }, new Map())
}

const getSignalFromStats = ({
  room,
  stats,
  messageSignals,
  now
}: {
  room: SeedDomain
  stats?: SiteStats
  messageSignals?: MessageSignals
  now: number
}): SuggestedRoomSignal => {
  const riskMentions = messageSignals?.riskMentions ?? 0
  if (riskMentions >= 2) {
    return {
      text: `🚨 ${formatCompactCount(riskMentions)} risk signals`,
      tone: 'alert'
    }
  }

  const feeMentions = messageSignals?.feeMentions ?? 0
  if (feeMentions >= 2) {
    return {
      text: `⚡ ${formatCompactCount(feeMentions)} discussing fees`,
      tone: 'info'
    }
  }

  const activeUsers = stats?.activeUsers ?? 0
  if (activeUsers > 0) {
    return {
      text: `🔥 ${formatCompactCount(activeUsers)} online`,
      tone: 'hot'
    }
  }

  const messages24h = stats?.messages24h ?? 0
  if (messages24h > 0) {
    return {
      text: `💬 ${formatCompactCount(messages24h)} messages / 24h`,
      tone: 'info'
    }
  }

  if (stats && now - stats.lastActivityAt <= 15 * 60 * 1000) {
    return {
      text: '⚡ active now',
      tone: 'info'
    }
  }

  if (typeof room.sourceRank === 'number' && Number.isFinite(room.sourceRank)) {
    return {
      text: `🧭 rank #${room.sourceRank}`,
      tone: 'neutral'
    }
  }

  return {
    text: '🧭 explore room',
    tone: 'neutral'
  }
}

export const buildSuggestedRoomSignals = ({
  rooms,
  siteStats,
  globalMessages,
  now = Date.now()
}: BuildSuggestedRoomSignalsOptions): SuggestedRoomWithSignal[] => {
  const statsByHostname = new Map(
    siteStats
      .map((stats) => [normalizeRoomHostname(stats.hostname), stats] as const)
      .filter(([hostname]) => Boolean(hostname))
  )
  const messageSignalsByHostname = buildMessageSignalsByHostname(globalMessages, now)

  return rooms.map((room) => {
    const hostname = normalizeRoomHostname(room.hostname)
    const stats = hostname ? statsByHostname.get(hostname) : undefined
    const messageSignals = hostname ? messageSignalsByHostname.get(hostname) : undefined

    return {
      ...room,
      signal: getSignalFromStats({
        room,
        stats,
        messageSignals,
        now
      })
    }
  })
}
