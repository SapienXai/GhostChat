import { useEffect, useRef, useCallback } from 'react'
import { useRemeshDomain, useRemeshSend } from 'remesh-react'
import ChatRoomDomain from '@/domain/ChatRoom'

const AWAY_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

const useAwayDetection = () => {
  const send = useRemeshSend()
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isAwayRef = useRef(false)

  const setAwayStatus = useCallback(
    (isAway: boolean) => {
      if (isAwayRef.current !== isAway) {
        isAwayRef.current = isAway
        send(chatRoomDomain.command.SendAwayMessageCommand(isAway))
      }
    },
    [send, chatRoomDomain]
  )

  const resetAwayTimer = useCallback(() => {
    // Clear existing timeout
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current)
    }

    // If user was away, mark them as back
    if (isAwayRef.current) {
      setAwayStatus(false)
    }

    // Set new timeout for away status
    awayTimeoutRef.current = setTimeout(() => {
      setAwayStatus(true)
    }, AWAY_TIMEOUT)
  }, [setAwayStatus])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, resetAwayTimer, true)
    })

    // Initialize timer
    resetAwayTimer()

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetAwayTimer, true)
      })

      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current)
      }
    }
  }, [resetAwayTimer])

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, user might be away
        if (awayTimeoutRef.current) {
          clearTimeout(awayTimeoutRef.current)
        }
        // Set away status immediately when page is hidden
        awayTimeoutRef.current = setTimeout(() => {
          setAwayStatus(true)
        }, 30000) // 30 seconds after page becomes hidden
      } else {
        // Page is visible again, reset timer
        resetAwayTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [resetAwayTimer, setAwayStatus])
}

export default useAwayDetection
