import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { PromptMessage } from '@/domain/MessageList'
import { cn } from '@/utils'
import { AvatarImage } from '@radix-ui/react-avatar'
import type { FC } from 'react'

export interface PromptItemProps {
  data: PromptMessage
  className?: string
}

const PromptItem: FC<PromptItemProps> = ({ data, className }) => {
  const displayName = typeof data.username === 'string' && data.username.trim().length > 0 ? data.username : 'Unknown'
  return (
    <div className={cn('flex justify-center px-4 py-1.5', className)}>
      <Badge
        variant="secondary"
        className="gap-x-2 rounded-full border border-white/45 bg-white/70 px-2.5 py-1 font-medium text-slate-500 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/65 dark:text-slate-300"
      >
        <Avatar className="size-4">
          <AvatarImage src={data.userAvatar} className="size-full" alt="avatar" />
          <AvatarFallback>{displayName.at(0) ?? '?'}</AvatarFallback>
        </Avatar>
        {data.body}
      </Badge>
    </div>
  )
}

PromptItem.displayName = 'PromptItem'

export default PromptItem
