import type { Room } from '@rtco/client'

import { VirtualRoomExtern } from '@/domain/externs/VirtualRoom'
import { stringToHex } from '@/utils'
import EventHub from '@resreq/event-hub'
import type { RoomMessage } from '@/domain/VirtualRoom'
import { JSONR } from '@/utils'
import { VIRTUAL_ROOM_ID } from '@/constants/config'
import Peer from './Peer'

export interface Config {
  peer: Peer
  roomId: string
}

class VirtualRoom extends EventHub {
  readonly peer: Peer
  readonly roomId: string
  readonly peerId: string
  private room?: Room
  private readonly maxSendRetries = 6
  private readonly baseRetryDelayMs = 200

  constructor(config: Config) {
    super()
    this.peer = config.peer
    this.roomId = config.roomId
    this.peerId = config.peer.id
    this.joinRoom = this.joinRoom.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onJoinRoom = this.onJoinRoom.bind(this)
    this.onLeaveRoom = this.onLeaveRoom.bind(this)
    this.leaveRoom = this.leaveRoom.bind(this)
    this.onError = this.onError.bind(this)
  }

  joinRoom() {
    if (this.room) {
      this.room = this.peer.join(this.roomId)
    } else {
      if (this.peer.state === 'ready') {
        this.room = this.peer.join(this.roomId)
        this.emit('action')
      } else {
        this.peer!.on('open', () => {
          this.room = this.peer.join(this.roomId)
          this.emit('action')
        })
      }
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
      this.once('action', () => {
        trySend(0)
      })
    } else {
      trySend(0)
    }
    return this
  }

  onMessage(callback: (message: RoomMessage) => void) {
    if (!this.room) {
      this.once('action', () => {
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
      this.once('action', () => {
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
      this.once('action', () => {
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
    if (!this.room) {
      this.once('action', () => {
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

const hostRoomId = stringToHex(VIRTUAL_ROOM_ID)

const virtualRoom = new VirtualRoom({ roomId: hostRoomId, peer: Peer.createInstance() })

export const VirtualRoomImpl = VirtualRoomExtern.impl(virtualRoom)
