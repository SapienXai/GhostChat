import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { TextMessage } from '@/domain/ChatRoom'
import { cn } from '@/utils'
import { AvatarImage } from '@radix-ui/react-avatar'
import type { FC, MouseEvent } from 'react'

export interface PromptItemProps {
  data: TextMessage
  className?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  onMouseEnter?: (e: MouseEvent<HTMLButtonElement>) => void
  onMouseLeave?: (e: MouseEvent<HTMLButtonElement>) => void
}

const DanmakuMessage: FC<PromptItemProps> = ({ data, className, onClick, onMouseEnter, onMouseLeave }) => {
  const displayName = typeof data.username === 'string' && data.username.trim().length > 0 ? data.username : 'Unknown'
  const avatarFallback = displayName.at(0) ?? '?'
  const displayBody = typeof data.body === 'string' ? data.body : ''

  return (
    <Button
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={cn(
        'flex justify-center pointer-events-auto visible gap-x-2 border border-slate-50 px-2.5 py-0.5  rounded-full bg-primary/30 text-base font-medium text-white backdrop-blur-md',
        className
      )}
    >
      <Avatar className="size-5">
        <AvatarImage src={data.userAvatar} className="size-full" alt="avatar" />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="max-w-44 truncate">{displayBody}</div>
    </Button>
  )
}

DanmakuMessage.displayName = 'DanmakuMessage'

export default DanmakuMessage
