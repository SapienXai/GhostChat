import { useState, useMemo, type FC } from 'react'
import { Globe2Icon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { cn, getRiskAssessment, getSiteInfo } from '@/utils'
import { useRemeshDomain, useRemeshQuery } from 'remesh-react'
import ChatRoomDomain from '@/domain/ChatRoom'
import type { FromInfo, RoomUser } from '@/domain/VirtualRoom'
import VirtualRoomDomain from '@/domain/VirtualRoom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Virtuoso } from 'react-virtuoso'
import { AvatarCircles } from '@/components/magicui/avatar-circles'
import Link from '@/components/link'
import NumberFlow from '@number-flow/react'
import SocialLinks from './social-links'
import { detectWeb3Context, getChainIcon, getPlatformIcon } from '@/utils/detectWeb3'

const Header: FC = () => {
  const siteInfo = getSiteInfo()
  const web3 = detectWeb3Context()
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const virtualRoomDomain = useRemeshDomain(VirtualRoomDomain())
  const chatUserList = useRemeshQuery(chatRoomDomain.query.UserListQuery())
  const virtualUserList = useRemeshQuery(virtualRoomDomain.query.UserListQuery())
  const awayUsers = useRemeshQuery(chatRoomDomain.query.AwayUsersQuery())
  const connectionState = useRemeshQuery(chatRoomDomain.query.ConnectionStateQuery())
  const chatOnlineCount = chatUserList.length

  const virtualOnlineGroup = virtualUserList
    .flatMap((user) => user.fromInfos.map((from) => ({ from, user })))
    .reduce<(FromInfo & { users: RoomUser[] })[]>((acc, item) => {
      const existSite = acc.find((group) => group.origin === item.from.origin)
      if (existSite) {
        const existUser = existSite.users.find((user) => user.userId === item.user.userId)
        !existUser && existSite.users.push(item.user)
      } else {
        acc.push({ ...item.from, users: [item.user] })
      }
      return acc
    }, [])
    .sort((a, b) => b.users.length - a.users.length)

  const [chatUserListScrollParentRef, setChatUserListScrollParentRef] = useState<HTMLDivElement | null>(null)
  const [virtualOnlineGroupScrollParentRef, setVirtualOnlineGroupScrollParentRef] = useState<HTMLDivElement | null>(
    null
  )
  const riskAssessment = useMemo(() => getRiskAssessment({ siteInfo, web3 }), [siteInfo, web3])

  const riskToneClass =
    riskAssessment.level === 'LOW'
      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300'
      : riskAssessment.level === 'MEDIUM'
        ? 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-300'
        : 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300'
  const riskFillClass =
    riskAssessment.level === 'LOW'
      ? 'bg-emerald-500'
      : riskAssessment.level === 'MEDIUM'
        ? 'bg-amber-500'
        : 'bg-rose-500'
  const riskBadgeClass =
    riskAssessment.level === 'LOW'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : riskAssessment.level === 'MEDIUM'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
  const positiveSignals = riskAssessment.reasons.filter((reason) => reason.impact > 0).length
  const negativeSignals = riskAssessment.reasons.filter((reason) => reason.impact < 0).length
  const connectionDotClass =
    connectionState === 'connected'
      ? 'bg-emerald-500'
      : connectionState === 'connecting'
        ? 'bg-amber-500'
        : connectionState === 'error'
          ? 'bg-rose-500'
          : 'bg-slate-400'
  const connectionLabel =
    connectionState === 'connected'
      ? chatOnlineCount > 1
        ? 'P2P Ready'
        : 'P2P Waiting Peer'
      : connectionState === 'connecting'
        ? 'P2P Connecting'
        : connectionState === 'error'
          ? 'P2P Error'
          : 'P2P Offline'

  return (
    <div className="relative z-10 mx-3 mt-3 grid h-16 grid-flow-col grid-cols-[auto_1fr] items-center justify-between rounded-2xl border border-white/45 bg-white/60 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
      {web3.isWeb3Site && (
        <span className="absolute right-3 top-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-white/75 px-2 py-1 text-[9px] font-medium leading-none text-slate-700 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
          <span aria-hidden className="opacity-90">
            {getPlatformIcon(web3.platform)}
          </span>
          <span className="tracking-[0.04em]">{web3.platform?.toUpperCase()}</span>
          {web3.chain && (
            <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-300">
              <span aria-hidden className="opacity-90">
                {getChainIcon(web3.chain)}
              </span>
              <span>{web3.chain}</span>
            </span>
          )}
        </span>
      )}
      <div className="grid self-start justify-items-start pt-4">
        <Avatar className="size-10 rounded-sm">
          <AvatarImage src={siteInfo.icon} alt="favicon" />
          <AvatarFallback>
            <Globe2Icon size="100%" className="text-gray-400" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="grid justify-start gap-y-0 pl-0">
        <div className="flex items-center gap-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button
                className="mb-0 ml-[5px] overflow-visible rounded-md p-0 text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
                variant="link"
              >
                <span className="truncate text-base font-semibold text-slate-600 dark:text-slate-50">
                  {siteInfo.hostname.replace(/^www\./i, '')}
                </span>
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 rounded-lg border border-white/45 bg-white/85 p-0 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
              <ScrollArea
                type="scroll"
                className="max-h-96 min-h-[72px] p-2"
                ref={setVirtualOnlineGroupScrollParentRef}
              >
                <Virtuoso
                  data={virtualOnlineGroup}
                  defaultItemHeight={56}
                  customScrollParent={virtualOnlineGroupScrollParentRef!}
                  itemContent={(_index, site) => (
                    <Link
                      underline={false}
                      href={site.origin}
                      className="grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-2 rounded-lg px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Avatar className="size-10 rounded-sm">
                        <AvatarImage src={site.icon} alt="favicon" />
                        <AvatarFallback>
                          <Globe2Icon size="100%" className="text-gray-400" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid items-center">
                        <div className="flex items-center gap-x-1 overflow-hidden">
                          <h4 className="flex-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-50">
                            {site.hostname.replace(/^www\./i, '')}
                          </h4>
                          <div className="shrink-0 text-sm">
                            <div className="flex items-center gap-x-1 text-nowrap text-xs text-slate-500 dark:text-slate-100">
                              <div className="flex items-center gap-x-1 pt-px">
                                <span className="relative flex size-2">
                                  <span
                                    className={cn(
                                      'absolute inline-flex size-full animate-ping rounded-full opacity-75',
                                      site.users.length > 1 ? 'bg-green-400' : 'bg-orange-400'
                                    )}
                                  ></span>
                                  <span
                                    className={cn(
                                      'relative inline-flex size-full rounded-full',
                                      site.users.length > 1 ? 'bg-green-500' : 'bg-orange-500'
                                    )}
                                  ></span>
                                </span>
                                <span className="flex items-center leading-none ">
                                  <span className="py-[0.25em]">ONLINE</span>
                                </span>
                              </div>
                              {import.meta.env.FIREFOX ? (
                                <span className="tabular-nums">{site.users.length}</span>
                              ) : (
                                <NumberFlow className="tabular-nums" willChange value={site.users.length} />
                              )}
                            </div>
                          </div>
                        </div>
                        <AvatarCircles maxLength={9} size="xs" avatarUrls={site.users.map((user) => user.userAvatar)} />
                      </div>
                    </Link>
                  )}
                ></Virtuoso>
              </ScrollArea>
            </HoverCardContent>
          </HoverCard>
        </div>
        <div className="-mt-1 flex items-center justify-start gap-x-2">
          <SocialLinks siteInfo={siteInfo} />
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button className="h-auto rounded px-0 py-0 hover:no-underline" variant="link">
                <div className="inline-flex items-center gap-x-1 text-[8px] leading-none text-slate-500 dark:text-slate-100">
                  <span>ONLINE</span>
                  <span className="relative flex size-1">
                    <span
                      className={cn(
                        'absolute inline-flex size-full animate-ping rounded-full opacity-75',
                        chatOnlineCount > 1 ? 'bg-green-400' : 'bg-orange-400'
                      )}
                    ></span>
                    <span
                      className={cn(
                        'relative inline-flex size-full rounded-full',
                        chatOnlineCount > 1 ? 'bg-green-500' : 'bg-orange-500'
                      )}
                    ></span>
                  </span>
                  {import.meta.env.FIREFOX ? (
                    <span className="tabular-nums">{Math.min(chatUserList.length, 99)}</span>
                  ) : (
                    <span className="tabular-nums">
                      <NumberFlow className="tabular-nums" willChange value={Math.min(chatUserList.length, 99)} />
                      {chatUserList.length > 99 && <span className="text-[8px]">+</span>}
                    </span>
                  )}
                </div>
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-36 rounded-lg border border-white/45 bg-white/85 p-0 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
              <ScrollArea type="scroll" className="max-h-[204px] min-h-9 p-1" ref={setChatUserListScrollParentRef}>
                <Virtuoso
                  data={chatUserList}
                  defaultItemHeight={28}
                  customScrollParent={chatUserListScrollParentRef!}
                  itemContent={(_index, user) => {
                    const isAway = awayUsers.some((awayUser) => awayUser.userId === user.userId)
                    return (
                      <div className={cn('flex  items-center gap-x-2 rounded-md px-2 py-1.5 outline-none')}>
                        <div className="relative">
                          <Avatar className="size-4 shrink-0">
                            <AvatarImage className="size-full" src={user.userAvatar} alt="avatar" />
                            <AvatarFallback>{user.username.at(0)}</AvatarFallback>
                          </Avatar>
                          {isAway && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white bg-gray-400 dark:border-slate-900" />
                          )}
                        </div>
                        <div
                          className={cn(
                            'flex-1 truncate text-xs',
                            isAway ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-50'
                          )}
                        >
                          {user.username}
                          {isAway && <span className="ml-1 text-xs">(Away)</span>}
                        </div>
                      </div>
                    )
                  }}
                ></Virtuoso>
              </ScrollArea>
            </HoverCardContent>
          </HoverCard>
          <span className="inline-flex items-center gap-x-1 text-[8px] leading-none text-slate-500 dark:text-slate-100">
            <span className="relative flex size-1">
              <span className={cn('relative inline-flex size-full rounded-full', connectionDotClass)}></span>
            </span>
            <span>{connectionLabel}</span>
          </span>
          <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <Button
                className="h-auto rounded px-0 py-0 text-[8px] leading-none text-slate-600 hover:no-underline dark:text-slate-200"
                variant="link"
              >
                <span className="text-slate-500 dark:text-slate-100">Score {riskAssessment.score}/100</span>
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 rounded-lg border border-white/45 bg-white/85 p-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
              <div className={cn('rounded-lg border p-2.5', riskToneClass)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-80">Risk Score</div>
                    <div className="mt-1 text-xl font-semibold leading-none">{riskAssessment.score}/100</div>
                  </div>
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold leading-none', riskBadgeClass)}>
                    {riskAssessment.level}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className={cn('h-full rounded-full transition-all', riskFillClass)}
                    style={{ width: `${riskAssessment.score}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-85">
                  <span>Risk signals: {negativeSignals}</span>
                  <span>Trust signals: {positiveSignals}</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {riskAssessment.reasons.slice(0, 4).map((reason) => (
                    <div
                      key={reason.label}
                      className="rounded-md bg-black/5 px-2 py-1 dark:bg-white/5"
                      title={reason.detail}
                    >
                      <div className="flex items-center justify-between text-[10px] leading-none">
                        <span className="truncate pr-2 font-medium">{reason.label}</span>
                        <span
                          className={cn(
                            'shrink-0 font-semibold',
                            reason.impact < 0
                              ? 'text-rose-600 dark:text-rose-300'
                              : 'text-emerald-600 dark:text-emerald-300'
                          )}
                        >
                          {reason.impact < 0 ? '−' : '+'}
                          {Math.abs(reason.impact)}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[10px] opacity-80">{reason.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
    </div>
  )
}

Header.displayName = 'Header'

export default Header
