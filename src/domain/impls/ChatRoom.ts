import type { Room } from '@rtco/client'

import { ChatRoomExtern } from '@/domain/externs/ChatRoom'
import type { RoomScope } from '@/domain/externs/ChatRoom'
import EventHub from '@resreq/event-hub'
import type { RoomMessage } from '@/domain/ChatRoom'
import { JSONR } from '@/utils'
import { GLOBAL_LOBBY_ROOM_ID, getCurrentDomainRoomId, toTransportRoomId } from '@/utils/roomRouting'
import Peer from './Peer'

export interface Config {
  peer: Peer
  localRoomId: string
  globalRoomId: string
}

class ChatRoom extends EventHub {
  readonly peer: Peer
  private localRoomId: string
  private readonly globalRoomId: string
  private currentScope: RoomScope = 'local'
  readonly peerId: string
  private room?: Room
  private readonly intentionalCloseRooms = new WeakSet<Room>()
  private connectTimeout?: ReturnType<typeof setTimeout>
  private peerOpenHandler?: () => void
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private reconnectAttempts = 0
  private shouldStayConnected = false
  private readonly maxSendRetries = 6
  private readonly baseRetryDelayMs = 200
  private readonly maxReconnectDelayMs = 10000
  private static readonly READY_EVENT = 'ready'
  private static readonly MESSAGE_EVENT = 'message'
  private static readonly JOIN_EVENT = 'join-room'
  private static readonly LEAVE_EVENT = 'leave-room'

  get scope() {
    return this.currentScope
  }

  get roomId() {
    return this.currentScope === 'global' ? this.globalRoomId : this.localRoomId
  }

  constructor(config: Config) {
    super()
    this.peer = config.peer
    this.localRoomId = config.localRoomId
    this.globalRoomId = config.globalRoomId
    this.peerId = config.peer.id
    this.joinRoom = this.joinRoom.bind(this)
    this.setLocalRoomId = this.setLocalRoomId.bind(this)
    this.setScope = this.setScope.bind(this)
    this.onReady = this.onReady.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onJoinRoom = this.onJoinRoom.bind(this)
    this.onLeaveRoom = this.onLeaveRoom.bind(this)
    this.leaveRoom = this.leaveRoom.bind(this)
    this.onError = this.onError.bind(this)
  }

  setScope(scope: RoomScope) {
    if (this.currentScope === scope) {
      return this
    }
    this.currentScope = scope
    this.clearConnectTimeout()
    this.leaveActiveRoom()
    return this
  }

  setLocalRoomId(roomId: string) {
    if (this.localRoomId === roomId) {
      return this
    }

    this.localRoomId = roomId

    if (this.currentScope === 'local') {
      if (this.shouldStayConnected) {
        this.joinRoom()
      } else {
        this.clearConnectTimeout()
        this.leaveActiveRoom()
      }
    }

    return this
  }

  joinRoom() {
    this.shouldStayConnected = true
    this.clearReconnectTimer()
    this.startConnectTimeout()
    this.leaveActiveRoom()

    if (this.peer.state === 'ready') {
      this.connectRoom()
    } else {
      if (!this.peerOpenHandler) {
        this.peerOpenHandler = () => {
          this.peerOpenHandler = undefined
          this.connectRoom()
        }
        this.peer.once('open', this.peerOpenHandler)
      }
    }
    return this
  }

  onReady(callback: (roomId: string) => void) {
    this.on(ChatRoom.READY_EVENT, (roomId: unknown) => callback(String(roomId)))
    if (this.room) {
      callback(this.roomId)
    }
    return this
  }

  sendMessage(message: RoomMessage, id?: string | string[]) {
    const trySend = (attempt: number) => {
      if (!this.room) {
        this.emit('error', new Error('Room not joined'))
        return
      }
      try {
        this.room.send(JSONR.stringify(message)!, id)
      } catch (error) {
        const normalizedError = this.toError(error)
        if (this.isTransientConnectionError(normalizedError)) {
          if (attempt < this.maxSendRetries) {
            const retryDelay = this.baseRetryDelayMs * (attempt + 1)
            setTimeout(() => {
              trySend(attempt + 1)
            }, retryDelay)
          }
          // Transient peer readiness race: retried best-effort; avoid emitting noisy errors.
          return
        }
        this.emit('error', normalizedError)
      }
    }

    if (!this.room) {
      const timeout = setTimeout(() => {
        this.emit('error', new Error('Cannot send message: chat room is not connected yet'))
      }, 3000)
      this.once('ready', () => {
        clearTimeout(timeout)
        trySend(0)
      })
    } else {
      trySend(0)
    }
    return this
  }

  onMessage(callback: (message: RoomMessage) => void) {
    this.on(ChatRoom.MESSAGE_EVENT, (message: unknown) => callback(message as RoomMessage))
    return this
  }

  onJoinRoom(callback: (id: string) => void) {
    this.on(ChatRoom.JOIN_EVENT, (id: unknown) => callback(String(id)))
    return this
  }

  onLeaveRoom(callback: (id: string) => void) {
    this.on(ChatRoom.LEAVE_EVENT, (id: unknown) => callback(String(id)))
    return this
  }

  leaveRoom() {
    this.shouldStayConnected = false
    this.clearConnectTimeout()
    this.clearReconnectTimer()
    if (this.peerOpenHandler) {
      this.peer.off('open', this.peerOpenHandler)
      this.peerOpenHandler = undefined
    }
    this.leaveActiveRoom()
    return this
  }
  onError(callback: (error: Error) => void) {
    this.peer?.on('error', (error: unknown) => callback(this.toError(error)))
    this.on('error', (error: unknown) => callback(this.toError(error)))
    return this
  }

  private startConnectTimeout() {
    this.clearConnectTimeout()
    this.connectTimeout = setTimeout(() => {
      if (!this.room) {
        this.emit('error', new Error('Chat connection timeout: failed to establish P2P room'))
      }
    }, 7000)
  }

  private clearConnectTimeout() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout)
      this.connectTimeout = undefined
    }
  }

  private handleReady() {
    this.clearConnectTimeout()
    this.clearReconnectTimer()
    this.reconnectAttempts = 0
    console.info('[GhostChat chat-room] ready', { roomId: this.roomId, peerId: this.peerId, scope: this.currentScope })
    this.emit(ChatRoom.READY_EVENT, this.roomId)
  }

  private connectRoom() {
    const activeRoom = this.peer.join(this.roomId)
    this.room = activeRoom
    this.bindRoomEvents(activeRoom)
    this.handleReady()
  }

  private bindRoomEvents(room: Room) {
    room.on('message', (message) => {
      if (this.room !== room) return
      try {
        this.emit(ChatRoom.MESSAGE_EVENT, JSONR.parse(message) as RoomMessage)
      } catch (error) {
        this.emit('error', this.toError(error))
      }
    })
    room.on('join', (id) => {
      if (this.room !== room) return
      console.info('[GhostChat chat-room] peer joined', { roomId: this.roomId, peerId: id })
      this.emit(ChatRoom.JOIN_EVENT, id)
    })
    room.on('leave', (id) => {
      if (this.room !== room) return
      console.info('[GhostChat chat-room] peer left', { roomId: this.roomId, peerId: id })
      this.emit(ChatRoom.LEAVE_EVENT, id)
    })
    room.on('close', () => {
      if (this.intentionalCloseRooms.has(room)) {
        this.intentionalCloseRooms.delete(room)
        return
      }
      if (this.room !== room) return
      this.room = undefined
      console.warn('[GhostChat chat-room] room closed; scheduling reconnect', { roomId: this.roomId })
      this.emit('error', new Error('Chat room closed unexpectedly'))
      this.scheduleReconnect('room-close')
    })
  }

  private leaveActiveRoom() {
    const activeRoom = this.room
    if (!activeRoom) return
    this.room = undefined
    this.intentionalCloseRooms.add(activeRoom)
    activeRoom.leave()
  }

  private scheduleReconnect(reason: string) {
    if (!this.shouldStayConnected || this.reconnectTimer || this.room) return
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelayMs)
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      if (!this.shouldStayConnected || this.room) return
      console.info('[GhostChat chat-room] reconnecting', {
        reason,
        attempt: this.reconnectAttempts,
        roomId: this.roomId
      })
      this.emit('error', new Error(`Chat reconnecting after ${reason}`))
      this.joinRoom()
    }, delay)
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = undefined
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    if (typeof error === 'string') {
      return new Error(error)
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return new Error(JSON.stringify(error))
      } catch {
        return new Error('[non-serializable error object]')
      }
    }
    return new Error(String(error))
  }

  private isTransientConnectionError(error: Error): boolean {
    return error.message.toLowerCase().includes('connection is not established yet')
  }
}

const localRoomId = toTransportRoomId(getCurrentDomainRoomId())
const globalRoomId = toTransportRoomId(GLOBAL_LOBBY_ROOM_ID)

const chatRoom = new ChatRoom({ localRoomId, globalRoomId, peer: Peer.createInstance() })

export const ChatRoomImpl = ChatRoomExtern.impl(chatRoom)

// https://github.com/w3c/webextensions/issues/72
// https://issues.chromium.org/issues/40251342
// https://github.com/w3c/webrtc-extensions/issues/77
// https://github.com/aklinker1/webext-core/pull/70
