import { Remesh } from 'remesh'
import type { RoomMessage } from '../ChatRoom'

export type RoomScope = 'local' | 'global'

export interface ChatRoom {
  readonly peerId: string
  readonly roomId: string
  readonly scope: RoomScope
  joinRoom: () => ChatRoom
  setScope: (scope: RoomScope) => ChatRoom
  onReady: (callback: (roomId: string) => void) => ChatRoom
  sendMessage: (message: RoomMessage, id?: string | string[]) => ChatRoom
  onMessage: (callback: (message: RoomMessage) => void) => ChatRoom
  leaveRoom: () => ChatRoom
  onJoinRoom: (callback: (id: string) => void) => ChatRoom
  onLeaveRoom: (callback: (id: string) => void) => ChatRoom
  onError: (callback: (error: Error) => void) => ChatRoom
}

export const ChatRoomExtern = Remesh.extern<ChatRoom>({
  default: {
    peerId: '',
    roomId: '',
    scope: 'local',
    joinRoom: () => {
      throw new Error('"joinRoom" not implemented.')
    },
    setScope: () => {
      throw new Error('"setScope" not implemented.')
    },
    onReady: () => {
      throw new Error('"onReady" not implemented.')
    },
    sendMessage: () => {
      throw new Error('"sendMessage" not implemented.')
    },
    onMessage: () => {
      throw new Error('"onMessage" not implemented.')
    },
    leaveRoom: () => {
      throw new Error('"leaveRoom" not implemented.')
    },
    onJoinRoom: () => {
      throw new Error('"onJoinRoom" not implemented.')
    },
    onLeaveRoom: () => {
      throw new Error('"onLeaveRoom" not implemented.')
    },
    onError: () => {
      throw new Error('"onError" not implemented.')
    }
  }
})
