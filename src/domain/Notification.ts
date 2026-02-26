import { Remesh } from 'remesh'
import { NotificationExtern } from './externs/Notification'
import ChatRoomDomain, { SendType as ChatSendType, type TextMessage } from '@/domain/ChatRoom'
import UserInfoDomain from './UserInfo'
import { map, merge } from 'rxjs'
import VirtualRoomDomain, { type GlobalTextMessage } from '@/domain/VirtualRoom'

const NotificationDomain = Remesh.domain({
  name: 'NotificationDomain',
  impl: (domain) => {
    const notificationExtern = domain.getExtern(NotificationExtern)
    const userInfoDomain = domain.getDomain(UserInfoDomain())
    const chatRoomDomain = domain.getDomain(ChatRoomDomain())
    const virtualRoomDomain = domain.getDomain(VirtualRoomDomain())

    const NotificationEnabledState = domain.state<boolean>({
      name: 'Notification.EnabledState',
      default: false
    })

    const IsEnabledQuery = domain.query({
      name: 'Notification.IsOpenQuery',
      impl: ({ get }) => {
        return get(NotificationEnabledState())
      }
    })

    const RecentMessageIdsState = domain.state<string[]>({
      name: 'Notification.RecentMessageIdsState',
      default: []
    })

    const PushRecentMessageIdCommand = domain.command({
      name: 'Notification.PushRecentMessageIdCommand',
      impl: ({ get }, messageId: string) => {
        const current = get(RecentMessageIdsState())
        const next = [...current.filter((id) => id !== messageId), messageId].slice(-500)
        return [RecentMessageIdsState().new(next)]
      }
    })

    const toNotificationTextMessage = (message: TextMessage | GlobalTextMessage): TextMessage => {
      if (message.type === ChatSendType.Text) {
        return message
      }
      return {
        userId: message.userId,
        username: message.username,
        userAvatar: message.userAvatar,
        type: ChatSendType.Text,
        id: message.id,
        peerId: message.peerId,
        body: message.body,
        sendTime: message.sendTime,
        atUsers: message.atUsers ?? [],
        reply: message.reply,
        fromInfo: message.fromInfo
      }
    }

    const EnableCommand = domain.command({
      name: 'Notification.EnableCommand',
      impl: () => {
        return NotificationEnabledState().new(true)
      }
    })

    const DisableCommand = domain.command({
      name: 'Notification.DisableCommand',
      impl: () => {
        return NotificationEnabledState().new(false)
      }
    })

    const PushCommand = domain.command({
      name: 'Notification.PushCommand',
      impl: (_, message: TextMessage) => {
        notificationExtern.push(message)
        return [PushEvent(message)]
      }
    })

    const PushEvent = domain.event<TextMessage>({
      name: 'Notification.PushEvent'
    })

    const ClearEvent = domain.event<string>({
      name: 'Notification.ClearEvent'
    })

    domain.effect({
      name: 'Notification.OnUserInfoEffect',
      impl: ({ fromEvent }) => {
        const onUserInfo$ = fromEvent(userInfoDomain.event.UpdateUserInfoEvent)
        return onUserInfo$.pipe(
          map((userInfo) => {
            return userInfo?.notificationEnabled ? EnableCommand() : DisableCommand()
          })
        )
      }
    })

    domain.effect({
      name: 'Notification.OnRoomMessageEffect',
      impl: ({ fromEvent, get }) => {
        const onTextMessage$ = fromEvent(chatRoomDomain.event.OnTextMessageEvent)
        const onGlobalTextMessage$ = fromEvent(virtualRoomDomain.event.OnGlobalTextMessageEvent).pipe(
          map((message) => toNotificationTextMessage(message))
        )
        const onMessage$ = merge(onTextMessage$, onGlobalTextMessage$).pipe(
          map((message) => {
            const notificationEnabled = get(IsEnabledQuery())
            if (get(RecentMessageIdsState()).includes(message.id)) {
              return null
            }
            if (notificationEnabled) {
              // Compatible with old versions, without the atUsers field
              if (message.atUsers) {
                const userInfo = get(userInfoDomain.query.UserInfoQuery())
                const hasAtSelf = message.atUsers.find((user) => user.userId === userInfo?.id)
                const hasReplySelf = message.reply?.userId === userInfo?.id
                if (userInfo?.notificationType === 'all') {
                  return [PushRecentMessageIdCommand(message.id), PushCommand(message)]
                }
                if (userInfo?.notificationType === 'at' && (hasAtSelf || hasReplySelf)) {
                  return [PushRecentMessageIdCommand(message.id), PushCommand(message)]
                }
                return null
              } else {
                return [PushRecentMessageIdCommand(message.id), PushCommand(message)]
              }
            } else {
              return null
            }
          })
        )

        return onMessage$
      }
    })

    return {
      query: {
        IsEnabledQuery
      },
      command: {
        EnableCommand,
        DisableCommand,
        PushCommand
      },
      event: {
        PushEvent,
        ClearEvent
      }
    }
  }
})

export default NotificationDomain
