import type { NormalMessage } from '@/domain/MessageList'
import type { RoomUser, SiteStats } from '@/domain/VirtualRoom'
import { normalizeRoomHostname } from '@/utils/roomRouting'

const SIGNAL_WINDOW_MS = 90 * 60 * 1000
const FEE_KEYWORDS = ['fee', 'fees', 'gas', 'slippage', 'spread', 'bridge fee', 'maker fee', 'taker fee']
const RISK_KEYWORDS = ['scam', 'phishing', 'rug', 'exploit', 'drainer', 'drain', 'hack', 'malware']

export type ActiveRoomSignalTone = 'hot' | 'info' | 'alert' | 'neutral'

export interface ActiveRoomSignal {
  text: string
  tone: ActiveRoomSignalTone
}

export interface ActiveRoom {
  hostname: string
  origin: string
  activeUsers: number
  signal: ActiveRoomSignal
}

interface SelectActiveRoomsOptions {
  virtualUsers: RoomUser[]
  currentHostname: string
  siteStats: SiteStats[]
  globalMessages: NormalMessage[]
  count?: number
  now?: number
}

interface MessageSignals {
  feeMentions: number
  riskMentions: number
}

const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, '')

const formatCompactCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  }
  return String(value)
}

const formatRelativeActivity = (lastActivityAt: number, now: number) => {
  const diffMinutes = Math.max(0, Math.floor((now - lastActivityAt) / 60000))
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
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

const getActiveRoomSignal = ({
  room,
  stats,
  messageSignals,
  now
}: {
  room: Omit<ActiveRoom, 'signal'>
  stats?: SiteStats
  messageSignals?: MessageSignals
  now: number
}): ActiveRoomSignal => {
  const riskMentions = messageSignals?.riskMentions ?? 0
  if (riskMentions >= 1) {
    return {
      text: `🚨 ${formatCompactCount(riskMentions)} risk signals`,
      tone: 'alert'
    }
  }

  const feeMentions = messageSignals?.feeMentions ?? 0
  if (feeMentions >= 1) {
    return {
      text: `⚡ ${formatCompactCount(feeMentions)} discussing fees`,
      tone: 'info'
    }
  }

  const messages24h = stats?.messages24h ?? 0
  if (messages24h > 0) {
    return {
      text: `💬 ${formatCompactCount(messages24h)} messages / 24h`,
      tone: 'info'
    }
  }

  if (stats?.lastActivityAt) {
    return {
      text: `🕒 active ${formatRelativeActivity(stats.lastActivityAt, now)}`,
      tone: 'info'
    }
  }

  if (stats?.reporters && stats.reporters > 0) {
    return {
      text: `📡 synced by ${formatCompactCount(stats.reporters)} peers`,
      tone: 'neutral'
    }
  }

  return {
    text: `🧭 ${formatCompactCount(room.activeUsers)} peers detected`,
    tone: 'neutral'
  }
}

export const selectActiveRooms = ({
  virtualUsers,
  currentHostname,
  siteStats,
  globalMessages,
  count = 5,
  now = Date.now()
}: SelectActiveRoomsOptions): ActiveRoom[] => {
  const normalizedCurrentHostname = normalizeRoomHostname(currentHostname)
  const grouped = new Map<string, { hostname: string; origin: string; userIds: Set<string> }>()
  const statsByHostname = new Map(
    siteStats
      .map((stats) => [normalizeRoomHostname(stats.hostname), stats] as const)
      .filter(([hostname]) => Boolean(hostname))
  )
  const messageSignalsByHostname = buildMessageSignalsByHostname(globalMessages, now)

  for (const user of virtualUsers) {
    for (const fromInfo of user.fromInfos) {
      const hostname = normalizeRoomHostname(fromInfo.hostname)
      if (!hostname || hostname === normalizedCurrentHostname) {
        continue
      }

      const origin = normalizeOrigin(fromInfo.origin || `https://${hostname}`)
      const key = origin || hostname
      const exist = grouped.get(key) ?? { hostname, origin, userIds: new Set<string>() }
      exist.userIds.add(user.userId)
      grouped.set(key, exist)
    }
  }

  const rooms: ActiveRoom[] = [...grouped.values()]
    .map((item) => {
      const baseRoom = {
        hostname: item.hostname,
        origin: item.origin,
        activeUsers: item.userIds.size
      }
      const hostname = normalizeRoomHostname(baseRoom.hostname)
      const stats = hostname ? statsByHostname.get(hostname) : undefined
      const messageSignals = hostname ? messageSignalsByHostname.get(hostname) : undefined

      return {
        room: {
          ...baseRoom,
          signal: getActiveRoomSignal({
            room: baseRoom,
            stats,
            messageSignals,
            now
          })
        },
        sortActiveUsers: stats?.activeUsers ?? baseRoom.activeUsers,
        sortMessages24h: stats?.messages24h ?? 0
      }
    })
    .filter((item) => item.sortActiveUsers > 0)
    .sort((a, b) => {
      if (b.sortActiveUsers !== a.sortActiveUsers) {
        return b.sortActiveUsers - a.sortActiveUsers
      }
      if (b.sortMessages24h !== a.sortMessages24h) {
        return b.sortMessages24h - a.sortMessages24h
      }
      return a.room.hostname.localeCompare(b.room.hostname)
    })
    .slice(0, Math.max(0, count))
    .map((item) => item.room)

  return rooms
}
