import type { FC } from 'react'
import {
  ActivityIcon,
  ArrowRightIcon,
  CompassIcon,
  LandmarkIcon,
  MessageCirclePlusIcon,
  SparklesIcon,
  WalletIcon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils'
import type { ActiveRoom } from './active-rooms'
import { buildSuggestedRoomProjectSnapshot } from './suggested-room-project-snapshot'
import type { SuggestedRoomWithSignal } from './suggested-room-signals'

interface GhostTownCtaPanelProps {
  suggestedRooms: SuggestedRoomWithSignal[]
  activeRooms: ActiveRoom[]
  onStartFirstMessage: () => void
  onJoinGlobalLobby: () => void
  onJoinSuggestedRoom: (hostname: string) => void
}

const GhostTownCtaPanel: FC<GhostTownCtaPanelProps> = ({
  suggestedRooms,
  activeRooms,
  onStartFirstMessage,
  onJoinGlobalLobby,
  onJoinSuggestedRoom
}) => {
  const topRooms = suggestedRooms.slice(0, 3)
  const topActiveRooms = activeRooms.slice(0, 5)
  const getSignalToneClass = (tone: SuggestedRoomWithSignal['signal']['tone'] | ActiveRoom['signal']['tone']) =>
    ({
      hot: 'text-rose-700 dark:text-rose-300',
      info: 'text-sky-700 dark:text-sky-300',
      alert: 'text-red-700 dark:text-red-300',
      neutral: 'text-slate-600 dark:text-slate-300'
    })[tone]

  return (
    <>
      <div className="mx-2 mt-2">
        <div className="w-full rounded-xl border border-slate-300/70 bg-slate-50/90 p-3 shadow-sm backdrop-blur-md dark:border-slate-600/60 dark:bg-slate-800/70">
          <div className="mb-2 text-[10px] font-semibold tracking-[0.04em] text-slate-500 uppercase dark:text-slate-300">
            Quick Actions
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={onStartFirstMessage}
              className="group h-auto w-full items-start justify-start whitespace-normal rounded-xl border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-emerald-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <span className="mr-2 inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 motion-safe:animate-[pulse_3.2s_ease-in-out_infinite] dark:text-emerald-300">
                <MessageCirclePlusIcon size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-xs font-semibold leading-tight">Start the first message</span>
                <span className="mt-1 block text-[10px] text-emerald-700/80 dark:text-emerald-200/80">
                  Break the silence
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onJoinGlobalLobby}
              className="group h-auto w-full items-start justify-start whitespace-normal rounded-xl border-sky-200 bg-sky-50 px-3 py-2.5 text-left text-sky-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-100 dark:hover:bg-sky-900/30"
            >
              <span className="mr-2 inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 motion-safe:animate-[pulse_3.2s_ease-in-out_infinite] dark:text-sky-300">
                <ArrowRightIcon size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-xs font-semibold leading-tight">Join Global Lobby</span>
                <span className="mt-1 block text-[10px] text-sky-700/80 dark:text-sky-200/80">Find active chats</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-2 mt-2">
        <div className="w-full rounded-xl border border-slate-300/70 bg-slate-50/90 p-3 shadow-sm backdrop-blur-md dark:border-slate-600/60 dark:bg-slate-800/70">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold tracking-[0.04em] text-slate-500 uppercase dark:text-slate-300">
            <ActivityIcon size={12} className="motion-safe:animate-[pulse_3.4s_ease-in-out_infinite]" />
            <span>Active Rooms</span>
          </div>
          {topActiveRooms.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {topActiveRooms.map((room) => (
                <button
                  key={room.origin}
                  type="button"
                  onClick={() => onJoinSuggestedRoom(room.hostname)}
                  className={cn(
                    'group min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-left text-xs text-emerald-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100 dark:hover:bg-emerald-900/30'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                      <ActivityIcon size={10} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{room.hostname}</span>
                    <Badge
                      variant="outline"
                      className="ml-2 inline-flex shrink-0 rounded-md border-emerald-300 bg-emerald-100 px-1.5 py-0 text-[9px] text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                    >
                      {room.activeUsers} online
                    </Badge>
                  </span>
                  <span className={cn('mt-1 block text-[10px] leading-tight', getSignalToneClass(room.signal.tone))}>
                    {room.signal.text}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2 text-[11px] text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/45 dark:text-slate-300">
              Active rooms will appear when other GhostChat users are connected.
            </div>
          )}
        </div>
      </div>

      <div className="mx-2 mt-2 mb-1">
        <div className="w-full rounded-xl border border-slate-300/70 bg-slate-50/90 p-3 shadow-sm backdrop-blur-md dark:border-slate-600/60 dark:bg-slate-800/70">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold tracking-[0.04em] text-slate-500 uppercase dark:text-slate-300">
            <CompassIcon size={12} className="motion-safe:animate-[pulse_3.4s_ease-in-out_infinite]" />
            <span>Suggested Rooms</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {topRooms.map((room) => {
              const snapshot = buildSuggestedRoomProjectSnapshot(room)

              return (
                <button
                  key={room.hostname}
                  type="button"
                  onClick={() => onJoinSuggestedRoom(room.hostname)}
                  className={cn(
                    'group min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-left text-xs text-amber-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100 dark:hover:bg-amber-900/30'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 motion-safe:animate-[pulse_3.6s_ease-in-out_infinite] dark:text-violet-300">
                      {room.category?.includes('defi') ? (
                        <LandmarkIcon size={10} />
                      ) : room.category?.includes('wallet') ? (
                        <WalletIcon size={10} />
                      ) : (
                        <SparklesIcon size={10} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{room.hostname}</span>
                    <Badge
                      variant="outline"
                      className="ml-2 inline-flex max-w-[45%] shrink-0 truncate rounded-md border-amber-300 bg-amber-100 px-1.5 py-0 text-[9px] capitalize text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
                    >
                      {room.category || 'web3'}
                    </Badge>
                  </span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-amber-800 dark:text-amber-100/90">
                    {snapshot.projectName}
                  </span>
                  <span className="mt-1 flex min-w-0 flex-wrap gap-1">
                    {snapshot.badges.map((badgeLabel) => (
                      <span
                        key={`${room.hostname}-${badgeLabel}`}
                        className="inline-flex max-w-full truncate rounded-md border border-amber-300/80 bg-amber-100/80 px-1.5 py-0.5 text-[9px] leading-none text-amber-900 dark:border-amber-800/70 dark:bg-amber-900/35 dark:text-amber-100"
                      >
                        {badgeLabel}
                      </span>
                    ))}
                  </span>
                  <span className="mt-1 block text-[9px] leading-tight text-amber-800/80 dark:text-amber-200/75">
                    {snapshot.sourceLabel}
                  </span>
                  <span className={cn('mt-1 block text-[10px] leading-tight', getSignalToneClass(room.signal.tone))}>
                    {room.signal.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

GhostTownCtaPanel.displayName = 'GhostTownCtaPanel'

export default GhostTownCtaPanel
