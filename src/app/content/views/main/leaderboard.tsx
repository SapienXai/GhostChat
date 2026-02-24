import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { RoomUser, SiteStats } from '@/domain/VirtualRoom'
import { cn } from '@/utils'
import { FlameIcon, MessageCircleIcon, TimerIcon, UsersIcon } from 'lucide-react'
import { type FC, useMemo } from 'react'

interface LeaderboardProject {
  id: string
  name: string
  origin: string
  description: string
  tags: string[]
  activeUsers: number
  messages24h: number
  lastActivityAt: number
  hotScore: number
}

const FALLBACK_PROJECTS: Omit<LeaderboardProject, 'hotScore'>[] = [
  {
    id: 'fallback-uniswap',
    name: 'Uniswap',
    origin: 'https://app.uniswap.org',
    description: 'DEX traders discussing pools, fees, and new token momentum.',
    tags: ['DEX', 'Ethereum'],
    activeUsers: 46,
    messages24h: 482,
    lastActivityAt: Date.now() - 4 * 60 * 1000
  },
  {
    id: 'fallback-opensea',
    name: 'OpenSea',
    origin: 'https://opensea.io',
    description: 'NFT collectors sharing mints, floor moves, and collection alerts.',
    tags: ['NFT', 'Marketplace'],
    activeUsers: 31,
    messages24h: 308,
    lastActivityAt: Date.now() - 8 * 60 * 1000
  },
  {
    id: 'fallback-jupiter',
    name: 'Jupiter',
    origin: 'https://jup.ag',
    description: 'Solana swap crowd talking routes, slippage, and token narratives.',
    tags: ['Solana', 'Aggregator'],
    activeUsers: 27,
    messages24h: 244,
    lastActivityAt: Date.now() - 12 * 60 * 1000
  }
]

const getHostLabel = (origin: string) => {
  try {
    return new URL(origin).hostname.replace(/^www\./i, '')
  } catch {
    return origin
  }
}

const getHotScore = (project: Omit<LeaderboardProject, 'hotScore'>) => {
  const inactivityMinutes = Math.floor((Date.now() - project.lastActivityAt) / 60000)
  const recencyBoost = Math.max(0, 30 - Math.floor(inactivityMinutes / 5))
  return Math.round(project.activeUsers * 4 + project.messages24h / 12 + recencyBoost)
}

const getRelativeLastActive = (lastActivityAt: number) => {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - lastActivityAt) / 60000))
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const getTags = (origin: string) => {
  const host = getHostLabel(origin)
  if (host.includes('opensea')) return ['NFT', 'Marketplace']
  if (host.includes('blur')) return ['NFT', 'Pro Trading']
  if (host.includes('uniswap') || host.includes('pancake') || host.includes('curve')) return ['DEX', 'Swap']
  if (host.includes('jup') || host.includes('raydium')) return ['Solana', 'Trading']
  if (host.includes('aave') || host.includes('compound')) return ['Lending', 'DeFi']
  return ['Web3', 'Community']
}

const buildDynamicProjects = (virtualUsers: RoomUser[]) => {
  const groups = virtualUsers
    .flatMap((user) => user.fromInfos.map((fromInfo) => ({ fromInfo, user })))
    .reduce<Map<string, { users: RoomUser[]; title: string; description: string }>>((acc, item) => {
      const key = item.fromInfo.origin
      const existing = acc.get(key)
      const users = existing?.users ?? []
      if (!users.some((user) => user.userId === item.user.userId)) {
        users.push(item.user)
      }
      acc.set(key, {
        users,
        title: item.fromInfo.title,
        description: item.fromInfo.description
      })
      return acc
    }, new Map())

  return [...groups.entries()].map(([origin, group]) => {
    const activeUsers = group.users.length
    const maxJoinTime = group.users.reduce((latest, user) => Math.max(latest, user.joinTime), Date.now())
    const estimatedMessages = Math.max(24, Math.round(activeUsers * 36 + getHostLabel(origin).length * 1.3))
    const name = group.title?.trim() || getHostLabel(origin)
    const description =
      group.description?.trim() || `Community chat for ${getHostLabel(origin)} users sharing live updates.`
    const baseProject: Omit<LeaderboardProject, 'hotScore'> = {
      id: origin,
      name,
      origin,
      description,
      tags: getTags(origin),
      activeUsers,
      messages24h: estimatedMessages,
      lastActivityAt: maxJoinTime
    }
    return { ...baseProject, hotScore: getHotScore(baseProject) }
  })
}

export interface LeaderboardProps {
  virtualUsers: RoomUser[]
  siteStats: SiteStats[]
  mode: 'trending' | 'new-rising'
}

const Leaderboard: FC<LeaderboardProps> = ({ virtualUsers, siteStats, mode }) => {
  const projects = useMemo(() => {
    const statsByOrigin = new Map(siteStats.map((stats) => [stats.origin, stats]))
    const dynamicProjects = buildDynamicProjects(virtualUsers)
    const dynamicProjectsWithStats = dynamicProjects.map((project) => {
      const stats = statsByOrigin.get(project.origin)
      if (!stats) {
        return project
      }
      return {
        ...project,
        name: stats.title?.trim() || project.name,
        description: stats.description?.trim() || project.description,
        messages24h: Math.max(project.messages24h, stats.messages24h),
        activeUsers: Math.max(project.activeUsers, stats.activeUsers),
        lastActivityAt: Math.max(project.lastActivityAt, stats.lastActivityAt),
        hotScore: getHotScore({
          ...project,
          messages24h: Math.max(project.messages24h, stats.messages24h),
          activeUsers: Math.max(project.activeUsers, stats.activeUsers),
          lastActivityAt: Math.max(project.lastActivityAt, stats.lastActivityAt)
        })
      }
    })
    const byOrigin = new Set(dynamicProjectsWithStats.map((project) => project.origin))
    const merged = [...dynamicProjectsWithStats]

    siteStats.forEach((stats) => {
      if (!byOrigin.has(stats.origin)) {
        const baseProject: Omit<LeaderboardProject, 'hotScore'> = {
          id: stats.origin,
          name: stats.title?.trim() || getHostLabel(stats.origin),
          origin: stats.origin,
          description:
            stats.description?.trim() || `Community chat for ${getHostLabel(stats.origin)} users sharing live updates.`,
          tags: getTags(stats.origin),
          activeUsers: stats.activeUsers,
          messages24h: stats.messages24h,
          lastActivityAt: stats.lastActivityAt
        }
        merged.push({
          ...baseProject,
          hotScore: getHotScore(baseProject)
        })
        byOrigin.add(stats.origin)
      }
    })

    FALLBACK_PROJECTS.forEach((project) => {
      if (!byOrigin.has(project.origin)) {
        merged.push({ ...project, hotScore: getHotScore(project) })
        byOrigin.add(project.origin)
      }
    })

    if (mode === 'new-rising') {
      return merged
        .map((project) => {
          const freshnessScore = Math.max(0, 60 - Math.floor((Date.now() - project.lastActivityAt) / (1000 * 60 * 5)))
          const risingScore = Math.round(freshnessScore + project.activeUsers * 3 + project.messages24h / 18)
          return {
            ...project,
            hotScore: risingScore
          }
        })
        .toSorted((a, b) => b.hotScore - a.hotScore)
        .slice(0, 12)
    }

    return merged.toSorted((a, b) => b.hotScore - a.hotScore).slice(0, 12)
  }, [virtualUsers, siteStats, mode])

  return (
    <ScrollArea className="h-full bg-gradient-to-b from-slate-50 to-white px-3 pb-3 dark:from-slate-900 dark:to-slate-950">
      <div className="space-y-2 py-3">
        <div className="rounded-lg border border-slate-200 bg-white/90 p-2.5 dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <FlameIcon size={13} className="text-orange-500" />
            <span>{mode === 'trending' ? 'Global Trending Projects' : 'New & Rising Projects'}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {mode === 'trending'
              ? 'Ranked by active users, recent activity, and message volume.'
              : 'Fresh projects gaining traction right now across the network.'}
          </p>
        </div>

        {projects.map((project, index) => (
          <div
            key={project.id}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold',
                      index < 3
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    #{index + 1}
                  </span>
                  <h4 className="line-clamp-1 text-sm font-semibold text-slate-700 dark:text-slate-100">
                    {project.name}
                  </h4>
                </div>
                <a
                  href={project.origin}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-2xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {getHostLabel(project.origin)}
                </a>
              </div>
              <Badge variant="secondary" className="text-2xs">
                Hot {project.hotScore}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{project.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-2xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-2xs text-slate-500 dark:text-slate-400">
              <div className="rounded-md bg-slate-100 px-2 py-1.5 dark:bg-slate-800/80">
                <div className="mb-0.5 flex items-center gap-1">
                  <UsersIcon size={10} />
                  <span>Active</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">{project.activeUsers}</div>
              </div>
              <div className="rounded-md bg-slate-100 px-2 py-1.5 dark:bg-slate-800/80">
                <div className="mb-0.5 flex items-center gap-1">
                  <MessageCircleIcon size={10} />
                  <span>24h Msg</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">{project.messages24h}</div>
              </div>
              <div className="rounded-md bg-slate-100 px-2 py-1.5 dark:bg-slate-800/80">
                <div className="mb-0.5 flex items-center gap-1">
                  <TimerIcon size={10} />
                  <span>Last</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                  {getRelativeLastActive(project.lastActivityAt)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

Leaderboard.displayName = 'Leaderboard'

export default Leaderboard
