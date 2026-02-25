import type { FC, ReactNode, UIEvent } from 'react'
import { Children, useLayoutEffect, useMemo, useRef, useState } from 'react'

export interface MessageListProps {
  children?: ReactNode
}
const MessageList: FC<MessageListProps> = ({ children }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [followBottom, setFollowBottom] = useState(true)
  const renderedChildren = useMemo(() => Children.toArray(children), [children])
  const itemCount = renderedChildren.length

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) <= 96
    setFollowBottom(nearBottom)
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !followBottom) return
    el.scrollTop = el.scrollHeight
  }, [itemCount, followBottom])

  return (
    <div className="mx-3 my-2 h-full min-h-0 overflow-hidden rounded-2xl border border-white/40 bg-white/45 shadow-inner backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/45">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-none pb-3">
        {renderedChildren}
      </div>
    </div>
  )
}

MessageList.displayName = 'MessageList'

export default MessageList
