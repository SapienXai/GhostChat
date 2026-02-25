import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { RoomUser, SiteStats } from '@/domain/VirtualRoom'
import { cn } from '@/utils'
import { ExternalLinkIcon, FlameIcon, MessageCircleIcon, TimerIcon, UsersIcon } from 'lucide-react'
import { type FC, useMemo } from 'react'
import { CURATED_PROJECTS } from './curated-projects'

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
  tier?: ProjectTier
}

type ProjectTier = 'blue-chip' | 'established' | 'rising'
const TIER_BADGE_LABELS = ['Blue Chip', 'Established', 'Rising'] as const
const PINNED_MIDDLE_ORIGINS = ['https://coincollect.org/', 'https://questlayer.app/'] as const
const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, '')

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

const getTierLabel = (tier: ProjectTier) =>
  ({
    'blue-chip': 'Blue Chip',
    established: 'Established',
    rising: 'Rising'
  })[tier]

const getTierChipClassName = (tier: ProjectTier) =>
  ({
    'blue-chip':
      'border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
    established:
      'border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
    rising:
      'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
  })[tier]

const inferTierFromTags = (tags: string[]): ProjectTier => {
  if (tags.some((tag) => tag.toLowerCase() === 'blue chip')) return 'blue-chip'
  if (tags.some((tag) => tag.toLowerCase() === 'new & rising')) return 'rising'
  return 'established'
}

const isTierBadgeLabel = (tag: string): tag is (typeof TIER_BADGE_LABELS)[number] =>
  TIER_BADGE_LABELS.includes(tag as (typeof TIER_BADGE_LABELS)[number])

const tierFromBadgeLabel = (tag: (typeof TIER_BADGE_LABELS)[number]): ProjectTier =>
  (
    ({
      'Blue Chip': 'blue-chip',
      Established: 'established',
      Rising: 'rising'
    }) as const
  )[tag]

const applyPinnedMiddleProjects = (projects: LeaderboardProject[], pool: LeaderboardProject[]) => {
  const pinned = PINNED_MIDDLE_ORIGINS.map((origin) =>
    pool.find((project) => normalizeOrigin(project.origin) === normalizeOrigin(origin))
  ).filter(Boolean) as LeaderboardProject[]
  if (pinned.length === 0) return projects

  const list = projects.filter(
    (project) => !PINNED_MIDDLE_ORIGINS.some((origin) => normalizeOrigin(project.origin) === normalizeOrigin(origin))
  )
  const middleIndex = Math.min(5, list.length)
  pinned.forEach((project, index) => {
    list.splice(middleIndex + index, 0, project)
  })
  return list.slice(0, 12)
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

const getCuratedBaseProject = (curated: (typeof CURATED_PROJECTS)[number]): Omit<LeaderboardProject, 'hotScore'> => ({
  id: curated.id,
  name: curated.name,
  origin: curated.origin,
  description: curated.description,
  tags: curated.tags,
  activeUsers: curated.activeUsers,
  messages24h: curated.messages24h,
  lastActivityAt: Date.now() - curated.lastActiveMinutesAgo * 60 * 1000
})

export interface LeaderboardProps {
  virtualUsers: RoomUser[]
  siteStats: SiteStats[]
  mode: 'trending' | 'new-rising'
}

const Leaderboard: FC<LeaderboardProps> = ({ virtualUsers, siteStats, mode }) => {
  const projects = useMemo(() => {
    const curatedBoostByOrigin = new Map(
      CURATED_PROJECTS.map((project) => [
        normalizeOrigin(project.origin),
        { trending: project.trendingBoost, rising: project.risingBoost }
      ])
    )
    const curatedTierByOrigin = new Map(
      CURATED_PROJECTS.map((project) => [normalizeOrigin(project.origin), inferTierFromTags(project.tags)] as const)
    )
    const statsByOrigin = new Map(siteStats.map((stats) => [normalizeOrigin(stats.origin), stats]))
    const dynamicProjects = buildDynamicProjects(virtualUsers)
    const dynamicProjectsWithStats = dynamicProjects.map((project) => {
      const stats = statsByOrigin.get(normalizeOrigin(project.origin))
      if (!stats) {
        return {
          ...project,
          tier: inferTierFromTags(project.tags)
        }
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
        }),
        tier: inferTierFromTags(project.tags)
      }
    })
    const byOrigin = new Set(dynamicProjectsWithStats.map((project) => normalizeOrigin(project.origin)))
    const merged = [...dynamicProjectsWithStats]

    siteStats.forEach((stats) => {
      const normalizedOrigin = normalizeOrigin(stats.origin)
      if (!byOrigin.has(normalizedOrigin)) {
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
          hotScore: getHotScore(baseProject),
          tier: inferTierFromTags(baseProject.tags)
        })
        byOrigin.add(normalizedOrigin)
      }
    })

    CURATED_PROJECTS.forEach((curated) => {
      const baseProject = getCuratedBaseProject(curated)
      const normalizedOrigin = normalizeOrigin(baseProject.origin)
      if (!byOrigin.has(normalizedOrigin)) {
        merged.push({
          ...baseProject,
          hotScore: getHotScore(baseProject),
          tier: curatedTierByOrigin.get(normalizedOrigin) ?? inferTierFromTags(baseProject.tags)
        })
        byOrigin.add(normalizedOrigin)
      } else {
        const existingIndex = merged.findIndex((project) => normalizeOrigin(project.origin) === normalizedOrigin)
        if (existingIndex !== -1) {
          const existing = merged[existingIndex]
          const normalized: Omit<LeaderboardProject, 'hotScore'> = {
            ...existing,
            name: existing.name || baseProject.name,
            description: existing.description || baseProject.description,
            tags: existing.tags?.length ? existing.tags : baseProject.tags,
            activeUsers: Math.max(existing.activeUsers, baseProject.activeUsers),
            messages24h: Math.max(existing.messages24h, baseProject.messages24h),
            lastActivityAt: Math.max(existing.lastActivityAt, baseProject.lastActivityAt)
          }
          merged[existingIndex] = {
            ...normalized,
            hotScore: getHotScore(normalized),
            tier: curatedTierByOrigin.get(normalizedOrigin) ?? inferTierFromTags(normalized.tags)
          }
        }
      }
    })

    if (mode === 'new-rising') {
      const ranked = merged
        .map((project) => {
          const freshnessScore = Math.max(0, 60 - Math.floor((Date.now() - project.lastActivityAt) / (1000 * 60 * 5)))
          const curatedBoost = curatedBoostByOrigin.get(normalizeOrigin(project.origin))?.rising ?? 0
          const risingScore = Math.round(
            freshnessScore + project.activeUsers * 3 + project.messages24h / 18 + curatedBoost
          )
          return {
            ...project,
            hotScore: risingScore
          }
        })
        .toSorted((a, b) => b.hotScore - a.hotScore)
        .slice(0, 12)
      return applyPinnedMiddleProjects(ranked, merged)
    }

    const ranked = merged
      .map((project) => ({
        ...project,
        hotScore: project.hotScore + (curatedBoostByOrigin.get(normalizeOrigin(project.origin))?.trending ?? 0)
      }))
      .toSorted((a, b) => b.hotScore - a.hotScore)
      .slice(0, 12)
    return applyPinnedMiddleProjects(ranked, merged)
  }, [virtualUsers, siteStats, mode])

  return (
    <ScrollArea className="h-full min-h-0 overflow-hidden rounded-2xl border border-white/40 bg-white/45 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
      <div className="space-y-2 p-2 pb-4">
        <div className="rounded-lg border border-slate-200 bg-white/90 p-2.5 dark:border-white/10 dark:bg-slate-800/55 dark:backdrop-blur-md">
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
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/55 dark:backdrop-blur-md dark:hover:border-white/20 dark:hover:bg-slate-800/70"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold',
                      index < 3
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700/80 dark:text-slate-300'
                    )}
                  >
                    #{index + 1}
                  </span>
                  <a
                    href={project.origin}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-1 text-sm font-semibold text-slate-700 hover:underline dark:text-slate-100"
                  >
                    {project.name}
                  </a>
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
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-2xs">
                  Hot {project.hotScore}
                </Badge>
                <Button
                  asChild
                  size="xs"
                  variant="outline"
                  className="h-6 gap-1 rounded-md px-2 text-2xs text-slate-600 dark:text-slate-200"
                >
                  <a href={project.origin} target="_blank" rel="noreferrer">
                    Open
                    <ExternalLinkIcon size={10} />
                  </a>
                </Button>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{project.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                getTierLabel(project.tier ?? 'established'),
                ...project.tags.filter((tag) => !isTierBadgeLabel(tag))
              ].map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    'text-2xs',
                    isTierBadgeLabel(tag) ? getTierChipClassName(tierFromBadgeLabel(tag)) : undefined
                  )}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-2xs text-slate-500 dark:text-slate-400">
              <div className="rounded-md bg-slate-100 px-2 py-1.5 dark:bg-slate-700/65">
                <div className="mb-0.5 flex items-center gap-1">
                  <UsersIcon size={10} />
                  <span>Active</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">{project.activeUsers}</div>
              </div>
              <div className="rounded-md bg-slate-100 px-2 py-1.5 dark:bg-slate-700/65">
                <div className="mb-0.5 flex items-center gap-1">
                  <MessageCircleIcon size={10} />
                  <span>24h Msg</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">{project.messages24h}</div>
              </div>
              <div className="rounded-md bg-slate-100 px-2 py-1.5 dark:bg-slate-700/65">
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
