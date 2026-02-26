import { type FC } from 'react'
import { CornerUpLeftIcon, ExternalLinkIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
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
  showSourceInfo?: boolean
  onLikeChange?: (checked: boolean) => void
  onHateChange?: (checked: boolean) => void
  onReply?: (message: NormalMessage) => void
  onReplyNavigate?: (messageId: string) => void
  className?: string
}

const MessageItem: FC<MessageItemProps> = (props) => {
  const displayName =
    typeof props.data.username === 'string' && props.data.username.trim().length > 0 ? props.data.username : 'Unknown'
  const avatarFallback = displayName.at(0) ?? '?'
  const handleLikeChange = (checked: boolean) => {
    props.onLikeChange?.(checked)
  }
  const handleHateChange = (checked: boolean) => {
    props.onHateChange?.(checked)
  }
  const canReact = Boolean(props.onLikeChange && props.onHateChange)
  const canReply = Boolean(props.onReply)

  let content = typeof props.data.body === 'string' ? props.data.body : ''
  const sourceHostname =
    typeof props.data.fromInfo?.hostname === 'string' && props.data.fromInfo.hostname.length > 0
      ? props.data.fromInfo.hostname
      : typeof props.data.fromInfo?.href === 'string' && props.data.fromInfo.href.length > 0
        ? (() => {
            try {
              return new URL(props.data.fromInfo!.href).hostname
            } catch {
              return undefined
            }
          })()
        : undefined
  const sourceHref =
    typeof props.data.fromInfo?.href === 'string' && props.data.fromInfo.href.length > 0
      ? props.data.fromInfo.href
      : undefined
  const showSourceInfo = Boolean(props.showSourceInfo && sourceHostname && sourceHref)
  const replyBody =
    typeof props.data.reply?.body === 'string' ? props.data.reply.body.replace(/\s+/g, ' ').trim() : undefined
  const hasReply = Boolean(props.data.reply?.id && replyBody)

  // Check if the field exists, compatible with old data
  if (Array.isArray(props.data.atUsers)) {
    const atUserPositions = props.data.atUsers.flatMap((user) =>
      (Array.isArray(user.positions) ? user.positions : []).map((position) => ({
        username: user.username,
        userId: user.userId,
        position
      }))
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
      id={`gc-msg-${props.data.id}`}
      data-index={props.index}
      data-message-id={props.data.id}
      className={cn(
        'mx-2 mb-2 flex first:mt-2 last:mb-2',
        props.isOwnMessage ? 'justify-end' : 'justify-start',
        props.className
      )}
    >
      <div className={cn('flex max-w-[88%] items-end gap-x-2', props.isOwnMessage && 'flex-row-reverse')}>
        <Avatar className="mb-1 border border-white/40 shadow-sm dark:border-white/10">
          <AvatarImage src={props.data.userAvatar} className="size-full" alt="avatar" />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
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
              {props.isOwnMessage ? 'You' : displayName}
            </div>
            <FormatDate
              className={cn(
                'text-[10px] leading-none',
                props.isOwnMessage ? 'text-slate-500 dark:text-slate-300' : 'text-slate-500 dark:text-slate-300'
              )}
              date={props.data.sendTime}
            ></FormatDate>
          </div>
          {showSourceInfo && (
            <div className="mt-0.5 flex items-center gap-x-1 text-[11px] text-slate-500 dark:text-slate-300">
              <span>from</span>
              <a
                href={sourceHref}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-x-1 hover:underline"
              >
                <span className="truncate">{sourceHostname}</span>
                <ExternalLinkIcon size={10} />
              </a>
            </div>
          )}
          {hasReply && (
            <button
              type="button"
              onClick={() => props.data.reply?.id && props.onReplyNavigate?.(props.data.reply.id)}
              className={cn(
                'mt-1 w-full rounded-md border-l-2 px-2 py-1 text-left text-xs',
                props.isOwnMessage
                  ? 'border-slate-400/80 bg-slate-200/70 dark:border-slate-300/50 dark:bg-slate-600/40'
                  : 'border-slate-300/90 bg-white/75 dark:border-slate-500/50 dark:bg-slate-700/40',
                props.onReplyNavigate
                  ? 'cursor-pointer transition-colors hover:bg-white/90 dark:hover:bg-slate-700/65'
                  : 'cursor-default'
              )}
            >
              <div className="truncate font-semibold text-slate-700 dark:text-slate-100">
                {typeof props.data.reply?.username === 'string' && props.data.reply.username.trim().length > 0
                  ? props.data.reply.username
                  : 'Unknown'}
              </div>
              <div className="truncate text-slate-600 dark:text-slate-300">{replyBody}</div>
            </button>
          )}
          <div className="pb-2 pt-1">
            <Markdown>{content}</Markdown>
          </div>
          {(canReact || canReply) && (
            <div
              className={cn(
                'flex items-center gap-x-2 leading-none',
                props.isOwnMessage ? 'justify-end' : 'justify-start'
              )}
            >
              {canReply && (
                <button
                  type="button"
                  onClick={() => props.onReply?.(props.data)}
                  className="inline-flex items-center gap-x-1 rounded-md px-1.5 py-1 text-xs text-slate-600 transition-colors hover:bg-black/5 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100"
                >
                  <CornerUpLeftIcon size={12} />
                  <span>Reply</span>
                </button>
              )}
              {canReact && (
                <>
                  <LikeButton
                    checked={props.like}
                    onChange={(checked) => handleLikeChange(checked)}
                    count={Array.isArray(props.data.likeUsers) ? props.data.likeUsers.length : 0}
                  >
                    <LikeButton.Icon>
                      <ThumbsUpIcon size={14}></ThumbsUpIcon>
                    </LikeButton.Icon>
                  </LikeButton>
                  <LikeButton
                    checked={props.hate}
                    onChange={(checked) => handleHateChange(checked)}
                    count={Array.isArray(props.data.hateUsers) ? props.data.hateUsers.length : 0}
                  >
                    <LikeButton.Icon>
                      <ThumbsDownIcon size={14}></ThumbsDownIcon>
                    </LikeButton.Icon>
                  </LikeButton>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

MessageItem.displayName = 'MessageItem'

export default MessageItem
