import stringToHex from './stringToHex'

export const GLOBAL_LOBBY_ROOM_ID = 'room:global' as const
const DOMAIN_ROOM_PREFIX = 'room:domain:' as const

export type DomainRoomId = `${typeof DOMAIN_ROOM_PREFIX}${string}`
export type RoomId = typeof GLOBAL_LOBBY_ROOM_ID | DomainRoomId

export type ParsedRoomId =
  | {
      type: 'global'
      roomId: typeof GLOBAL_LOBBY_ROOM_ID
    }
  | {
      type: 'domain'
      roomId: DomainRoomId
      hostname: string
    }

export const normalizeRoomHostname = (hostname: string) => {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/i, '')
    .replace(/^www\./i, '')
}

export const createDomainRoomId = (hostname: string): DomainRoomId => {
  return `${DOMAIN_ROOM_PREFIX}${normalizeRoomHostname(hostname)}`
}

export const getCurrentDomainRoomId = (): DomainRoomId => {
  return createDomainRoomId(document.location.hostname)
}

export const parseRoomId = (roomId: string): ParsedRoomId | null => {
  if (roomId === GLOBAL_LOBBY_ROOM_ID) {
    return {
      type: 'global',
      roomId
    }
  }

  if (!roomId.startsWith(DOMAIN_ROOM_PREFIX)) {
    return null
  }

  const hostname = normalizeRoomHostname(roomId.slice(DOMAIN_ROOM_PREFIX.length))
  if (!hostname) {
    return null
  }

  const normalizedRoomId = createDomainRoomId(hostname)

  return {
    type: 'domain',
    roomId: normalizedRoomId,
    hostname
  }
}

export const toTransportRoomId = (roomId: RoomId) => {
  return stringToHex(roomId)
}
