import { nanoid } from 'nanoid'
import { Artico } from '@rtco/client'

export interface Config {
  peerId?: string
}

export default class Peer extends Artico {
  private static instance: Peer | null = null
  private constructor(config: Config = {}) {
    const { peerId = nanoid() } = config
    super({
      id: peerId,
      debug: 0,
      rtcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' }
        ]
      }
    })
  }

  public static createInstance(config: Config = {}) {
    return (this.instance ??= new Peer(config))
  }

  public static getInstance() {
    return this.instance
  }
}
