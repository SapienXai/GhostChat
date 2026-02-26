import { type FC, useEffect } from 'react'
import { useRemeshDomain, useRemeshQuery, useRemeshSend } from 'remesh-react'
import { Button } from '@/components/ui/button'

import MessageList from '../../components/message-list'
import MessageItem from '../../components/message-item'
import PromptItem from '../../components/prompt-item'
import TypingIndicator from '../../components/typing-indicator'
import UserInfoDomain from '@/domain/UserInfo'
import ChatRoomDomain from '@/domain/ChatRoom'
import MessageListDomain, { MessageType } from '@/domain/MessageList'
import VirtualRoomDomain from '@/domain/VirtualRoom'
import Leaderboard from './leaderboard'
import LeaderboardFooter from './leaderboard-footer'
import { cn } from '@/utils'
import type { RoomScope } from '@/domain/externs/ChatRoom'

export type MainTab = 'chat' | 'trending' | 'new-rising'

export interface MainProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  leaderboardEnabled?: boolean
}

const Main: FC<MainProps> = ({ activeTab, onTabChange, leaderboardEnabled = true }) => {
  const send = useRemeshSend()
  const messageListDomain = useRemeshDomain(MessageListDomain())
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const virtualRoomDomain = useRemeshDomain(VirtualRoomDomain())
  const userInfoDomain = useRemeshDomain(UserInfoDomain())
  const userInfo = useRemeshQuery(userInfoDomain.query.UserInfoQuery())
  const virtualUserList = useRemeshQuery(virtualRoomDomain.query.UserListQuery())
  const siteStats = useRemeshQuery(virtualRoomDomain.query.SiteStatsQuery())
  const roomScope = useRemeshQuery(chatRoomDomain.query.RoomScopeQuery())
  const _messageList = useRemeshQuery(messageListDomain.query.ListQuery())
  const messageList = _messageList
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
    .toSorted((a, b) => a.sendTime - b.sendTime)

  const handleLikeChange = (messageId: string) => {
    send(chatRoomDomain.command.SendLikeMessageCommand(messageId))
  }

  const handleHateChange = (messageId: string) => {
    send(chatRoomDomain.command.SendHateMessageCommand(messageId))
  }

  const handleScopeChange = (scope: RoomScope) => {
    send(chatRoomDomain.command.SwitchRoomScopeCommand(scope))
  }

  useEffect(() => {
    if (!leaderboardEnabled && activeTab !== 'chat') {
      onTabChange('chat')
    }
  }, [leaderboardEnabled, activeTab, onTabChange])

  return (
    <div className="grid h-full grid-rows-[auto_1fr] overflow-hidden">
      <div className="mx-3 mt-2 grid grid-cols-3 gap-1 rounded-xl border border-white/45 bg-white/55 p-1 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('chat')}
          className={cn(
            'h-8 rounded-lg text-xs font-medium text-slate-600 transition-colors dark:text-slate-200',
            activeTab === 'chat' && 'bg-white/85 text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-white'
          )}
        >
          Chat
        </Button>
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
        <div className="grid min-h-0 grid-rows-[auto_1fr]">
          <div className="px-3 pt-2">
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/45 bg-white/55 p-1 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleScopeChange('local')}
                className={cn(
                  'h-7 rounded-lg text-[11px] font-medium text-slate-600 transition-colors dark:text-slate-200',
                  roomScope === 'local' && 'bg-white/85 text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-white'
                )}
              >
                Local
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleScopeChange('global')}
                className={cn(
                  'h-7 rounded-lg text-[11px] font-medium text-slate-600 transition-colors dark:text-slate-200',
                  roomScope === 'global' && 'bg-white/85 text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-white'
                )}
              >
                Global
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-7 cursor-not-allowed rounded-lg text-[11px] font-medium text-slate-400 opacity-80 dark:text-slate-500"
              >
                Holders Soon
              </Button>
            </div>
          </div>
          <MessageList>
            {messageList.map((message, index) => {
              if (message.type === MessageType.Normal) {
                return (
                  <MessageItem
                    key={message.id}
                    data={message}
                    like={message.like}
                    hate={message.hate}
                    isOwnMessage={message.userId === userInfo?.id}
                    showSourceInfo={roomScope === 'global'}
                    onLikeChange={() => handleLikeChange(message.id)}
                    onHateChange={() => handleHateChange(message.id)}
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
        </div>
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
