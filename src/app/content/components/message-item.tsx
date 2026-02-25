import { type FC } from 'react'
import { FrownIcon, HeartIcon } from 'lucide-react'
import LikeButton from './like-button'
import FormatDate from './format-date'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

import { Markdown } from '@/components/markdown'
import { type NormalMessage } from '@/domain/MessageList'
import { cn } from '@/utils'

export interface MessageItemProps {
  data: NormalMessage
  index?: number
  like: boolean
  hate: boolean
  onLikeChange?: (checked: boolean) => void
  onHateChange?: (checked: boolean) => void
  className?: string
}

const MessageItem: FC<MessageItemProps> = (props) => {
  const handleLikeChange = (checked: boolean) => {
    props.onLikeChange?.(checked)
  }
  const handleHateChange = (checked: boolean) => {
    props.onHateChange?.(checked)
  }

  let content = props.data.body

  // Check if the field exists, compatible with old data
  if (props.data.atUsers) {
    const atUserPositions = props.data.atUsers.flatMap((user) =>
      user.positions.map((position) => ({ username: user.username, userId: user.userId, position }))
    )

    // Replace from back to front according to position to avoid affecting previous indices
    atUserPositions
      .sort((a, b) => b.position[0] - a.position[0])
      .forEach(({ position, username }) => {
        const [start, end] = position
        content = `${content.slice(0, start)} **@${username}** ${content.slice(end + 1)}`
      })
  }

  return (
    <div
      data-index={props.index}
      className={cn(
        'mx-2 mb-2 box-border grid grid-cols-[auto_1fr] gap-x-2 rounded-xl border border-white/40 bg-white/65 px-3 py-2 shadow-sm backdrop-blur-md first:mt-2 last:mb-2 dark:border-white/10 dark:bg-slate-800/55 dark:text-slate-50',
        props.className
      )}
    >
      <Avatar className="mt-0.5 border border-white/40 shadow-sm dark:border-white/10">
        <AvatarImage src={props.data.userAvatar} className="size-full" alt="avatar" />
        <AvatarFallback>{props.data.username.at(0)}</AvatarFallback>
      </Avatar>
      <div className="overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 leading-none">
          <div className="truncate text-sm font-semibold text-slate-700 dark:text-slate-50">{props.data.username}</div>
          <FormatDate className="text-xs text-slate-500 dark:text-slate-300" date={props.data.sendTime}></FormatDate>
        </div>
        <div>
          <div className="pb-2 pt-1">
            <Markdown>{content}</Markdown>
          </div>
          <div className="grid grid-flow-col justify-end gap-x-2 leading-none">
            <LikeButton
              checked={props.like}
              onChange={(checked) => handleLikeChange(checked)}
              count={props.data.likeUsers.length}
            >
              <LikeButton.Icon>
                <HeartIcon size={14}></HeartIcon>
              </LikeButton.Icon>
            </LikeButton>
            <LikeButton
              checked={props.hate}
              onChange={(checked) => handleHateChange(checked)}
              count={props.data.hateUsers.length}
            >
              <LikeButton.Icon>
                <FrownIcon size={14}></FrownIcon>
              </LikeButton.Icon>
            </LikeButton>
          </div>
        </div>
      </div>
    </div>
  )
}

MessageItem.displayName = 'MessageItem'

export default MessageItem
