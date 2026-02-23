import { useState, useEffect, type FC } from 'react'
import { Globe2Icon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { cn, getSiteInfo } from '@/utils'
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
import { getWalletInfo, getProviderIcon, type WalletInfo } from '@/utils/getWalletInfo'
import injectScript from '@/utils/injectScript'
import type { PublicPath } from 'wxt/browser'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const Header: FC = () => {
  const siteInfo = getSiteInfo()
  const web3 = detectWeb3Context()
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const virtualRoomDomain = useRemeshDomain(VirtualRoomDomain())
  const chatUserList = useRemeshQuery(chatRoomDomain.query.UserListQuery())
  const virtualUserList = useRemeshQuery(virtualRoomDomain.query.UserListQuery())
  const awayUsers = useRemeshQuery(chatRoomDomain.query.AwayUsersQuery())
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
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({ isDetected: false })

  // Detect wallet on component mount
  useEffect(() => {
    let handler: EventListener | null = null
    let messageHandler: ((e: MessageEvent) => void) | null = null
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null

    const detectWallet = async () => {
      try {
        // Listen for injected detection result (document event)
        handler = ((e: Event) => {
          const detail = (e as CustomEvent).detail
          if (detail && typeof detail === 'object') {
            setWalletInfo({
              isDetected: !!detail.isDetected,
              provider: detail.provider,
              chainId: detail.chainId,
              chainName: detail.chainName,
              error: detail.error
            })
          }
        }) as EventListener
        document.addEventListener('ghostchat-wallet-detected', handler as EventListener)

        // Also listen via postMessage as fallback
        messageHandler = (e: MessageEvent) => {
          if (e?.data && e.data.source === 'ghostchat' && e.data.type === 'walletDetected') {
            const detail = e.data.payload
            setWalletInfo({
              isDetected: !!detail.isDetected,
              provider: detail.provider,
              chainId: detail.chainId,
              chainName: detail.chainName,
              error: detail.error
            })
          }
        }
        window.addEventListener('message', messageHandler)

        // Inject the script into page context (public asset path)
        await injectScript('inject-wallet-detect.js' as PublicPath)

        // Fallback to direct detection in case injection fails or yields nothing
        fallbackTimeout = setTimeout(async () => {
          const info = await getWalletInfo()
          setWalletInfo((prev) => (prev.isDetected ? prev : info))
        }, 400)
      } catch {
        // Fallback if injection fails, and record a friendly reason
        const info = await getWalletInfo()
        if (!info.isDetected) {
          setWalletInfo({ isDetected: false, error: 'Detection blocked by page CSP or no wallet present' })
        } else {
          setWalletInfo(info)
        }
      }
    }

    detectWallet()

    return () => {
      if (handler) document.removeEventListener('ghostchat-wallet-detected', handler)
      if (messageHandler) window.removeEventListener('message', messageHandler)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
    }
  }, [])

  return (
    <div className="relative z-10 grid h-16 grid-flow-col grid-cols-[auto_1fr] items-center justify-between rounded-t-xl bg-white px-4 backdrop-blur-lg dark:bg-slate-950">
      {web3.isWeb3Site && (
        <span className="absolute right-3 top-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/55 px-2 py-1 text-[9px] font-medium leading-none text-slate-700 shadow-xs ring-1 ring-black/5 backdrop-blur-sm dark:bg-slate-900/55 dark:text-slate-100 dark:ring-white/10">
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
      <div className="grid justify-items-start gap-y-1">
        <Avatar className="size-10 rounded-sm">
          <AvatarImage src={siteInfo.icon} alt="favicon" />
          <AvatarFallback>
            <Globe2Icon size="100%" className="text-gray-400" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="grid justify-start gap-y-0 pl-2">
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button className="overflow-hidden rounded-md p-0 -mb-0" variant="link">
              <span className="truncate text-base font-semibold text-slate-600 dark:text-slate-50">
                {siteInfo.hostname.replace(/^www\./i, '')}
              </span>
              {walletInfo.isDetected && (
                <Popover>
                  <PopoverTrigger asChild>
                    <span className="ml-2 inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
                      <span aria-hidden>{getProviderIcon(walletInfo.provider)}</span>
                      <span>WALLET</span>
                      {walletInfo.chainName && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                          <span aria-hidden>{getChainIcon(walletInfo.chainName)}</span>
                          <span>{walletInfo.chainName}</span>
                        </span>
                      )}
                      {walletInfo.error && (
                        <span className="ml-1 text-orange-600 dark:text-orange-400" title={walletInfo.error}>
                          !
                        </span>
                      )}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="grid gap-2 text-sm">
                      <div className="font-semibold">Wallet detected</div>
                      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2">
                        <span className="text-xs text-muted-foreground">Provider</span>
                        <div className="inline-flex items-center gap-1">
                          <span aria-hidden>{getProviderIcon(walletInfo.provider)}</span>
                          <span className="capitalize">{walletInfo.provider}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Chain</span>
                        <div className="inline-flex items-center gap-1">
                          <span aria-hidden>{getChainIcon(walletInfo.chainName)}</span>
                          <span>{walletInfo.chainName || 'Unknown'}</span>
                          {walletInfo.chainId && (
                            <span className="ml-1 text-xs text-muted-foreground">({walletInfo.chainId})</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">Status</span>
                        <div className="inline-flex items-center gap-1">
                          {!walletInfo.error ? (
                            <span className="text-green-600 dark:text-green-400">OK</span>
                          ) : (
                            <span className="text-orange-600 dark:text-orange-400">{walletInfo.error}</span>
                          )}
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button size="sm" variant="secondary" disabled className="w-full cursor-not-allowed opacity-70">
                          Connect wallet (coming soon)
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 rounded-lg p-0">
            <ScrollArea type="scroll" className="max-h-96 min-h-[72px] p-2" ref={setVirtualOnlineGroupScrollParentRef}>
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
            <HoverCardContent className="w-36 rounded-lg p-0">
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
        </div>
      </div>
    </div>
  )
}

Header.displayName = 'Header'

export default Header
