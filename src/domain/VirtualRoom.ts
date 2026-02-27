import { Remesh } from 'remesh'
import { EMPTY, fromEventPattern, interval, map, merge, mergeMap, of, startWith } from 'rxjs'
import {
  type AtUser,
  type MessageFromInfo,
  type MessageReply,
  type MessageUser,
  type NormalMessage,
  MessageType
} from './MessageList'
import { VirtualRoomExtern } from '@/domain/externs/VirtualRoom'
import { IndexDBStorageExtern } from '@/domain/externs/Storage'
import UserInfoDomain from '@/domain/UserInfo'
import { getTextByteSize, upsert } from '@/utils'
import { nanoid } from 'nanoid'
import StatusModule from '@/domain/modules/Status'
import StorageEffect from '@/domain/modules/StorageEffect'
import * as v from 'valibot'
import type { SiteInfo } from '@/utils/getSiteInfo'
import getSiteInfo from '@/utils/getSiteInfo'
import ChatRoomDomain from '@/domain/ChatRoom'
import { GLOBAL_MESSAGE_LIST_STORAGE_KEY, WEB_RTC_MAX_MESSAGE_SIZE } from '@/constants/config'

const DAY_MS = 24 * 60 * 60 * 1000
const MESSAGE_ID_TTL_MS = 2 * DAY_MS
const SITE_SNAPSHOT_TTL_MS = 90 * 60 * 1000
const STATS_BROADCAST_INTERVAL_MS = 30 * 1000
const GLOBAL_MESSAGE_HISTORY_LIMIT = 500

export enum SendType {
  SyncUser = 'SyncUser',
  SyncStats = 'SyncStats',
  GlobalText = 'GlobalText',
  SyncGlobalHistory = 'SyncGlobalHistory'
}

export interface FromInfo extends SiteInfo {
  peerId: string
}

export interface SyncUserMessage extends MessageUser {
  type: SendType.SyncUser
  id: string
  peerId: string
  joinTime: number
  sendTime: number
  fromInfo: FromInfo
}

export interface SiteStatPayload {
  origin: string
  hostname: string
  title: string
  icon: string
  description: string
  messages24h: number
  activeUsers: number
  lastActivityAt: number
}

export interface SyncStatsMessage extends MessageUser {
  type: SendType.SyncStats
  id: string
  peerId: string
  sendTime: number
  stats: SiteStatPayload
}

export interface GlobalTextMessage extends MessageUser {
  type: SendType.GlobalText
  id: string
  peerId: string
  sendTime: number
  body: string
  atUsers: AtUser[]
  reply?: MessageReply
  fromInfo: MessageFromInfo
  originRoomId?: string
}

export interface GlobalTextInput {
  id: string
  sendTime: number
  body: string
  atUsers: AtUser[]
  reply?: MessageReply
  fromInfo?: MessageFromInfo
}

export interface SyncGlobalHistoryMessage extends MessageUser {
  type: SendType.SyncGlobalHistory
  id: string
  peerId: string
  sendTime: number
  messages: GlobalTextMessage[]
}

export interface SitePeerSnapshot extends SiteStatPayload {
  peerId: string
  sendTime: number
}

export interface SiteStats extends SiteStatPayload {
  reporters: number
  updatedAt: number
}

export type RoomMessage = SyncUserMessage | SyncStatsMessage | GlobalTextMessage | SyncGlobalHistoryMessage

export type RoomUser = MessageUser & { peerIds: string[]; fromInfos: FromInfo[]; joinTime: number }

const MessageUserSchema = {
  userId: v.string(),
  username: v.optional(v.string(), 'Unknown'),
  userAvatar: v.optional(v.string(), '')
}

const FromInfoSchema = {
  peerId: v.string(),
  host: v.string(),
  hostname: v.string(),
  href: v.string(),
  origin: v.string(),
  title: v.string(),
  icon: v.string(),
  description: v.string()
}

const SiteStatPayloadSchema = {
  origin: v.string(),
  hostname: v.string(),
  title: v.string(),
  icon: v.string(),
  description: v.string(),
  messages24h: v.number(),
  activeUsers: v.number(),
  lastActivityAt: v.number()
}

const AtUserSchema = {
  positions: v.array(v.tuple([v.number(), v.number()])),
  ...MessageUserSchema
}

const MessageFromInfoSchema = {
  href: v.string(),
  hostname: v.string(),
  origin: v.string(),
  title: v.string()
}

const MessageReplySchema = {
  id: v.string(),
  body: v.string(),
  ...MessageUserSchema
}

const RoomMessageSchema = v.union([
  v.object({
    type: v.literal(SendType.SyncUser),
    id: v.string(),
    peerId: v.string(),
    joinTime: v.number(),
    sendTime: v.number(),
    fromInfo: v.object(FromInfoSchema),
    ...MessageUserSchema
  }),
  v.object({
    type: v.literal(SendType.SyncStats),
    id: v.string(),
    peerId: v.string(),
    sendTime: v.number(),
    stats: v.object(SiteStatPayloadSchema),
    ...MessageUserSchema
  }),
  v.object({
    type: v.literal(SendType.GlobalText),
    id: v.string(),
    peerId: v.string(),
    sendTime: v.number(),
    body: v.string(),
    atUsers: v.optional(v.array(v.object(AtUserSchema)), []),
    reply: v.optional(v.object(MessageReplySchema)),
    fromInfo: v.object(MessageFromInfoSchema),
    originRoomId: v.optional(v.string()),
    ...MessageUserSchema
  }),
  v.object({
    type: v.literal(SendType.SyncGlobalHistory),
    id: v.string(),
    peerId: v.string(),
    sendTime: v.number(),
    messages: v.array(
      v.object({
        type: v.literal(SendType.GlobalText),
        id: v.string(),
        peerId: v.string(),
        sendTime: v.number(),
        body: v.string(),
        atUsers: v.optional(v.array(v.object(AtUserSchema)), []),
        reply: v.optional(v.object(MessageReplySchema)),
        fromInfo: v.object(MessageFromInfoSchema),
        originRoomId: v.optional(v.string()),
        ...MessageUserSchema
      })
    ),
    ...MessageUserSchema
  })
])

// Check if the message conforms to the format
const checkMessageFormat = (message: v.InferInput<typeof RoomMessageSchema>) =>
  v.safeParse(RoomMessageSchema, message).success

const toGlobalTextMessage = (message: NormalMessage): GlobalTextMessage => ({
  type: SendType.GlobalText,
  id: message.id,
  peerId: message.peerId ?? '',
  sendTime: message.sendTime,
  userId: message.userId,
  username: message.username,
  userAvatar: message.userAvatar,
  body: message.body,
  atUsers: Array.isArray(message.atUsers) ? message.atUsers : [],
  reply: message.reply,
  fromInfo: message.fromInfo ?? {
    href: '',
    hostname: '',
    origin: '',
    title: ''
  }
})

const normalizeGlobalMessage = (message: NormalMessage): NormalMessage => ({
  id: message.id,
  type: MessageType.Normal,
  roomScope: 'global',
  peerId: typeof message.peerId === 'string' ? message.peerId : undefined,
  userId: message.userId,
  username: typeof message.username === 'string' && message.username.length > 0 ? message.username : 'Unknown',
  userAvatar: typeof message.userAvatar === 'string' ? message.userAvatar : '',
  body: typeof message.body === 'string' ? message.body : '',
  sendTime: Number.isFinite(message.sendTime) ? message.sendTime : Date.now(),
  receiveTime: Number.isFinite(message.receiveTime) ? message.receiveTime : Date.now(),
  likeUsers: [],
  hateUsers: [],
  atUsers: Array.isArray(message.atUsers) ? message.atUsers : [],
  reply: message.reply,
  fromInfo:
    message.fromInfo &&
    typeof message.fromInfo.href === 'string' &&
    typeof message.fromInfo.hostname === 'string' &&
    typeof message.fromInfo.origin === 'string' &&
    typeof message.fromInfo.title === 'string'
      ? message.fromInfo
      : undefined
})

const pruneMessageTimes = (timestamps: number[], now: number) => timestamps.filter((value) => value >= now - DAY_MS)

const pruneSeenMessageIds = (messageIds: Record<string, number>, now: number) =>
  Object.fromEntries(Object.entries(messageIds).filter(([, timestamp]) => timestamp >= now - MESSAGE_ID_TTL_MS))

const pruneSnapshots = (
  siteSnapshots: Record<string, Record<string, SitePeerSnapshot>>,
  now: number
): Record<string, Record<string, SitePeerSnapshot>> =>
  Object.fromEntries(
    Object.entries(siteSnapshots)
      .map(([origin, snapshotsByPeer]) => {
        const validSnapshotsByPeer: Record<string, SitePeerSnapshot> = Object.fromEntries(
          Object.entries(snapshotsByPeer).filter(([, snapshot]) => snapshot.sendTime >= now - SITE_SNAPSHOT_TTL_MS)
        )
        return [origin, validSnapshotsByPeer]
      })
      .filter(([, snapshotsByPeer]) => Object.keys(snapshotsByPeer).length)
  ) as Record<string, Record<string, SitePeerSnapshot>>

const getSiteStats = (siteSnapshots: Record<string, Record<string, SitePeerSnapshot>>, now: number): SiteStats[] => {
  const validSnapshots = pruneSnapshots(siteSnapshots, now)

  const statsList: SiteStats[] = []
  Object.values(validSnapshots).forEach((snapshotsByPeer) => {
    const snapshots = Object.values(snapshotsByPeer)
    if (!snapshots.length) {
      return
    }

    const latestSnapshot = snapshots.reduce((latest, snapshot) =>
      snapshot.sendTime > latest.sendTime ? snapshot : latest
    )

    statsList.push({
      origin: latestSnapshot.origin,
      hostname: latestSnapshot.hostname,
      title: latestSnapshot.title,
      icon: latestSnapshot.icon,
      description: latestSnapshot.description,
      messages24h: Math.max(...snapshots.map((snapshot) => snapshot.messages24h)),
      activeUsers: Math.max(...snapshots.map((snapshot) => snapshot.activeUsers)),
      lastActivityAt: Math.max(...snapshots.map((snapshot) => snapshot.lastActivityAt)),
      reporters: snapshots.length,
      updatedAt: latestSnapshot.sendTime
    })
  })

  return statsList.toSorted((a, b) => b.updatedAt - a.updatedAt)
}

const VirtualRoomDomain = Remesh.domain({
  name: 'VirtualRoomDomain',
  impl: (domain) => {
    const storageEffect = new StorageEffect({
      domain,
      extern: IndexDBStorageExtern,
      key: GLOBAL_MESSAGE_LIST_STORAGE_KEY
    })
    const userInfoDomain = domain.getDomain(UserInfoDomain())
    const chatRoomDomain = domain.getDomain(ChatRoomDomain())
    const virtualRoomExtern = domain.getExtern(VirtualRoomExtern)

    const PeerIdState = domain.state<string>({
      name: 'Room.PeerIdState',
      default: virtualRoomExtern.peerId
    })

    const PeerIdQuery = domain.query({
      name: 'Room.PeerIdQuery',
      impl: ({ get }) => {
        return get(PeerIdState())
      }
    })

    const JoinStatusModule = StatusModule(domain, {
      name: 'Room.JoinStatusModule'
    })

    const UserListState = domain.state<RoomUser[]>({
      name: 'Room.UserListState',
      default: []
    })

    const UserListQuery = domain.query({
      name: 'Room.UserListQuery',
      impl: ({ get }) => {
        return get(UserListState())
      }
    })

    const LocalMessageTimesState = domain.state<number[]>({
      name: 'Room.LocalMessageTimesState',
      default: []
    })

    const LastLocalActivityAtState = domain.state<number>({
      name: 'Room.LastLocalActivityAtState',
      default: Date.now()
    })

    const SeenMessageIdsState = domain.state<Record<string, number>>({
      name: 'Room.SeenMessageIdsState',
      default: {}
    })

    const SiteSnapshotsState = domain.state<Record<string, Record<string, SitePeerSnapshot>>>({
      name: 'Room.SiteSnapshotsState',
      default: {}
    })

    const SiteStatsQuery = domain.query({
      name: 'Room.SiteStatsQuery',
      impl: ({ get }) => {
        return getSiteStats(get(SiteSnapshotsState()), Date.now())
      }
    })

    const GlobalTextMessageListState = domain.state<NormalMessage[]>({
      name: 'Room.GlobalTextMessageListState',
      default: []
    })

    const GlobalTextMessageListQuery = domain.query({
      name: 'Room.GlobalTextMessageListQuery',
      impl: ({ get }) => {
        return get(GlobalTextMessageListState()).toSorted((a, b) => a.sendTime - b.sendTime)
      }
    })

    const SelfUserQuery = domain.query({
      name: 'Room.SelfUserQuery',
      impl: ({ get }) => {
        const selfUser = get(UserListQuery()).find((user) => user.peerIds.includes(virtualRoomExtern.peerId))
        if (selfUser) {
          return selfUser
        }

        const userInfo = get(userInfoDomain.query.UserInfoQuery())
        return {
          userId: userInfo?.id ?? 'unknown',
          username: userInfo?.name ?? 'Unknown',
          userAvatar: userInfo?.avatar ?? '',
          joinTime: Date.now(),
          peerIds: [virtualRoomExtern.peerId],
          fromInfos: [{ ...getSiteInfo(), peerId: virtualRoomExtern.peerId }]
        }
      }
    })

    const JoinIsFinishedQuery = JoinStatusModule.query.IsFinishedQuery

    const JoinRoomCommand = domain.command({
      name: 'Room.JoinRoomCommand',
      impl: ({ get }) => {
        const userInfo = get(userInfoDomain.query.UserInfoQuery())
        const userId = userInfo?.id ?? 'unknown'
        const username = userInfo?.name ?? 'Unknown'
        const userAvatar = userInfo?.avatar ?? ''
        return [
          UpdateUserListCommand({
            type: 'create',
            user: {
              peerId: virtualRoomExtern.peerId,
              fromInfo: { ...getSiteInfo(), peerId: virtualRoomExtern.peerId },
              joinTime: Date.now(),
              userId,
              username,
              userAvatar
            }
          }),

          JoinStatusModule.command.SetFinishedCommand(),
          JoinRoomEvent(virtualRoomExtern.roomId),
          SelfJoinRoomEvent(virtualRoomExtern.roomId)
        ]
      }
    })

    JoinRoomCommand.after(() => {
      virtualRoomExtern.joinRoom()
      return null
    })

    const LeaveRoomCommand = domain.command({
      name: 'Room.LeaveRoomCommand',
      impl: ({ get }) => {
        const userInfo = get(userInfoDomain.query.UserInfoQuery())
        const userId = userInfo?.id ?? 'unknown'
        const username = userInfo?.name ?? 'Unknown'
        const userAvatar = userInfo?.avatar ?? ''
        return [
          UpdateUserListCommand({
            type: 'delete',
            user: {
              peerId: virtualRoomExtern.peerId,
              fromInfo: { ...getSiteInfo(), peerId: virtualRoomExtern.peerId },
              joinTime: Date.now(),
              userId,
              username,
              userAvatar
            }
          }),
          JoinStatusModule.command.SetInitialCommand(),
          LeaveRoomEvent(virtualRoomExtern.roomId),
          SelfLeaveRoomEvent(virtualRoomExtern.roomId)
        ]
      }
    })

    LeaveRoomCommand.after(() => {
      virtualRoomExtern.leaveRoom()
      return null
    })

    const UpdateUserListCommand = domain.command({
      name: 'Room.UpdateUserListCommand',
      impl: (
        { get },
        action: {
          type: 'create' | 'delete'
          user: Omit<RoomUser, 'peerIds' | 'fromInfos'> & { peerId: string; fromInfo: FromInfo }
        }
      ) => {
        const userList = get(UserListState())
        const existUser = userList.find((user) => user.userId === action.user.userId)
        if (action.type === 'create') {
          return [
            UserListState().new(
              upsert(
                userList,
                {
                  ...action.user,
                  peerIds: [...new Set(existUser?.peerIds || []), action.user.peerId],
                  fromInfos: upsert(existUser?.fromInfos || [], action.user.fromInfo, 'peerId')
                },
                'userId'
              )
            )
          ]
        } else {
          return [
            UserListState().new(
              upsert(
                userList,
                {
                  ...action.user,
                  peerIds: existUser?.peerIds?.filter((peerId) => peerId !== action.user.peerId) || [],
                  fromInfos: existUser?.fromInfos?.filter((fromInfo) => fromInfo.peerId !== action.user.peerId) || []
                },
                'userId'
              ).filter((user) => user.peerIds.length)
            )
          ]
        }
      }
    })

    const RecordLocalTextActivityCommand = domain.command({
      name: 'Room.RecordLocalTextActivityCommand',
      impl: ({ get }, payload: { id: string; sendTime: number }) => {
        const now = Date.now()
        const normalizedTime = Math.min(payload.sendTime, now)

        const prunedSeenMessageIds = pruneSeenMessageIds(get(SeenMessageIdsState()), now)
        if (prunedSeenMessageIds[payload.id]) {
          return [SeenMessageIdsState().new(prunedSeenMessageIds)]
        }

        const nextSeenMessageIds = {
          ...prunedSeenMessageIds,
          [payload.id]: normalizedTime
        }

        const nextMessageTimes = pruneMessageTimes([...get(LocalMessageTimesState()), normalizedTime], now)

        return [
          SeenMessageIdsState().new(nextSeenMessageIds),
          LocalMessageTimesState().new(nextMessageTimes),
          LastLocalActivityAtState().new(Math.max(get(LastLocalActivityAtState()), normalizedTime))
        ]
      }
    })

    const UpsertSiteSnapshotCommand = domain.command({
      name: 'Room.UpsertSiteSnapshotCommand',
      impl: ({ get }, message: SyncStatsMessage) => {
        const now = Date.now()
        const currentSnapshots = pruneSnapshots(get(SiteSnapshotsState()), now)
        const currentOriginSnapshots = currentSnapshots[message.stats.origin] ?? {}

        const nextSnapshot: SitePeerSnapshot = {
          ...message.stats,
          peerId: message.peerId,
          sendTime: message.sendTime
        }

        return [
          SiteSnapshotsState().new({
            ...currentSnapshots,
            [message.stats.origin]: {
              ...currentOriginSnapshots,
              [message.peerId]: nextSnapshot
            }
          })
        ]
      }
    })

    const SendSyncUserMessageCommand = domain.command({
      name: 'Room.SendSyncUserMessageCommand',
      impl: ({ get }, peerId: string) => {
        const self = get(SelfUserQuery())

        const syncUserMessage: SyncUserMessage = {
          ...self,
          id: nanoid(),
          peerId: virtualRoomExtern.peerId,
          sendTime: Date.now(),
          fromInfo: { ...getSiteInfo(), peerId: virtualRoomExtern.peerId },
          type: SendType.SyncUser
        }

        virtualRoomExtern.sendMessage(syncUserMessage, peerId)
        return [SendSyncUserMessageEvent(syncUserMessage)]
      }
    })

    const SendSyncStatsMessageCommand = domain.command({
      name: 'Room.SendSyncStatsMessageCommand',
      impl: ({ get }, peerId?: string) => {
        if (get(JoinStatusModule.query.IsInitialQuery())) {
          return null
        }

        const self = get(SelfUserQuery())
        const now = Date.now()
        const siteInfo = getSiteInfo()
        const prunedMessageTimes = pruneMessageTimes(get(LocalMessageTimesState()), now)

        const statsPayload: SiteStatPayload = {
          origin: siteInfo.origin,
          hostname: siteInfo.hostname,
          title: siteInfo.title,
          icon: siteInfo.icon,
          description: siteInfo.description,
          messages24h: prunedMessageTimes.length,
          activeUsers: get(chatRoomDomain.query.UserListQuery()).length,
          lastActivityAt: Math.max(get(LastLocalActivityAtState()), now)
        }

        const syncStatsMessage: SyncStatsMessage = {
          ...self,
          id: nanoid(),
          peerId: virtualRoomExtern.peerId,
          sendTime: now,
          type: SendType.SyncStats,
          stats: statsPayload
        }

        virtualRoomExtern.sendMessage(syncStatsMessage, peerId)

        return [
          LocalMessageTimesState().new(prunedMessageTimes),
          UpsertSiteSnapshotCommand(syncStatsMessage),
          SendSyncStatsMessageEvent(syncStatsMessage)
        ]
      }
    })

    const UpsertGlobalTextMessageCommand = domain.command({
      name: 'Room.UpsertGlobalTextMessageCommand',
      impl: ({ get }, message: GlobalTextMessage) => {
        const globalMessage: NormalMessage = normalizeGlobalMessage({
          id: message.id,
          type: MessageType.Normal,
          roomScope: 'global',
          peerId: message.peerId,
          userId: message.userId,
          username: message.username,
          userAvatar: message.userAvatar,
          body: message.body,
          sendTime: message.sendTime,
          receiveTime: Date.now(),
          likeUsers: [],
          hateUsers: [],
          atUsers: message.atUsers ?? [],
          reply: message.reply,
          fromInfo: message.fromInfo
        })
        const messageList = get(GlobalTextMessageListState())
        const nextMessageList = upsert(messageList, globalMessage, 'id')
          .toSorted((a, b) => a.sendTime - b.sendTime)
          .slice(-GLOBAL_MESSAGE_HISTORY_LIMIT)
        return [GlobalTextMessageListState().new(nextMessageList), SyncGlobalTextMessageListToStorageEvent()]
      }
    })

    const SyncGlobalTextMessageListToStorageEvent = domain.event({
      name: 'Room.SyncGlobalTextMessageListToStorageEvent',
      impl: ({ get }) => {
        return get(GlobalTextMessageListQuery())
      }
    })

    const SyncGlobalTextMessageListToStateCommand = domain.command({
      name: 'Room.SyncGlobalTextMessageListToStateCommand',
      impl: (_, messages: NormalMessage[]) => {
        const normalizedMessages = (Array.isArray(messages) ? messages : [])
          .map((message) => normalizeGlobalMessage(message))
          .toSorted((a, b) => a.sendTime - b.sendTime)
          .slice(-GLOBAL_MESSAGE_HISTORY_LIMIT)
        return [GlobalTextMessageListState().new(normalizedMessages)]
      }
    })

    const SendGlobalTextMessageCommand = domain.command({
      name: 'Room.SendGlobalTextMessageCommand',
      impl: ({ get }, message: GlobalTextInput) => {
        if (get(JoinStatusModule.query.IsInitialQuery())) {
          return null
        }

        const self = get(SelfUserQuery())
        const siteInfo = getSiteInfo()
        const fromInfo: MessageFromInfo = message.fromInfo ?? {
          href: siteInfo.href,
          hostname: siteInfo.hostname,
          origin: siteInfo.origin,
          title: siteInfo.title
        }

        const globalTextMessage: GlobalTextMessage = {
          ...self,
          type: SendType.GlobalText,
          id: message.id,
          peerId: virtualRoomExtern.peerId,
          sendTime: message.sendTime,
          body: message.body,
          atUsers: message.atUsers ?? [],
          reply: message.reply,
          fromInfo
        }

        virtualRoomExtern.sendMessage(globalTextMessage)
        return [SendGlobalTextMessageEvent(globalTextMessage), UpsertGlobalTextMessageCommand(globalTextMessage)]
      }
    })

    const SendSyncGlobalHistoryMessageCommand = domain.command({
      name: 'Room.SendSyncGlobalHistoryMessageCommand',
      impl: ({ get }, peerId: string) => {
        if (get(JoinStatusModule.query.IsInitialQuery())) {
          return null
        }

        const self = get(SelfUserQuery())
        const historyMessages = get(GlobalTextMessageListQuery()).map((message) => toGlobalTextMessage(message))

        const payloads = historyMessages.reduce<SyncGlobalHistoryMessage[]>((acc, current) => {
          const nextPayload: SyncGlobalHistoryMessage = {
            ...self,
            type: SendType.SyncGlobalHistory,
            id: nanoid(),
            peerId: virtualRoomExtern.peerId,
            sendTime: Date.now(),
            messages: [current]
          }

          const nextPayloadSize = getTextByteSize(JSON.stringify(nextPayload))
          if (nextPayloadSize >= WEB_RTC_MAX_MESSAGE_SIZE) {
            return acc
          }

          if (!acc.length) {
            acc.push(nextPayload)
            return acc
          }

          const lastPayload = acc[acc.length - 1]
          const mergedSize = getTextByteSize(JSON.stringify(lastPayload)) + nextPayloadSize
          if (mergedSize < WEB_RTC_MAX_MESSAGE_SIZE) {
            lastPayload.messages.push(current)
          } else {
            acc.push(nextPayload)
          }

          return acc
        }, [])

        return payloads.map((payload) => {
          virtualRoomExtern.sendMessage(payload, peerId)
          return SendSyncGlobalHistoryMessageEvent(payload)
        })
      }
    })

    const SendSyncUserMessageEvent = domain.event<SyncUserMessage>({
      name: 'Room.SendSyncUserMessageEvent'
    })

    const SendSyncStatsMessageEvent = domain.event<SyncStatsMessage>({
      name: 'Room.SendSyncStatsMessageEvent'
    })

    const SendGlobalTextMessageEvent = domain.event<GlobalTextMessage>({
      name: 'Room.SendGlobalTextMessageEvent'
    })

    const SendSyncGlobalHistoryMessageEvent = domain.event<SyncGlobalHistoryMessage>({
      name: 'Room.SendSyncGlobalHistoryMessageEvent'
    })

    const JoinRoomEvent = domain.event<string>({
      name: 'Room.JoinRoomEvent'
    })

    const LeaveRoomEvent = domain.event<string>({
      name: 'Room.LeaveRoomEvent'
    })

    const OnMessageEvent = domain.event<RoomMessage>({
      name: 'Room.OnMessageEvent'
    })

    const OnJoinRoomEvent = domain.event<string>({
      name: 'Room.OnJoinRoomEvent'
    })

    const SelfJoinRoomEvent = domain.event<string>({
      name: 'Room.SelfJoinRoomEvent'
    })

    const OnLeaveRoomEvent = domain.event<string>({
      name: 'Room.OnLeaveRoomEvent'
    })

    const SelfLeaveRoomEvent = domain.event<string>({
      name: 'Room.SelfLeaveRoomEvent'
    })

    const OnErrorEvent = domain.event<Error>({
      name: 'Room.OnErrorEvent'
    })

    const OnGlobalTextMessageEvent = domain.event<GlobalTextMessage>({
      name: 'Room.OnGlobalTextMessageEvent'
    })

    domain.effect({
      name: 'Room.OnJoinRoomEffect',
      impl: () => {
        const onJoinRoom$ = fromEventPattern<string>(virtualRoomExtern.onJoinRoom).pipe(
          mergeMap((peerId) => {
            if (virtualRoomExtern.peerId === peerId) {
              return [OnJoinRoomEvent(peerId)]
            }

            return [
              SendSyncUserMessageCommand(peerId),
              SendSyncStatsMessageCommand(peerId),
              SendSyncGlobalHistoryMessageCommand(peerId),
              OnJoinRoomEvent(peerId)
            ]
          })
        )
        return onJoinRoom$
      }
    })

    domain.effect({
      name: 'Room.OnMessageEffect',
      impl: () => {
        const onMessage$ = fromEventPattern<RoomMessage>(virtualRoomExtern.onMessage).pipe(
          mergeMap((message) => {
            // Filter out messages that do not conform to the format
            if (!checkMessageFormat(message)) {
              return EMPTY
            }

            const messageEvent$ = of(OnMessageEvent(message))

            const messageCommand$ = (() => {
              switch (message.type) {
                case SendType.SyncUser:
                  return of(UpdateUserListCommand({ type: 'create', user: message }))

                case SendType.SyncStats:
                  return of(UpsertSiteSnapshotCommand(message))

                case SendType.GlobalText:
                  return of(OnGlobalTextMessageEvent(message), UpsertGlobalTextMessageCommand(message))
                case SendType.SyncGlobalHistory:
                  return of(...message.messages.map((item) => UpsertGlobalTextMessageCommand(item)))

                default:
                  return EMPTY
              }
            })()

            return merge(messageEvent$, messageCommand$)
          })
        )
        return onMessage$
      }
    })

    domain.effect({
      name: 'Room.OnTextActivityEffect',
      impl: ({ fromEvent }) => {
        const onLocalText$ = fromEvent(chatRoomDomain.event.SendTextMessageEvent).pipe(
          mergeMap((message) =>
            of(
              RecordLocalTextActivityCommand({ id: message.id, sendTime: message.sendTime }),
              SendGlobalTextMessageCommand(message)
            )
          )
        )

        const onRemoteText$ = fromEvent(chatRoomDomain.event.OnTextMessageEvent).pipe(
          map((message) => RecordLocalTextActivityCommand({ id: message.id, sendTime: message.sendTime }))
        )

        return merge(onLocalText$, onRemoteText$)
      }
    })

    domain.effect({
      name: 'Room.BroadcastStatsEffect',
      impl: ({ fromEvent, get }) => {
        const trigger$ = merge(
          interval(STATS_BROADCAST_INTERVAL_MS).pipe(startWith(0)),
          fromEvent(SelfJoinRoomEvent).pipe(map(() => Date.now()))
        )

        return trigger$.pipe(
          map(() => {
            if (get(JoinStatusModule.query.IsInitialQuery())) {
              return null
            }
            return SendSyncStatsMessageCommand()
          })
        )
      }
    })

    domain.effect({
      name: 'Room.OnLeaveRoomEffect',
      impl: ({ get }) => {
        const onLeaveRoom$ = fromEventPattern<string>(virtualRoomExtern.onLeaveRoom).pipe(
          map((peerId) => {
            if (get(JoinStatusModule.query.IsInitialQuery())) {
              return null
            }

            const existUser = get(UserListQuery()).find((user) => user.peerIds.includes(peerId))

            if (existUser) {
              return [
                UpdateUserListCommand({
                  type: 'delete',
                  user: { ...existUser, peerId, fromInfo: { ...getSiteInfo(), peerId } }
                }),
                OnLeaveRoomEvent(peerId)
              ]
            }

            return [OnLeaveRoomEvent(peerId)]
          })
        )
        return onLeaveRoom$
      }
    })

    domain.effect({
      name: 'Room.OnErrorEffect',
      impl: () => {
        const onRoomError$ = fromEventPattern<Error>(virtualRoomExtern.onError).pipe(
          map((error) => OnErrorEvent(error))
        )
        return onRoomError$
      }
    })

    storageEffect
      .set(SyncGlobalTextMessageListToStorageEvent)
      .get<NormalMessage[]>((value) => SyncGlobalTextMessageListToStateCommand(value ?? []))

    return {
      query: {
        PeerIdQuery,
        UserListQuery,
        SiteStatsQuery,
        GlobalTextMessageListQuery,
        JoinIsFinishedQuery
      },
      command: {
        JoinRoomCommand,
        LeaveRoomCommand,
        SendSyncUserMessageCommand,
        SendSyncStatsMessageCommand,
        SendGlobalTextMessageCommand,
        SendSyncGlobalHistoryMessageCommand
      },
      event: {
        SendSyncUserMessageEvent,
        SendSyncStatsMessageEvent,
        SendGlobalTextMessageEvent,
        SendSyncGlobalHistoryMessageEvent,
        JoinRoomEvent,
        SelfJoinRoomEvent,
        LeaveRoomEvent,
        SelfLeaveRoomEvent,
        OnMessageEvent,
        OnGlobalTextMessageEvent,
        OnJoinRoomEvent,
        OnLeaveRoomEvent,
        OnErrorEvent
      }
    }
  }
})

export default VirtualRoomDomain
