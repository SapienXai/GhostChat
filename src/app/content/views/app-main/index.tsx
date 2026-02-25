import { type ReactNode, type FC, useState } from 'react'
import useResizable from '@/hooks/useResizable'
import { motion, AnimatePresence } from 'framer-motion'
import AppStatusDomain from '@/domain/AppStatus'
import { useRemeshDomain, useRemeshQuery } from 'remesh-react'
import { cn } from '@/utils'
import useWindowResize from '@/hooks/useWindowResize'

export interface AppMainProps {
  children?: ReactNode
  className?: string
}

const AppMain: FC<AppMainProps> = ({ children, className }) => {
  const appStatusDomain = useRemeshDomain(AppStatusDomain())
  const appOpenStatus = useRemeshQuery(appStatusDomain.query.OpenQuery())
  const { x, y } = useRemeshQuery(appStatusDomain.query.PositionQuery())

  const { width } = useWindowResize()

  const isOnRightSide = x >= width / 2 + 50

  const { size, setRef } = useResizable({
    initSize: Math.max(375, width / 6),
    maxSize: Math.max(Math.min(750, width / 3), 375),
    minSize: Math.max(375, width / 6),
    direction: isOnRightSide ? 'left' : 'right'
  })

  const [isAnimationComplete, setAnimationComplete] = useState(false)

  return (
    <AnimatePresence>
      {appOpenStatus && (
        <motion.div
          initial={{ opacity: 0, y: 10, x: isOnRightSide ? '-100%' : '0' }}
          animate={{ opacity: 1, y: 0, x: isOnRightSide ? '-100%' : '0' }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          onAnimationEnd={() => setAnimationComplete(true)}
          onAnimationStart={() => setAnimationComplete(false)}
          style={{
            width: `${size}px`,
            left: `${x}px`,
            bottom: `calc(100vh - ${y}px + 22px)`
          }}
          className={cn(
            `fixed inset-y-10 right-10 z-infinity mb-0 mt-auto box-border grid max-h-[min(calc(100vh_-60px),_1000px)] min-h-[375px] grid-flow-col grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-slate-200/90 bg-[#dbe3ea] font-sans shadow-[0_24px_90px_-38px_rgba(15,23,42,0.9)] dark:border-slate-600/90 dark:bg-gradient-to-br dark:from-[#0d1422] dark:via-[#111a2a] dark:to-[#172235]`,
            className,
            { 'transition-transform': isAnimationComplete }
          )}
        >
          {children}
          <div
            ref={setRef}
            className={cn(
              'absolute inset-y-3 z-infinity w-1 cursor-ew-resize rounded-xl bg-slate-300/65 opacity-0 shadow transition-opacity duration-200 ease-in hover:opacity-100 dark:bg-slate-600/85',
              isOnRightSide ? '-left-0.5' : '-right-0.5'
            )}
          ></div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

AppMain.displayName = 'AppMain'

export default AppMain
