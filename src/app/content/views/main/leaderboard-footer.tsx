import type { FC } from 'react'

const LeaderboardFooter: FC = () => {
  return (
    <div className="mx-3 mb-3 flex items-center justify-between rounded-xl border border-white/45 bg-white/60 px-3 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/55 dark:text-slate-300">
      <span>Live ranking updates every few seconds</span>
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
        </span>
        LIVE
      </span>
    </div>
  )
}

LeaderboardFooter.displayName = 'LeaderboardFooter'

export default LeaderboardFooter
