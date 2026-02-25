import { EventEmitter } from 'eventemitter3'
import { io, type Socket } from 'socket.io-client'

type SignalingState = 'disconnected' | 'connecting' | 'connected' | 'ready'

interface SignalMessage {
  target: string
  session: string
  metadata?: string
  signal: unknown
}

interface InboundSignal {
  type: 'candidate' | 'sdp'
  data: unknown
}

interface InboundSignalMessage extends Omit<SignalMessage, 'signal'> {
  source: string
  signal: InboundSignal
}

interface SocketSignalingConfig {
  id: string
  url?: string
}

export default class SocketSignaling extends EventEmitter {
  private stateValue: SignalingState = 'disconnected'
  private readonly idValue: string
  private readonly socket: Socket
  private readonly candidateFlushDelayMs = 800
  private readonly staleCandidateTtlMs = 15000
  private readonly activeJoins = new Map<string, string | undefined>()
  private readonly pendingSignals: SignalMessage[] = []
  private readonly pendingCandidates = new Map<string, InboundSignalMessage[]>()
  private readonly sessionSdpSeenAt = new Map<string, number>()
  private readonly candidateFlushTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly staleCandidateTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private openHandshakeTimer?: ReturnType<typeof setTimeout>
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
    this.clearSignalOrderingState()
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
    this.clearSignalOrderingState()
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
    const parsed = this.tryParseInboundSignal(message)
    if (!parsed) {
      this.emit('signal', message)
      return
    }

    const session = parsed.session

    if (parsed.signal.type === 'sdp') {
      this.sessionSdpSeenAt.set(session, Date.now())
      this.emit('signal', parsed)
      this.scheduleCandidateFlush(session)
      return
    }

    if (parsed.signal.type === 'candidate') {
      const sdpSeenAt = this.sessionSdpSeenAt.get(session)
      const isSdpMissing = typeof sdpSeenAt !== 'number'
      const isWithinGraceWindow = typeof sdpSeenAt === 'number' && Date.now() - sdpSeenAt < this.candidateFlushDelayMs

      if (isSdpMissing || isWithinGraceWindow) {
        this.enqueueCandidate(session, parsed)
        return
      }
    }

    this.emit('signal', parsed)
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

  private enqueueCandidate(session: string, message: InboundSignalMessage) {
    const queue = this.pendingCandidates.get(session) ?? []
    queue.push(message)
    this.pendingCandidates.set(session, queue)

    if (!this.staleCandidateTimers.has(session)) {
      const timer = setTimeout(() => {
        this.pendingCandidates.delete(session)
        this.clearCandidateTimers(session)
      }, this.staleCandidateTtlMs)
      this.staleCandidateTimers.set(session, timer)
    }
  }

  private scheduleCandidateFlush(session: string) {
    const existingFlushTimer = this.candidateFlushTimers.get(session)
    if (existingFlushTimer) {
      clearTimeout(existingFlushTimer)
    }

    const flushTimer = setTimeout(() => {
      this.candidateFlushTimers.delete(session)
      this.flushPendingCandidatesNow(session)
    }, this.candidateFlushDelayMs)
    this.candidateFlushTimers.set(session, flushTimer)
  }

  private flushPendingCandidatesNow(session: string) {
    const queued = this.pendingCandidates.get(session)
    if (!queued?.length) {
      this.clearCandidateTimers(session)
      return
    }

    this.pendingCandidates.delete(session)
    this.clearCandidateTimers(session)
    for (const candidateMessage of queued) {
      this.emit('signal', candidateMessage)
    }
  }

  private clearCandidateTimers(session: string) {
    const staleTimer = this.staleCandidateTimers.get(session)
    if (staleTimer) {
      clearTimeout(staleTimer)
      this.staleCandidateTimers.delete(session)
    }

    const flushTimer = this.candidateFlushTimers.get(session)
    if (flushTimer) {
      clearTimeout(flushTimer)
      this.candidateFlushTimers.delete(session)
    }
  }

  private clearSignalOrderingState() {
    this.sessionSdpSeenAt.clear()
    this.pendingCandidates.clear()
    for (const timer of this.candidateFlushTimers.values()) {
      clearTimeout(timer)
    }
    this.candidateFlushTimers.clear()
    for (const timer of this.staleCandidateTimers.values()) {
      clearTimeout(timer)
    }
    this.staleCandidateTimers.clear()
  }

  private tryParseInboundSignal(message: unknown): InboundSignalMessage | null {
    if (!message || typeof message !== 'object') return null

    const maybeMessage = message as Partial<InboundSignalMessage>
    if (
      typeof maybeMessage.session !== 'string' ||
      typeof maybeMessage.target !== 'string' ||
      typeof maybeMessage.source !== 'string'
    ) {
      return null
    }

    const maybeSignal = maybeMessage.signal as Partial<InboundSignal> | undefined
    if (!maybeSignal || (maybeSignal.type !== 'candidate' && maybeSignal.type !== 'sdp')) {
      return null
    }

    return {
      target: maybeMessage.target,
      source: maybeMessage.source,
      session: maybeMessage.session,
      metadata: maybeMessage.metadata,
      signal: {
        type: maybeSignal.type,
        data: maybeSignal.data
      }
    }
  }
}
