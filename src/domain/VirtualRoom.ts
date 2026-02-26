import { Remesh } from 'remesh'
import { EMPTY, fromEventPattern, interval, map, merge, mergeMap, of, startWith } from 'rxjs'
import { type MessageUser } from './MessageList'
import { VirtualRoomExtern } from '@/domain/externs/VirtualRoom'
import UserInfoDomain from '@/domain/UserInfo'
import { upsert } from '@/utils'
import { nanoid } from 'nanoid'
import StatusModule from '@/domain/modules/Status'
import * as v from 'valibot'
import type { SiteInfo } from '@/utils/getSiteInfo'
import getSiteInfo from '@/utils/getSiteInfo'
import ChatRoomDomain from '@/domain/ChatRoom'

const DAY_MS = 24 * 60 * 60 * 1000
const MESSAGE_ID_TTL_MS = 2 * DAY_MS
const SITE_SNAPSHOT_TTL_MS = 90 * 60 * 1000
const STATS_BROADCAST_INTERVAL_MS = 30 * 1000

export enum SendType {
  SyncUser = 'SyncUser',
  SyncStats = 'SyncStats'
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

export interface SitePeerSnapshot extends SiteStatPayload {
  peerId: string
  sendTime: number
}

export interface SiteStats extends SiteStatPayload {
  reporters: number
  updatedAt: number
}

export type RoomMessage = SyncUserMessage | SyncStatsMessage

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
  })
])

// Check if the message conforms to the format
const checkMessageFormat = (message: v.InferInput<typeof RoomMessageSchema>) =>
  v.safeParse(RoomMessageSchema, message).success

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

    const SelfUserQuery = domain.query({
      name: 'Room.SelfUserQuery',
      impl: ({ get }) => {
        return get(UserListQuery()).find((user) => user.peerIds.includes(virtualRoomExtern.peerId))!
      }
    })

    const JoinIsFinishedQuery = JoinStatusModule.query.IsFinishedQuery

    const JoinRoomCommand = domain.command({
      name: 'Room.JoinRoomCommand',
      impl: ({ get }) => {
        const { id: userId, name: username, avatar: userAvatar } = get(userInfoDomain.query.UserInfoQuery())!
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
        const { id: userId, name: username, avatar: userAvatar } = get(userInfoDomain.query.UserInfoQuery())!
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

    const SendSyncUserMessageEvent = domain.event<SyncUserMessage>({
      name: 'Room.SendSyncUserMessageEvent'
    })

    const SendSyncStatsMessageEvent = domain.event<SyncStatsMessage>({
      name: 'Room.SendSyncStatsMessageEvent'
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

    domain.effect({
      name: 'Room.OnJoinRoomEffect',
      impl: () => {
        const onJoinRoom$ = fromEventPattern<string>(virtualRoomExtern.onJoinRoom).pipe(
          mergeMap((peerId) => {
            if (virtualRoomExtern.peerId === peerId) {
              return [OnJoinRoomEvent(peerId)]
            }

            return [SendSyncUserMessageCommand(peerId), SendSyncStatsMessageCommand(peerId), OnJoinRoomEvent(peerId)]
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

                default:
                  console.warn('Unsupported message type', message)
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
          map((message) => RecordLocalTextActivityCommand({ id: message.id, sendTime: message.sendTime }))
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

    return {
      query: {
        PeerIdQuery,
        UserListQuery,
        SiteStatsQuery,
        JoinIsFinishedQuery
      },
      command: {
        JoinRoomCommand,
        LeaveRoomCommand,
        SendSyncUserMessageCommand,
        SendSyncStatsMessageCommand
      },
      event: {
        SendSyncUserMessageEvent,
        SendSyncStatsMessageEvent,
        JoinRoomEvent,
        SelfJoinRoomEvent,
        LeaveRoomEvent,
        SelfLeaveRoomEvent,
        OnMessageEvent,
        OnJoinRoomEvent,
        OnLeaveRoomEvent,
        OnErrorEvent
      }
    }
  }
})

export default VirtualRoomDomain
