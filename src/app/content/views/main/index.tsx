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
      <div className="grid grid-cols-3 border-b bg-white/90 px-3 py-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('chat')}
          className={cn('h-8 rounded-lg text-xs', activeTab === 'chat' && 'bg-slate-100 dark:bg-slate-800')}
        >
          Chat
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('trending')}
          disabled={!leaderboardEnabled}
          className={cn('h-8 rounded-lg text-xs', activeTab === 'trending' && 'bg-slate-100 dark:bg-slate-800')}
        >
          Trending
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('new-rising')}
          disabled={!leaderboardEnabled}
          className={cn('h-8 rounded-lg text-xs', activeTab === 'new-rising' && 'bg-slate-100 dark:bg-slate-800')}
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
        <Leaderboard
          virtualUsers={virtualUserList}
          siteStats={siteStats}
          mode={activeTab === 'trending' ? 'trending' : 'new-rising'}
        />
      )}
    </div>
  )
}

Main.displayName = 'Main'

export default Main
