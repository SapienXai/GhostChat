import type { FC, ReactNode } from 'react'
import { useState, type ReactElement } from 'react'

import { type MessageItemProps } from './message-item'
import { type PromptItemProps } from './prompt-item'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Virtuoso } from 'react-virtuoso'

export interface MessageListProps {
  children?: ReactNode
}
const MessageList: FC<MessageListProps> = ({ children }) => {
  const [scrollParentRef, setScrollParentRef] = useState<HTMLDivElement | null>(null)

  // Filter children to separate message items from other components
  const childrenArray = Array.isArray(children) ? children : [children]
  const messageItems = childrenArray.filter(
    (child: any) => child?.type?.displayName === 'MessageItem' || child?.type?.displayName === 'PromptItem'
  ) as Array<ReactElement<MessageItemProps | PromptItemProps>>
  const otherComponents = childrenArray.filter(
    (child: any) => child?.type?.displayName !== 'MessageItem' && child?.type?.displayName !== 'PromptItem'
  )

  return (
    <ScrollArea
      ref={setScrollParentRef}
      className="mx-3 my-2 h-full min-h-0 overflow-hidden rounded-2xl border border-white/40 bg-white/45 shadow-inner backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/45"
    >
      <Virtuoso
        defaultItemHeight={108}
        followOutput={(isAtBottom: boolean) => (isAtBottom ? 'smooth' : 'auto')}
        initialTopMostItemIndex={{ index: 'LAST', align: 'end' }}
        data={messageItems}
        customScrollParent={scrollParentRef!}
        itemContent={(_: any, item: ReactElement<MessageItemProps | PromptItemProps>) => item}
      />
      {otherComponents}
    </ScrollArea>
  )
}

MessageList.displayName = 'MessageList'

export default MessageList
