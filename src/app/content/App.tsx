import '@webcomponents/custom-elements'
import Header from '@/app/content/views/header'
import Footer from '@/app/content/views/footer'
import Main from '@/app/content/views/main'
import AppButton from '@/app/content/views/app-button'
import AppMain from '@/app/content/views/app-main'
import { useRemeshDomain, useRemeshQuery, useRemeshSend } from 'remesh-react'
import ChatRoomDomain from '@/domain/ChatRoom'
import UserInfoDomain from '@/domain/UserInfo'
import Setup from '@/app/content/views/setup'
import MessageListDomain from '@/domain/MessageList'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'

import DanmakuContainer from './components/danmaku-container'
import DanmakuDomain from '@/domain/Danmaku'
import AppStatusDomain from '@/domain/AppStatus'
import { checkDarkMode, cn } from '@/utils'
import VirtualRoomDomain from '@/domain/VirtualRoom'
import useAwayDetection from '@/hooks/useAwayDetection'
import type { MainTab } from '@/app/content/views/main'
import ErrorBoundary from '@/components/error-boundary'

/**
 * Fix requestAnimationFrame error in jest
 * @see https://github.com/facebook/react/issues/16606
 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=1469304
 */
if (import.meta.env.FIREFOX) {
  window.requestAnimationFrame = window.requestAnimationFrame.bind(window)
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('chat')
  const send = useRemeshSend()
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const virtualRoomDomain = useRemeshDomain(VirtualRoomDomain())
  const userInfoDomain = useRemeshDomain(UserInfoDomain())
  const messageListDomain = useRemeshDomain(MessageListDomain())
  const danmakuDomain = useRemeshDomain(DanmakuDomain())
  const danmakuIsEnabled = useRemeshQuery(danmakuDomain.query.IsEnabledQuery())
  const userInfoSetFinished = useRemeshQuery(userInfoDomain.query.UserInfoSetIsFinishedQuery())
  const messageListLoadFinished = useRemeshQuery(messageListDomain.query.LoadIsFinishedQuery())
  const userInfoLoadFinished = useRemeshQuery(userInfoDomain.query.UserInfoLoadIsFinishedQuery())
  const appStatusDomain = useRemeshDomain(AppStatusDomain())
  const appStatusLoadIsFinished = useRemeshQuery(appStatusDomain.query.StatusLoadIsFinishedQuery())
  const chatRoomJoinIsFinished = useRemeshQuery(chatRoomDomain.query.JoinIsFinishedQuery())
  const virtualRoomJoinIsFinished = useRemeshQuery(virtualRoomDomain.query.JoinIsFinishedQuery())

  const userInfo = useRemeshQuery(userInfoDomain.query.UserInfoQuery())
  const notUserInfo = userInfoLoadFinished && !userInfoSetFinished
  const leaderboardEnabled = userInfoSetFinished && chatRoomJoinIsFinished && virtualRoomJoinIsFinished
  const joinRequestedRef = useRef({ chat: false, virtual: false })

  const joinRoom = useCallback(() => {
    if (!joinRequestedRef.current.chat) {
      send(chatRoomDomain.command.JoinRoomCommand())
      joinRequestedRef.current.chat = true
    }

    if (!joinRequestedRef.current.virtual) {
      send(virtualRoomDomain.command.JoinRoomCommand())
      joinRequestedRef.current.virtual = true
    }
  }, [chatRoomDomain, send, virtualRoomDomain])

  const leaveRoom = useCallback(() => {
    if (joinRequestedRef.current.chat) {
      send(chatRoomDomain.command.LeaveRoomCommand())
      joinRequestedRef.current.chat = false
    }

    if (joinRequestedRef.current.virtual) {
      send(virtualRoomDomain.command.LeaveRoomCommand())
      joinRequestedRef.current.virtual = false
    }
  }, [chatRoomDomain, send, virtualRoomDomain])

  useEffect(() => {
    if (messageListLoadFinished) {
      if (userInfoSetFinished) {
        joinRoom()
      } else {
        // Clear simulated data when refreshing on the setup page
        send(messageListDomain.command.ClearListCommand())
        joinRequestedRef.current.chat = false
        joinRequestedRef.current.virtual = false
      }
    }
    return () => leaveRoom()
  }, [joinRoom, leaveRoom, messageListLoadFinished, send, userInfoSetFinished, messageListDomain])

  useEffect(() => {
    danmakuIsEnabled && send(danmakuDomain.command.MountCommand(danmakuContainerRef.current!))
    return () => {
      danmakuIsEnabled && send(danmakuDomain.command.UnmountCommand())
    }
  }, [danmakuIsEnabled])

  useEffect(() => {
    window.addEventListener('beforeunload', leaveRoom)
    return () => {
      window.removeEventListener('beforeunload', leaveRoom)
    }
  }, [leaveRoom])

  const themeMode =
    userInfo?.themeMode === 'system' ? (checkDarkMode() ? 'dark' : 'light') : (userInfo?.themeMode ?? 'light')

  const danmakuContainerRef = useRef<HTMLDivElement>(null)

  // Enable away detection when user is in a chat room
  useAwayDetection()

  return (
    <div id="app" className={cn('contents', themeMode)}>
      {appStatusLoadIsFinished && (
        <>
          <AppMain>
            <Header />
            <Main activeTab={activeTab} onTabChange={setActiveTab} leaderboardEnabled={leaderboardEnabled} />
            {activeTab === 'chat' && <Footer />}
            {notUserInfo && <Setup></Setup>}
            <Toaster
              richColors
              theme={themeMode}
              offset="70px"
              visibleToasts={1}
              toastOptions={{
                classNames: {
                  toast: 'dark:bg-slate-950 border dark:border-slate-600'
                }
              }}
              position="top-center"
            ></Toaster>
          </AppMain>
          <ErrorBoundary fallback={null}>
            <AppButton></AppButton>
          </ErrorBoundary>
        </>
      )}
      <DanmakuContainer ref={danmakuContainerRef} />
    </div>
  )
}
