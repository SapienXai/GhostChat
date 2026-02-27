import type { FC } from 'react'
import { ArrowRightIcon, MessageCirclePlusIcon, SparklesIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils'
import type { SeedDomain } from './suggested-rooms'

interface GhostTownCtaPanelProps {
  messageCount: number
  humansCount: number
  suggestedRooms: SeedDomain[]
  onStartFirstMessage: () => void
  onJoinGlobalLobby: () => void
  onJoinSuggestedRoom: (hostname: string) => void
}

const GhostTownCtaPanel: FC<GhostTownCtaPanelProps> = ({
  messageCount,
  humansCount,
  suggestedRooms,
  onStartFirstMessage,
  onJoinGlobalLobby,
  onJoinSuggestedRoom
}) => {
  return (
    <section className="mx-3 mt-2 rounded-xl border border-white/45 bg-white/70 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-100">
        <SparklesIcon size={14} />
        <span>{messageCount === 0 ? 'This room is empty.' : 'Human presence is low.'}</span>
      </div>

      <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-300">
        Messages: {messageCount} • Humans: {humansCount}
      </p>

      <div className="grid gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onStartFirstMessage}
          className="justify-start rounded-lg border-white/45 bg-white/80 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-800/75 dark:text-slate-100 dark:hover:bg-slate-700/80"
        >
          <MessageCirclePlusIcon size={14} />
          <span>Start the first message</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onJoinGlobalLobby}
          className="justify-start rounded-lg border-white/45 bg-white/80 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-800/75 dark:text-slate-100 dark:hover:bg-slate-700/80"
        >
          <ArrowRightIcon size={14} />
          <span>Join Global Lobby</span>
        </Button>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">Suggested Rooms</div>
        <div className="grid gap-1.5">
          {suggestedRooms.map((room) => (
            <button
              key={room.hostname}
              type="button"
              onClick={() => onJoinSuggestedRoom(room.hostname)}
              className={cn(
                'flex items-center justify-between rounded-lg border border-white/45 bg-white/70 px-2.5 py-2 text-left text-xs shadow-sm transition-colors hover:bg-white/90 dark:border-white/10 dark:bg-slate-800/70 dark:hover:bg-slate-700/80'
              )}
            >
              <span className="font-medium text-slate-700 dark:text-slate-100">{room.hostname}</span>
              {room.category ? (
                <Badge variant="outline" className="rounded-full border-white/50 bg-white/65 text-[10px] capitalize">
                  {room.category}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

GhostTownCtaPanel.displayName = 'GhostTownCtaPanel'

export default GhostTownCtaPanel
