export type SimulatedPresenceType = 'bot' | 'ai'
export type SimulatedPresenceStatus =
  | 'online'
  | 'crawling'
  | 'idle'
  | 'analyzing'
  | 'indexing'
  | 'syncing'
  | 'rate-limited'
  | 'error'

export interface SimulatedPresenceCharacter {
  id: string
  name: string
  avatar: string
  type: SimulatedPresenceType
  status: SimulatedPresenceStatus
}

export interface SimulatedPresenceScope {
  botsOnline: SimulatedPresenceCharacter[]
  aiOnline: SimulatedPresenceCharacter[]
}

export interface SimulatedPresenceState {
  local: SimulatedPresenceScope
  global: SimulatedPresenceScope
}

export const ENABLE_SIMULATED_PRESENCE = true
export const SIMULATED_PRESENCE_REFRESH_MIN_MS = 15_000
export const SIMULATED_PRESENCE_REFRESH_MAX_MS = 60_000

const BOT_NAMES = [
  'Nightbot',
  'Dyno',
  'MEE6',
  'Carl-bot',
  'ProBot',
  'StreamElements',
  'Moobot',
  'Wizebot',
  'Combot',
  'BotFather',
  'Googlebot',
  'Bingbot',
  'YandexBot',
  'AhrefsBot',
  'SemrushBot'
]

const AI_NAMES = [
  'GPT-4o',
  'Claude 3.5 Sonnet',
  'Gemini 1.5 Pro',
  'Llama 3.1 70B',
  'Mistral Large',
  'DeepSeek-R1',
  'Command R+',
  'Qwen2.5-72B',
  'Grok-2',
  'Gemma 2 27B'
]

const BOT_ACCENTS = [
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
  '#14b8a6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#10b981'
]
const AI_ACCENTS = [
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#eab308',
  '#ef4444'
]
const SIMULATED_STATUSES: SimulatedPresenceStatus[] = [
  'online',
  'crawling',
  'idle',
  'analyzing',
  'indexing',
  'syncing',
  'rate-limited',
  'error'
]

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const shuffle = <T>(list: T[]): T[] => {
  const next = [...list]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = current
  }
  return next
}

const pickRandomInRange = (list: SimulatedPresenceCharacter[], min: number, max: number) => {
  const safeMin = Math.min(min, list.length)
  const safeMax = Math.min(max, list.length)
  const count = randomInt(safeMin, safeMax)
  return shuffle(list).slice(0, count)
}

const withRandomStatuses = (list: SimulatedPresenceCharacter[]) => {
  const next = list.map((character) => ({
    ...character,
    status: SIMULATED_STATUSES[randomInt(0, SIMULATED_STATUSES.length - 1)]
  }))

  if (next.length >= 2 && next.every((character) => character.status === 'online')) {
    const forceIndex = randomInt(0, next.length - 1)
    next[forceIndex] = {
      ...next[forceIndex],
      status: SIMULATED_STATUSES[randomInt(1, SIMULATED_STATUSES.length - 1)]
    }
  }

  return next
}

const extendWithExtra = (
  base: SimulatedPresenceCharacter[],
  all: SimulatedPresenceCharacter[],
  minExtra: number,
  maxExtra: number
) => {
  const baseIds = new Set(base.map((character) => character.id))
  const remaining = all.filter((character) => !baseIds.has(character.id))
  const extra = pickRandomInRange(remaining, Math.min(minExtra, remaining.length), Math.min(maxExtra, remaining.length))
  return [...base, ...extra]
}

const createAvatar = (name: string, accent: string) => {
  const initials = name
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 2)
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="12" fill="#0f172a"/><circle cx="32" cy="24" r="11" fill="${accent}" opacity="0.85"/><path d="M12 56c2-13 9-22 20-22s18 9 20 22" fill="${accent}" opacity="0.55"/><text x="32" y="38" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="#e2e8f0">${initials}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const createCharacters = (
  names: string[],
  accents: string[],
  type: SimulatedPresenceType
): SimulatedPresenceCharacter[] =>
  names.map((name, index) => ({
    id: `${type}-${index + 1}`,
    name,
    avatar: createAvatar(name, accents[index % accents.length]),
    type,
    status: 'online'
  }))

export const BOT_CHARACTERS = createCharacters(BOT_NAMES, BOT_ACCENTS, 'bot')
export const AI_CHARACTERS = createCharacters(AI_NAMES, AI_ACCENTS, 'ai')

const areSameCharacters = (current: SimulatedPresenceCharacter[], next: SimulatedPresenceCharacter[]) => {
  if (current.length !== next.length) return false
  const currentIds = current
    .map((character) => `${character.id}:${character.status}`)
    .sort()
    .join(',')
  const nextIds = next
    .map((character) => `${character.id}:${character.status}`)
    .sort()
    .join(',')
  return currentIds === nextIds
}

const hasChanged = (current: SimulatedPresenceState, next: SimulatedPresenceState) =>
  !areSameCharacters(current.local.botsOnline, next.local.botsOnline) ||
  !areSameCharacters(current.local.aiOnline, next.local.aiOnline) ||
  !areSameCharacters(current.global.botsOnline, next.global.botsOnline) ||
  !areSameCharacters(current.global.aiOnline, next.global.aiOnline)

export const EMPTY_SIMULATED_PRESENCE_STATE: SimulatedPresenceState = {
  local: { botsOnline: [], aiOnline: [] },
  global: { botsOnline: [], aiOnline: [] }
}

export const getRandomPresenceRefreshMs = () =>
  randomInt(SIMULATED_PRESENCE_REFRESH_MIN_MS, SIMULATED_PRESENCE_REFRESH_MAX_MS)

export const createSimulatedPresenceState = (): SimulatedPresenceState => {
  const localBots = pickRandomInRange(BOT_CHARACTERS, 0, 3)
  const localAi = pickRandomInRange(AI_CHARACTERS, 0, 3)
  return {
    local: {
      botsOnline: withRandomStatuses(localBots),
      aiOnline: withRandomStatuses(localAi)
    },
    global: {
      botsOnline: withRandomStatuses(extendWithExtra(localBots, BOT_CHARACTERS, 1, 2)),
      aiOnline: withRandomStatuses(extendWithExtra(localAi, AI_CHARACTERS, 1, 2))
    }
  }
}

export const createNextSimulatedPresenceState = (previous?: SimulatedPresenceState): SimulatedPresenceState => {
  if (!previous) return createSimulatedPresenceState()
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const next = createSimulatedPresenceState()
    if (hasChanged(previous, next)) {
      return next
    }
  }
  return createSimulatedPresenceState()
}
