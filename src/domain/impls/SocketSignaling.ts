import { EventEmitter } from 'eventemitter3'
import { io, type Socket } from 'socket.io-client'

type SignalingState = 'disconnected' | 'connecting' | 'connected' | 'ready'

interface SignalMessage {
  target: string
  session: string
  metadata?: string
  signal: unknown
}

interface SocketSignalingConfig {
  id: string
  url?: string
}

export default class SocketSignaling extends EventEmitter {
  private stateValue: SignalingState = 'disconnected'
  private readonly idValue: string
  private readonly socket: Socket
  private readonly activeJoins = new Map<string, string | undefined>()
  private readonly pendingSignals: SignalMessage[] = []
  private openHandshakeTimer?: ReturnType<typeof setTimeout>
  private joinHeartbeatTimer?: ReturnType<typeof setInterval>
  private isBound = false

  constructor(config: SocketSignalingConfig) {
    super()
    this.idValue = config.id
    const url = config.url ?? 'https://0.artico.dev:443'
    this.socket = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
      query: { id: this.idValue }
    })
  }

  get id() {
    return this.idValue
  }

  get state() {
    return this.stateValue
  }

  connect() {
    if (this.stateValue === 'connecting' || this.stateValue === 'connected' || this.stateValue === 'ready') {
      return
    }
    this.stateValue = 'connecting'
    this.bindEvents()
    this.socket.connect()
  }

  disconnect() {
    this.clearOpenHandshakeTimer()
    this.clearJoinHeartbeat()
    this.unbindEvents()
    this.socket.disconnect()
    this.stateValue = 'disconnected'
  }

  signal(message: SignalMessage) {
    if (this.stateValue !== 'ready') {
      this.pendingSignals.push(message)
      return
    }
    this.socket.emit('signal', message)
  }

  join(roomId: string, metadata?: string) {
    this.activeJoins.set(roomId, metadata)

    if (this.stateValue === 'ready') {
      this.socket.emit('join', roomId, metadata)
      return
    }

    if (this.stateValue === 'disconnected') {
      this.connect()
    }
  }

  private bindEvents() {
    if (this.isBound) return
    this.socket.on('connect', this.handleConnect)
    this.socket.on('disconnect', this.handleDisconnect)
    this.socket.on('connect_error', this.handleConnectError)
    this.socket.on('open', this.handleOpen)
    this.socket.on('error', this.handleError)
    this.socket.on('signal', this.handleSignal)
    this.socket.on('join', this.handleJoin)
    this.isBound = true
  }

  private unbindEvents() {
    if (!this.isBound) return
    this.socket.off('connect', this.handleConnect)
    this.socket.off('disconnect', this.handleDisconnect)
    this.socket.off('connect_error', this.handleConnectError)
    this.socket.off('open', this.handleOpen)
    this.socket.off('error', this.handleError)
    this.socket.off('signal', this.handleSignal)
    this.socket.off('join', this.handleJoin)
    this.isBound = false
  }

  private handleConnect = () => {
    this.stateValue = 'connected'
    this.clearOpenHandshakeTimer()
    this.openHandshakeTimer = setTimeout(() => {
      if (this.stateValue === 'connected') {
        this.emit('error', new Error('signaling-open-timeout: connected but not ready'))
      }
    }, 7000)
  }

  private handleDisconnect = () => {
    this.clearOpenHandshakeTimer()
    this.clearJoinHeartbeat()
    this.stateValue = 'disconnected'
    this.emit('disconnect')
  }

  private handleConnectError = (error: Error) => {
    this.emit('error', new Error(`signaling-connect-error: ${error.message}`))
  }

  private handleOpen = (id: string) => {
    this.markReady(id)
  }

  private handleError = (error: string) => {
    this.emit('error', new Error(`signaling-error: ${error}`))
  }

  private handleSignal = (message: unknown) => {
    this.emit('signal', message)
  }

  private handleJoin = (roomId: string, peerId: string, metadata?: string) => {
    this.emit('join', roomId, peerId, metadata)
  }

  private markReady(id: string) {
    if (this.stateValue === 'ready') return
    this.clearOpenHandshakeTimer()
    this.stateValue = 'ready'
    this.emit('connect', id)
    this.flushQueuedSignals()
    this.syncRoomJoins()
    this.startJoinHeartbeat()
  }

  private flushQueuedSignals() {
    if (this.stateValue !== 'ready') return
    while (this.pendingSignals.length) {
      const signal = this.pendingSignals.shift()!
      this.socket.emit('signal', signal)
    }
  }

  private syncRoomJoins() {
    if (this.stateValue !== 'ready') return
    for (const [roomId, metadata] of this.activeJoins) {
      this.socket.emit('join', roomId, metadata)
    }
  }

  private clearOpenHandshakeTimer() {
    if (!this.openHandshakeTimer) return
    clearTimeout(this.openHandshakeTimer)
    this.openHandshakeTimer = undefined
  }

  private startJoinHeartbeat() {
    this.clearJoinHeartbeat()
    this.joinHeartbeatTimer = setInterval(() => {
      this.syncRoomJoins()
    }, 5000)
  }

  private clearJoinHeartbeat() {
    if (!this.joinHeartbeatTimer) return
    clearInterval(this.joinHeartbeatTimer)
    this.joinHeartbeatTimer = undefined
  }
}
