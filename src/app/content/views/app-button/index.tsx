import { type FC, useState, type MouseEvent, useEffect } from 'react'
import { SettingsIcon, MoonIcon, SunIcon, HandIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useRemeshDomain, useRemeshQuery, useRemeshSend } from 'remesh-react'
import { Button } from '@/components/ui/button'
import { EVENT } from '@/constants/event'
import UserInfoDomain from '@/domain/UserInfo'
import useTriggerAway from '@/hooks/useTriggerAway'
import { checkDarkMode, cn } from '@/utils'
import LogoW from '@/assets/images/logoW.png'
import LogoB from '@/assets/images/logoB.png'
import AppStatusDomain from '@/domain/AppStatus'
import { messenger } from '@/messenger'
import useDraggable from '@/hooks/useDraggable'
import useWindowResize from '@/hooks/useWindowResize'

export interface AppButtonProps {
  className?: string
}

const AppButton: FC<AppButtonProps> = ({ className }) => {
  const send = useRemeshSend()
  const appStatusDomain = useRemeshDomain(AppStatusDomain())
  const appOpenStatus = useRemeshQuery(appStatusDomain.query.OpenQuery())
  const hasUnreadQuery = useRemeshQuery(appStatusDomain.query.HasUnreadQuery())
  const userInfoDomain = useRemeshDomain(UserInfoDomain())
  const userInfo = useRemeshQuery(userInfoDomain.query.UserInfoQuery())
  const appPosition = useRemeshQuery(appStatusDomain.query.PositionQuery())

  const isDarkMode = userInfo?.themeMode === 'dark' ? true : userInfo?.themeMode === 'light' ? false : checkDarkMode()

  const [menuOpen, setMenuOpen] = useState(false)

  const {
    x,
    y,
    setRef: appButtonRef
  } = useDraggable({
    initX: appPosition.x,
    initY: appPosition.y,
    minX: 50,
    maxX: window.innerWidth - 50,
    maxY: window.innerHeight - 22,
    minY: 750
  })

  useWindowResize(({ width, height }) => {
    send(appStatusDomain.command.UpdatePositionCommand({ x: width - 50, y: height - 22 }))
  })

  useEffect(() => {
    send(appStatusDomain.command.UpdatePositionCommand({ x, y }))
  }, [x, y])

  const { setRef: appMenuRef } = useTriggerAway(['click'], () => setMenuOpen(false))

  const handleToggleMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setMenuOpen(!menuOpen)
  }

  const handleSwitchTheme = () => {
    if (userInfo) {
      send(userInfoDomain.command.UpdateUserInfoCommand({ ...userInfo, themeMode: isDarkMode ? 'light' : 'dark' }))
    } else {
      handleOpenOptionsPage()
    }
  }

  const handleOpenOptionsPage = () => {
    messenger.sendMessage(EVENT.OPTIONS_PAGE_OPEN, undefined)
  }

  const handleToggleApp = () => {
    send(appStatusDomain.command.UpdateOpenCommand(!appOpenStatus))
  }

  return (
    <div
      ref={appMenuRef}
      className={cn('fixed bottom-5 right-5 z-infinity grid w-min select-none justify-center gap-y-3', className)}
      style={{
        left: `calc(${appPosition.x}px)`,
        bottom: `calc(100vh - ${appPosition.y}px)`,
        transform: 'translateX(-50%)'
      }}
    >
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="z-10 grid gap-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.1 }}
          >
            <Button
              onClick={handleSwitchTheme}
              variant="outline"
              className="relative size-10 overflow-hidden rounded-full p-0 shadow dark:border-slate-600"
            >
              <div
                className={cn(
                  'absolute grid grid-rows-[repeat(2,minmax(0,2.5rem))] w-full justify-center items-center transition-all duration-300 hover:bg-accent dark:hover:bg-accent',
                  isDarkMode ? 'top-0' : '-top-10',
                  isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-orange-400'
                )}
              >
                <MoonIcon className="size-5" />
                <SunIcon className="size-5" />
              </div>
            </Button>

            <Button
              onClick={handleOpenOptionsPage}
              variant="outline"
              className="size-10 rounded-full p-0 dark:bg-background shadow dark:text-foreground dark:border-slate-600 dark:hover:bg-accent"
            >
              <SettingsIcon className="size-5" />
            </Button>
            <Button
              ref={appButtonRef}
              variant="outline"
              className="size-10 cursor-grab dark:bg-background rounded-full p-0 dark:text-foreground shadow dark:border-slate-600 dark:hover:bg-accent"
            >
              <HandIcon className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        onClick={handleToggleApp}
        onContextMenu={handleToggleMenu}
        className="relative z-20 size-11 rounded-full p-0 text-xs shadow-lg shadow-slate-500/50 overflow-hidden after:absolute after:-inset-0.5 after:z-10 after:animate-[shimmer_2s_linear_infinite] after:rounded-full after:bg-[conic-gradient(from_var(--shimmer-angle),theme(colors.slate.500)_0%,theme(colors.white)_10%,theme(colors.slate.500)_20%)]"
      >
        <AnimatePresence>
          {hasUnreadQuery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute -right-1 -top-1 z-30 flex size-5 items-center justify-center"
            >
              <span
                className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-75', 'bg-orange-400')}
              ></span>
              <span className={cn('relative inline-flex size-3 rounded-full', 'bg-orange-500')}></span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-15 h-full w-full rounded-full p-0.5">
          <img src={isDarkMode ? LogoB : LogoW} className="h-full w-full rounded-full object-cover" />
        </div>
      </Button>
    </div>
  )
}

AppButton.displayName = 'AppButton'

export default AppButton
