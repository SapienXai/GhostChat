import { type FC } from 'react'
import { useRemeshDomain, useRemeshQuery, useRemeshSend } from 'remesh-react'

import MessageList from '../../components/message-list'
import MessageItem from '../../components/message-item'
import PromptItem from '../../components/prompt-item'
import TypingIndicator from '../../components/typing-indicator'
import UserInfoDomain from '@/domain/UserInfo'
import ChatRoomDomain from '@/domain/ChatRoom'
import MessageListDomain, { MessageType } from '@/domain/MessageList'

const Main: FC = () => {
  const send = useRemeshSend()
  const messageListDomain = useRemeshDomain(MessageListDomain())
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const userInfoDomain = useRemeshDomain(UserInfoDomain())
  const userInfo = useRemeshQuery(userInfoDomain.query.UserInfoQuery())
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

  return (
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
  )
}

Main.displayName = 'Main'

export default Main
