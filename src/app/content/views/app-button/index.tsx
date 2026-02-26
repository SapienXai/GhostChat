import { type FC, useRef, useState, type MouseEvent, useEffect } from 'react'
import { SettingsIcon, MoonIcon, SunIcon, HandIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useRemeshDomain, useRemeshQuery, useRemeshSend } from 'remesh-react'
import { Button } from '@/components/ui/button'
import { EVENT } from '@/constants/event'
import UserInfoDomain from '@/domain/UserInfo'
import useTriggerAway from '@/hooks/useTriggerAway'
import { checkDarkMode, cn } from '@/utils'
import AppStatusDomain from '@/domain/AppStatus'
import { messenger } from '@/messenger'
import useDraggable from '@/hooks/useDraggable'
import useWindowResize from '@/hooks/useWindowResize'
import FloatingIconVideoAsset from '@/assets/videos/ghostchat_transparent.webm'

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
  const audioContextRef = useRef<AudioContext | null>(null)
  const canPlaySoundRef = useRef(false)
  const prevHasUnreadRef = useRef(hasUnreadQuery)
  const lastPingAtRef = useRef(0)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const draggedRef = useRef(false)
  const resolveRuntimeVideoUrl = () => {
    const browserRuntime = (globalThis as any).browser?.runtime
    const browserRuntimeUrl = browserRuntime?.getURL?.('ghostchat_transparent.webm')
    if (browserRuntimeUrl) return browserRuntimeUrl as string

    const chromeRuntime = (globalThis as any).chrome?.runtime
    const chromeRuntimeUrl = chromeRuntime?.getURL?.('ghostchat_transparent.webm')
    if (chromeRuntimeUrl) return chromeRuntimeUrl as string

    return ''
  }
  const [floatingVideoUrl, setFloatingVideoUrl] = useState(resolveRuntimeVideoUrl() || FloatingIconVideoAsset)

  const {
    x,
    y,
    startDrag,
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

  const playMessagePing = () => {
    const now = Date.now()
    if (now - lastPingAtRef.current < 350) return
    lastPingAtRef.current = now

    const AudioContextCtor = globalThis.AudioContext || (globalThis as any).webkitAudioContext
    if (!AudioContextCtor) return

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor()
    }

    const ctx = audioContextRef.current
    if (!ctx) return
    if (ctx.state === 'suspended' && !canPlaySoundRef.current) return

    const start = ctx.currentTime + 0.01
    const gain = ctx.createGain()
    const osc = ctx.createOscillator()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(820, start)
    osc.frequency.exponentialRampToValueAtTime(1240, start + 0.08)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.16)
  }

  useEffect(() => {
    const hadUnread = prevHasUnreadRef.current
    const hasNewUnread = !hadUnread && hasUnreadQuery
    prevHasUnreadRef.current = hasUnreadQuery
    if (!hasNewUnread) return
    playMessagePing()
  }, [hasUnreadQuery])

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

  const handleIconMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    canPlaySoundRef.current = true
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }
    startDrag(e.clientX, e.clientY)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    draggedRef.current = false
  }

  const handleIconMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if ((e.buttons & 1) !== 1 || !dragStartRef.current) return
    const deltaX = Math.abs(e.clientX - dragStartRef.current.x)
    const deltaY = Math.abs(e.clientY - dragStartRef.current.y)
    if (deltaX > 4 || deltaY > 4) {
      draggedRef.current = true
    }
  }

  const handleIconClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (draggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      draggedRef.current = false
      return
    }
    handleToggleApp()
  }

  const handleHandMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    startDrag(e.clientX, e.clientY)
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
              className="relative size-12 overflow-hidden rounded-full p-0 shadow dark:border-slate-600"
            >
              <div
                className={cn(
                  'absolute grid grid-rows-[repeat(2,minmax(0,3rem))] w-full justify-center items-center transition-all duration-300 hover:bg-accent dark:hover:bg-accent',
                  isDarkMode ? 'top-0' : '-top-12',
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
              className="size-12 rounded-full p-0 dark:bg-background shadow dark:text-foreground dark:border-slate-600 dark:hover:bg-accent"
            >
              <SettingsIcon className="size-5" />
            </Button>
            <Button
              onMouseDown={handleHandMouseDown}
              variant="outline"
              className="size-12 cursor-grab dark:bg-background rounded-full p-0 dark:text-foreground shadow dark:border-slate-600 dark:hover:bg-accent"
            >
              <HandIcon className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        ref={appButtonRef}
        onMouseDown={handleIconMouseDown}
        onMouseMove={handleIconMouseMove}
        onClick={handleIconClick}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={handleToggleMenu}
        className="relative z-20 size-14 rounded-full p-0 text-xs shadow-lg shadow-slate-500/50 overflow-visible after:absolute after:-inset-[1px] after:z-10 after:animate-[shimmer_2s_linear_infinite] after:rounded-full after:bg-[conic-gradient(from_var(--shimmer-angle),#ff0040_0%,#ff7a00_12.5%,#ffe600_25%,#28ff7a_37.5%,#00d4ff_50%,#2f6bff_62.5%,#9b4dff_75%,#ff2fd6_87.5%,#ff0040_100%)]"
      >
        <AnimatePresence>
          {hasUnreadQuery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute -right-2 -top-2 z-30 flex size-7 items-center justify-center"
            >
              <span
                className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-80', 'bg-lime-300')}
              ></span>
              <motion.span
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'relative inline-flex size-4 rounded-full',
                  'bg-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.95)]'
                )}
              ></motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-15 h-full w-full rounded-full p-0.5">
          <video
            src={floatingVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            draggable={false}
            onError={() => {
              if (floatingVideoUrl !== FloatingIconVideoAsset) {
                setFloatingVideoUrl(FloatingIconVideoAsset)
              }
            }}
            className="h-full w-full rounded-full object-cover pointer-events-none select-none"
          />
        </div>
      </Button>
    </div>
  )
}

AppButton.displayName = 'AppButton'

export default AppButton
