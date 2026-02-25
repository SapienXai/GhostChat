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
  const _messageList = useRemeshQuery(messageListDomain.query.ListQuery())
  const messageList = _messageList
    .map((message) => {
      if (message.type === MessageType.Normal) {
        return {
          ...message,
          like: message.likeUsers.some((likeUser) => likeUser.userId === userInfo?.id),
          hate: message.hateUsers.some((hateUser) => hateUser.userId === userInfo?.id)
        }
      }
      return message
    })
    .toSorted((a, b) => a.sendTime - b.sendTime)

  const handleLikeChange = (messageId: string) => {
    send(chatRoomDomain.command.SendLikeMessageCommand(messageId))
  }

  const handleHateChange = (messageId: string) => {
    send(chatRoomDomain.command.SendHateMessageCommand(messageId))
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
        <MessageList>
          {messageList.map((message, index) => {
            if (message.type === MessageType.Normal) {
              return (
                <MessageItem
                  key={message.id}
                  data={message}
                  like={message.like}
                  hate={message.hate}
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
