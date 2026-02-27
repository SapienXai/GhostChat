import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { SiteStats } from '@/domain/VirtualRoom'
import { cn } from '@/utils'
import { DollarSignIcon, ExternalLinkIcon, FlameIcon, MessageCircleIcon, TimerIcon, UsersIcon } from 'lucide-react'
import { type FC, useMemo } from 'react'
import seedDomains from '@/data/seedDomains.json'
import type { SeedDomain } from './suggested-rooms'
import { normalizeRoomHostname } from '@/utils/roomRouting'

interface LeaderboardProject {
  id: string
  name: string
  hostname: string
  origin: string
  categoryLabel: string
  chainLabel: string
  sourceLabel: string
  sourceRank?: number
  tvlUsd?: number
  activeUsers: number
  messages24h: number
  lastActivityAt?: number
  trendScore: number
  risingScore: number
  tier: ProjectTier
}

type ProjectTier = 'blue-chip' | 'established' | 'rising'

const seedDomainList = seedDomains as SeedDomain[]

const formatCategoryLabel = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatUsdCompact = (value?: number) => {
  if (!Number.isFinite(value) || !value || value <= 0) return 'n/a'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return `$${Math.round(value)}`
}

const getRelativeLastActive = (lastActivityAt?: number) => {
  if (!lastActivityAt) return 'quiet'
  const diffMinutes = Math.max(0, Math.floor((Date.now() - lastActivityAt) / 60000))
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const getTierFromRank = (sourceRank?: number): ProjectTier => {
  if (typeof sourceRank !== 'number' || !Number.isFinite(sourceRank)) return 'established'
  if (sourceRank <= 20) return 'blue-chip'
  if (sourceRank <= 90) return 'established'
  return 'rising'
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

const resolveChainLabel = (seed: SeedDomain) => {
  if (typeof seed.chain === 'string' && seed.chain.trim().length > 0) return seed.chain.trim()
  if (Array.isArray(seed.chains) && seed.chains.length > 0) return seed.chains.slice(0, 2).join(' / ')
  return 'Unknown'
}

const getTrendScore = ({
  activeUsers,
  messages24h,
  lastActivityAt,
  tvlUsd,
  sourceRank,
  now
}: {
  activeUsers: number
  messages24h: number
  lastActivityAt?: number
  tvlUsd?: number
  sourceRank?: number
  now: number
}) => {
  const inactivityMinutes = lastActivityAt ? Math.max(0, Math.floor((now - lastActivityAt) / 60000)) : Infinity
  const recencyBoost = Number.isFinite(inactivityMinutes) ? Math.max(0, 60 - inactivityMinutes) : 0
  const tvlBoost = tvlUsd && tvlUsd > 0 ? Math.log10(tvlUsd + 1) * 8 : 0
  const rankBoost = sourceRank && sourceRank > 0 ? Math.max(0, 140 - sourceRank) / 4 : 0
  return Math.round(activeUsers * 24 + messages24h * 1.2 + recencyBoost + tvlBoost + rankBoost)
}

const getRisingScore = ({
  activeUsers,
  messages24h,
  lastActivityAt,
  tvlUsd,
  sourceRank,
  now
}: {
  activeUsers: number
  messages24h: number
  lastActivityAt?: number
  tvlUsd?: number
  sourceRank?: number
  now: number
}) => {
  const inactivityMinutes = lastActivityAt ? Math.max(0, Math.floor((now - lastActivityAt) / 60000)) : Infinity
  const recencyBoost = Number.isFinite(inactivityMinutes) ? Math.max(0, 90 - inactivityMinutes) : 0
  const underdogBoost = sourceRank && sourceRank > 0 ? Math.min(45, Math.max(0, sourceRank - 20) * 0.45) : 18
  const tvlPenalty = tvlUsd && tvlUsd > 0 ? Math.min(35, Math.log10(tvlUsd + 1) * 2.5) : 0
  return Math.round(activeUsers * 28 + messages24h * 1.4 + recencyBoost * 1.2 + underdogBoost - tvlPenalty)
}

const buildProjects = (siteStats: SiteStats[]): LeaderboardProject[] => {
  const now = Date.now()
  const statsByHostname = new Map(
    siteStats
      .map((stats) => [normalizeRoomHostname(stats.hostname), stats] as const)
      .filter(([hostname]) => Boolean(hostname))
  )

  return seedDomainList
    .map((seed) => {
      const hostname = normalizeRoomHostname(seed.hostname)
      if (!hostname) return null
      const stats = statsByHostname.get(hostname)
      const activeUsers = Math.max(0, stats?.activeUsers ?? 0)
      const messages24h = Math.max(0, stats?.messages24h ?? 0)
      const lastActivityAt = stats?.lastActivityAt

      const project: LeaderboardProject = {
        id: hostname,
        name: seed.project?.trim() || hostname,
        hostname,
        origin: `https://${hostname}`,
        categoryLabel: formatCategoryLabel(seed.category || 'Web3'),
        chainLabel: resolveChainLabel(seed),
        sourceLabel: seed.source?.toUpperCase() || 'ON-CHAIN',
        sourceRank: seed.sourceRank,
        tvlUsd: typeof seed.tvlUsd === 'number' ? seed.tvlUsd : undefined,
        activeUsers,
        messages24h,
        lastActivityAt,
        trendScore: getTrendScore({
          activeUsers,
          messages24h,
          lastActivityAt,
          tvlUsd: seed.tvlUsd,
          sourceRank: seed.sourceRank,
          now
        }),
        risingScore: getRisingScore({
          activeUsers,
          messages24h,
          lastActivityAt,
          tvlUsd: seed.tvlUsd,
          sourceRank: seed.sourceRank,
          now
        }),
        tier: getTierFromRank(seed.sourceRank)
      }

      return project
    })
    .filter((project): project is LeaderboardProject => Boolean(project))
}

export interface LeaderboardProps {
  siteStats: SiteStats[]
  mode: 'trending' | 'new-rising'
}

const Leaderboard: FC<LeaderboardProps> = ({ siteStats, mode }) => {
  const projects = useMemo(() => {
    const base = buildProjects(siteStats)
    const sorted =
      mode === 'trending'
        ? base.toSorted((a, b) => b.trendScore - a.trendScore)
        : base.toSorted((a, b) => b.risingScore - a.risingScore)
    return sorted.slice(0, 12)
  }, [mode, siteStats])

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
              ? 'Ranked with real seed metrics and live GhostChat activity.'
              : 'Momentum score favors live activity + underdog projects with real metrics.'}
          </p>
        </div>

        {projects.map((project, index) => {
          const score = mode === 'trending' ? project.trendScore : project.risingScore

          return (
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
                    {project.hostname}
                  </a>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-2xs">
                    Score {score}
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

              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline" className={cn('text-2xs', getTierChipClassName(project.tier))}>
                  {getTierLabel(project.tier)}
                </Badge>
                <Badge variant="outline" className="text-2xs">
                  {project.categoryLabel}
                </Badge>
                <Badge variant="outline" className="text-2xs">
                  {project.chainLabel}
                </Badge>
                <Badge variant="outline" className="text-2xs">
                  {project.sourceLabel}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-2xs text-slate-500 sm:grid-cols-4 dark:text-slate-400">
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
                    <DollarSignIcon size={10} />
                    <span>TVL</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                    {formatUsdCompact(project.tvlUsd)}
                  </div>
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

              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                {typeof project.sourceRank === 'number' && Number.isFinite(project.sourceRank)
                  ? `Seed rank #${project.sourceRank}`
                  : 'Seed rank unavailable'}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

Leaderboard.displayName = 'Leaderboard'

export default Leaderboard
