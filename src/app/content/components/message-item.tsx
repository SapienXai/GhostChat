import { type FC } from 'react'
import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
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
  isOwnMessage?: boolean
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
        'mx-2 mb-2 flex first:mt-2 last:mb-2',
        props.isOwnMessage ? 'justify-end' : 'justify-start',
        props.className
      )}
    >
      <div className={cn('flex max-w-[88%] items-end gap-x-2', props.isOwnMessage && 'flex-row-reverse')}>
        <Avatar className="mb-1 border border-white/40 shadow-sm dark:border-white/10">
          <AvatarImage src={props.data.userAvatar} className="size-full" alt="avatar" />
          <AvatarFallback>{props.data.username.at(0)}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'box-border overflow-hidden rounded-2xl px-3 py-2 shadow-sm backdrop-blur-md',
            props.isOwnMessage
              ? 'rounded-br-md border border-slate-300/70 bg-slate-100/95 text-slate-900 dark:border-slate-500/40 dark:bg-slate-700/65 dark:text-slate-50'
              : 'rounded-bl-md border border-white/40 bg-white/70 text-slate-800 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-50'
          )}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 leading-none">
            <div
              className={cn(
                'truncate text-sm font-semibold',
                props.isOwnMessage ? 'text-slate-700 dark:text-slate-100' : 'text-slate-700 dark:text-slate-50'
              )}
            >
              {props.isOwnMessage ? 'You' : props.data.username}
            </div>
            <FormatDate
              className={cn(
                'text-xs',
                props.isOwnMessage ? 'text-slate-500 dark:text-slate-300' : 'text-slate-500 dark:text-slate-300'
              )}
              date={props.data.sendTime}
            ></FormatDate>
          </div>
          <div className="pb-2 pt-1">
            <Markdown>{content}</Markdown>
          </div>
          <div
            className={cn(
              'grid grid-flow-col gap-x-2 leading-none',
              props.isOwnMessage ? 'justify-end' : 'justify-start'
            )}
          >
            <LikeButton
              checked={props.like}
              onChange={(checked) => handleLikeChange(checked)}
              count={props.data.likeUsers.length}
            >
              <LikeButton.Icon>
                <ThumbsUpIcon size={14}></ThumbsUpIcon>
              </LikeButton.Icon>
            </LikeButton>
            <LikeButton
              checked={props.hate}
              onChange={(checked) => handleHateChange(checked)}
              count={props.data.hateUsers.length}
            >
              <LikeButton.Icon>
                <ThumbsDownIcon size={14}></ThumbsDownIcon>
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
