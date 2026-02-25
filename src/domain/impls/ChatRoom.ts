import type { Room } from '@rtco/client'

import { ChatRoomExtern } from '@/domain/externs/ChatRoom'
import { stringToHex } from '@/utils'
import EventHub from '@resreq/event-hub'
import type { RoomMessage } from '@/domain/ChatRoom'
import { JSONR } from '@/utils'
import Peer from './Peer'

export interface Config {
  peer: Peer
  roomId: string
}

class ChatRoom extends EventHub {
  readonly peer: Peer
  readonly roomId: string
  readonly peerId: string
  private room?: Room
  private connectTimeout?: ReturnType<typeof setTimeout>
  private readonly maxSendRetries = 6
  private readonly baseRetryDelayMs = 200

  constructor(config: Config) {
    super()
    this.peer = config.peer
    this.roomId = config.roomId
    this.peerId = config.peer.id
    this.joinRoom = this.joinRoom.bind(this)
    this.onReady = this.onReady.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onJoinRoom = this.onJoinRoom.bind(this)
    this.onLeaveRoom = this.onLeaveRoom.bind(this)
    this.leaveRoom = this.leaveRoom.bind(this)
    this.onError = this.onError.bind(this)
  }

  joinRoom() {
    this.startConnectTimeout()
    if (this.room) {
      this.room = this.peer.join(this.roomId)
      this.handleReady()
    } else {
      if (this.peer.state === 'ready') {
        this.room = this.peer.join(this.roomId)
        this.handleReady()
      } else {
        this.peer.once('open', () => {
          this.room = this.peer.join(this.roomId)
          this.handleReady()
        })
      }
    }
    return this
  }

  onReady(callback: (roomId: string) => void) {
    if (!this.room) {
      this.once('ready', () => {
        callback(this.roomId)
      })
    } else {
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
    if (!this.room) {
      this.once('ready', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.on('message', (message) => callback(JSONR.parse(message) as RoomMessage))
        }
      })
    } else {
      this.room.on('message', (message) => callback(JSONR.parse(message) as RoomMessage))
    }
    return this
  }

  onJoinRoom(callback: (id: string) => void) {
    if (!this.room) {
      this.once('ready', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.on('join', (id) => callback(id))
        }
      })
    } else {
      this.room.on('join', (id) => callback(id))
    }
    return this
  }

  onLeaveRoom(callback: (id: string) => void) {
    if (!this.room) {
      this.once('ready', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.on('leave', (id) => callback(id))
        }
      })
    } else {
      this.room.on('leave', (id) => callback(id))
    }
    return this
  }

  leaveRoom() {
    this.clearConnectTimeout()
    if (!this.room) {
      this.once('ready', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.leave()
          this.room = undefined
        }
      })
    } else {
      this.room.leave()
      this.room = undefined
    }
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
    this.emit('ready', this.roomId)
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

const normalizedHost = document.location.hostname.replace(/^www\./i, '')
const hostRoomId = stringToHex(normalizedHost)

const chatRoom = new ChatRoom({ roomId: hostRoomId, peer: Peer.createInstance() })

export const ChatRoomImpl = ChatRoomExtern.impl(chatRoom)

// https://github.com/w3c/webextensions/issues/72
// https://issues.chromium.org/issues/40251342
// https://github.com/w3c/webrtc-extensions/issues/77
// https://github.com/aklinker1/webext-core/pull/70
