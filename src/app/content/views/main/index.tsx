import { type FC, useCallback, useEffect, useMemo } from 'react'
import { useRemeshDomain, useRemeshQuery, useRemeshSend } from 'remesh-react'
import { Button } from '@/components/ui/button'

import MessageList from '../../components/message-list'
import MessageItem from '../../components/message-item'
import PromptItem from '../../components/prompt-item'
import TypingIndicator from '../../components/typing-indicator'
import UserInfoDomain from '@/domain/UserInfo'
import ChatRoomDomain from '@/domain/ChatRoom'
import MessageListDomain, { type NormalMessage, MessageType } from '@/domain/MessageList'
import VirtualRoomDomain from '@/domain/VirtualRoom'
import MessageInputDomain from '@/domain/MessageInput'
import Leaderboard from './leaderboard'
import LeaderboardFooter from './leaderboard-footer'
import GhostTownCtaPanel from './ghost-town-cta-panel'
import { selectSuggestedRooms, type SeedDomain } from './suggested-rooms'
import { cn, getSiteInfo } from '@/utils'
import { getRootNode } from '@/utils'
import type { RoomScope } from '@/domain/externs/ChatRoom'
import { ENABLE_GHOST_TOWN_CTA } from '@/constants/config'
import { GLOBAL_LOBBY_ROOM_ID, createDomainRoomId, normalizeRoomHostname } from '@/utils/roomRouting'
import seedDomains from '@/data/seedDomains.json'

export type MainTab = 'chat' | 'trending' | 'new-rising'

export interface MainProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  leaderboardEnabled?: boolean
}

const seedDomainList = seedDomains as SeedDomain[]

const Main: FC<MainProps> = ({ activeTab, onTabChange, leaderboardEnabled = true }) => {
  const send = useRemeshSend()
  const messageListDomain = useRemeshDomain(MessageListDomain())
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const virtualRoomDomain = useRemeshDomain(VirtualRoomDomain())
  const messageInputDomain = useRemeshDomain(MessageInputDomain())
  const userInfoDomain = useRemeshDomain(UserInfoDomain())
  const userInfo = useRemeshQuery(userInfoDomain.query.UserInfoQuery())
  const chatUserList = useRemeshQuery(chatRoomDomain.query.UserListQuery())
  const virtualUserList = useRemeshQuery(virtualRoomDomain.query.UserListQuery())
  const globalTextMessageList = useRemeshQuery(virtualRoomDomain.query.GlobalTextMessageListQuery())
  const siteStats = useRemeshQuery(virtualRoomDomain.query.SiteStatsQuery())
  const siteInfo = getSiteInfo()
  const roomScope = useRemeshQuery(chatRoomDomain.query.RoomScopeQuery())
  const activeLocalRoomId = useRemeshQuery(chatRoomDomain.query.ActiveLocalRoomIdQuery())
  const draftMessage = useRemeshQuery(messageInputDomain.query.MessageQuery())
  const currentDomainRoomId = createDomainRoomId(siteInfo.hostname)
  const _messageList = useRemeshQuery(messageListDomain.query.ListQuery())
  const localMessageList = _messageList
    .map((message) => {
      if (message.type === MessageType.Normal) {
        const likeUsers = Array.isArray(message.likeUsers) ? message.likeUsers : []
        const hateUsers = Array.isArray(message.hateUsers) ? message.hateUsers : []
        const virtualUser = virtualUserList.find((user) => user.userId === message.userId)
        const fallbackFromInfo = (() => {
          if (!virtualUser) return undefined
          if (typeof message.peerId === 'string') {
            const byPeer = virtualUser.fromInfos.find((fromInfo) => fromInfo.peerId === message.peerId)
            if (byPeer) return byPeer
          }
          return virtualUser.fromInfos[0]
        })()
        const mergedFromInfo =
          message.fromInfo &&
          typeof message.fromInfo.href === 'string' &&
          typeof message.fromInfo.hostname === 'string' &&
          typeof message.fromInfo.origin === 'string' &&
          typeof message.fromInfo.title === 'string'
            ? message.fromInfo
            : fallbackFromInfo
        return {
          ...message,
          username:
            typeof message.username === 'string' && message.username.trim().length > 0 ? message.username : 'Unknown',
          userAvatar: typeof message.userAvatar === 'string' ? message.userAvatar : '',
          body: typeof message.body === 'string' ? message.body : '',
          atUsers: Array.isArray(message.atUsers) ? message.atUsers : [],
          fromInfo: mergedFromInfo,
          likeUsers,
          hateUsers,
          like: likeUsers.some((likeUser) => likeUser.userId === userInfo?.id),
          hate: hateUsers.some((hateUser) => hateUser.userId === userInfo?.id)
        }
      }
      return {
        ...message,
        username:
          typeof message.username === 'string' && message.username.trim().length > 0 ? message.username : 'Unknown',
        userAvatar: typeof message.userAvatar === 'string' ? message.userAvatar : '',
        body: typeof message.body === 'string' ? message.body : ''
      }
    })
    .filter((message) => {
      if (message.type === MessageType.Normal && message.roomScope === 'global') {
        return false
      }

      if (typeof message.localRoomId === 'string') {
        return message.localRoomId === activeLocalRoomId
      }

      return activeLocalRoomId === currentDomainRoomId
    })
    .toSorted((a, b) => a.sendTime - b.sendTime)
  const globalMessageList = globalTextMessageList
    .map((message) => ({
      ...message,
      username:
        typeof message.username === 'string' && message.username.trim().length > 0 ? message.username : 'Unknown',
      userAvatar: typeof message.userAvatar === 'string' ? message.userAvatar : '',
      body: typeof message.body === 'string' ? message.body : '',
      atUsers: Array.isArray(message.atUsers) ? message.atUsers : [],
      fromInfo:
        message.fromInfo &&
        typeof message.fromInfo.href === 'string' &&
        typeof message.fromInfo.hostname === 'string' &&
        typeof message.fromInfo.origin === 'string' &&
        typeof message.fromInfo.title === 'string'
          ? message.fromInfo
          : undefined,
      likeUsers: [],
      hateUsers: [],
      like: false,
      hate: false
    }))
    .toSorted((a, b) => a.sendTime - b.sendTime)
  const localScopedGlobalMessageList =
    activeLocalRoomId !== currentDomainRoomId
      ? []
      : globalMessageList.filter((message) => {
          const origin = message.fromInfo?.origin
          const hostname = message.fromInfo?.hostname
          if (typeof origin === 'string' && origin.length) {
            return origin === siteInfo.origin
          }
          return typeof hostname === 'string' && hostname.length ? hostname === siteInfo.hostname : false
        })
  const localCombinedMessageList = (() => {
    const merged = new Map<string, (typeof localMessageList)[number]>()
    for (const message of localScopedGlobalMessageList) {
      merged.set(message.id, message)
    }
    for (const message of localMessageList) {
      merged.set(message.id, message)
    }
    return [...merged.values()].toSorted((a, b) => a.sendTime - b.sendTime)
  })()

  const messageList = roomScope === 'global' ? globalMessageList : localCombinedMessageList

  const handleLikeChange = (messageId: string) => {
    send(chatRoomDomain.command.SendLikeMessageCommand(messageId))
  }

  const handleHateChange = (messageId: string) => {
    send(chatRoomDomain.command.SendHateMessageCommand(messageId))
  }

  const handleScopeChange = (scope: RoomScope) => {
    send(chatRoomDomain.command.SwitchRoomScopeCommand(scope))
  }

  const handleReplyTarget = (message: NormalMessage) => {
    send(
      chatRoomDomain.command.SetReplyTargetCommand({
        id: message.id,
        userId: message.userId,
        username: message.username,
        userAvatar: message.userAvatar,
        body: message.body
      })
    )
  }

  const handleReplyNavigate = (messageId: string) => {
    const root = getRootNode()
    const target =
      root.querySelector<HTMLElement>(`#gc-msg-${messageId}`) ??
      root.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const isGlobalScope = roomScope === 'global'
  const humansCount = isGlobalScope ? virtualUserList.length : chatUserList.length
  const messageCount = messageList.length
  const isEmptyRoom = messageCount === 0 || humansCount <= 1

  const suggestedRooms = useMemo(
    () =>
      selectSuggestedRooms({
        seedDomains: seedDomainList,
        currentHostname: siteInfo.hostname,
        count: 3
      }),
    [siteInfo.hostname]
  )

  const handleStartFirstMessage = useCallback(() => {
    if (messageCount === 0 && !draftMessage.trim()) {
      send(messageInputDomain.command.InputCommand('Hey everyone, kicking this room off.'))
    }

    const root = getRootNode()
    const input = root.querySelector<HTMLTextAreaElement>('[data-ghostchat-message-input="true"]')
    if (!input) return
    input.focus()
    const cursor = input.value.length
    input.setSelectionRange(cursor, cursor)
  }, [draftMessage, messageCount, messageInputDomain, send])

  const handleJoinGlobalLobby = useCallback(() => {
    send(chatRoomDomain.command.RouteToRoomCommand(GLOBAL_LOBBY_ROOM_ID))
    onTabChange('chat')
  }, [chatRoomDomain, onTabChange, send])

  const handleJoinSuggestedRoom = useCallback((hostname: string) => {
    const normalizedHostname = normalizeRoomHostname(hostname)
    if (!normalizedHostname) return
    window.open(`https://${normalizedHostname}`, '_blank', 'noopener,noreferrer')
  }, [])

  useEffect(() => {
    if (!leaderboardEnabled && activeTab !== 'chat') {
      onTabChange('chat')
    }
  }, [leaderboardEnabled, activeTab, onTabChange])

  return (
    <div className="grid h-full grid-rows-[auto_1fr] overflow-hidden">
      <div className="mx-3 mt-2 grid grid-cols-3 gap-1 rounded-xl border border-white/45 bg-white/55 p-1 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
        <button
          type="button"
          role="switch"
          aria-checked={isGlobalScope}
          aria-label="Switch between local and global chat"
          onClick={() => {
            onTabChange('chat')
            handleScopeChange(isGlobalScope ? 'local' : 'global')
          }}
          className="relative grid h-8 grid-cols-2 items-center rounded-lg border border-white/40 bg-white/70 px-1 shadow-sm backdrop-blur-md transition-colors hover:bg-white/85 dark:border-white/10 dark:bg-slate-800/65 dark:hover:bg-slate-800/80"
        >
          <span
            className={cn(
              'absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-md bg-white/95 shadow-sm transition-transform duration-300 ease-out dark:bg-slate-700/90',
              isGlobalScope && 'translate-x-full'
            )}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700 dark:text-slate-100">
              {isGlobalScope ? 'Global' : 'Local'}
            </span>
          </span>
          <span
            className={cn(
              'relative z-10 text-center text-[11px] font-medium text-slate-500 transition-colors dark:text-slate-300',
              isGlobalScope ? 'col-start-1' : 'col-start-2'
            )}
          >
            {isGlobalScope ? 'Local' : 'Global'}
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('trending')}
          disabled={!leaderboardEnabled}
          className={cn(
            'h-8 rounded-lg text-xs font-medium text-slate-600 transition-colors dark:text-slate-200',
            activeTab === 'trending' && 'bg-white/85 text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-white'
          )}
        >
          Trending
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('new-rising')}
          disabled={!leaderboardEnabled}
          className={cn(
            'h-8 rounded-lg text-xs font-medium text-slate-600 transition-colors dark:text-slate-200',
            activeTab === 'new-rising' && 'bg-white/85 text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-white'
          )}
        >
          New & Rising
        </Button>
      </div>

      {activeTab === 'chat' ? (
        <MessageList>
          {ENABLE_GHOST_TOWN_CTA && isEmptyRoom && (
            <GhostTownCtaPanel
              messageCount={messageCount}
              humansCount={humansCount}
              suggestedRooms={suggestedRooms}
              onStartFirstMessage={handleStartFirstMessage}
              onJoinGlobalLobby={handleJoinGlobalLobby}
              onJoinSuggestedRoom={handleJoinSuggestedRoom}
            />
          )}
          {messageList.map((message, index) => {
            if (message.type === MessageType.Normal) {
              return (
                <MessageItem
                  key={message.id}
                  data={message}
                  like={message.like}
                  hate={message.hate}
                  isOwnMessage={message.userId === userInfo?.id}
                  showSourceInfo={roomScope === 'global' || message.roomScope === 'global'}
                  onLikeChange={
                    roomScope === 'local' && message.roomScope !== 'global'
                      ? () => handleLikeChange(message.id)
                      : undefined
                  }
                  onHateChange={
                    roomScope === 'local' && message.roomScope !== 'global'
                      ? () => handleHateChange(message.id)
                      : undefined
                  }
                  onReply={() => handleReplyTarget(message)}
                  onReplyNavigate={handleReplyNavigate}
                  className="duration-300 animate-in fade-in-0"
                />
              )
            } else {
              return (
                <PromptItem
                  key={message.id}
                  data={message}
                  className={`${index === 0 ? 'pt-4' : ''} ${index === messageList.length - 1 ? 'pb-4' : ''}`}
                />
              )
            }
          })}
          <TypingIndicator />
        </MessageList>
      ) : (
        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 px-3 pt-2">
            <Leaderboard
              virtualUsers={virtualUserList}
              siteStats={siteStats}
              mode={activeTab === 'trending' ? 'trending' : 'new-rising'}
            />
          </div>
          <div className="px-3 pb-3 pt-2">
            <LeaderboardFooter />
          </div>
        </div>
      )}
    </div>
  )
}

Main.displayName = 'Main'

export default Main
