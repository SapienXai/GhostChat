import { useRemeshDomain, useRemeshQuery } from 'remesh-react'
import ChatRoomDomain from '@/domain/ChatRoom'
import { cn } from '@/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const TypingIndicator = () => {
  const chatRoomDomain = useRemeshDomain(ChatRoomDomain())
  const typingUsers = useRemeshQuery(chatRoomDomain.query.TypingUsersQuery())

  if (typingUsers.length === 0) {
    return null
  }

  const renderTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing...`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    } else {
      return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`
    }
  }

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/55 dark:text-slate-300">
      <div className="flex -space-x-1">
        {typingUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="size-5 border-2 border-white/85 dark:border-slate-900">
            <AvatarImage src={user.userAvatar} alt={user.username} />
            <AvatarFallback className="text-xs">{user.username.at(0)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="italic">{renderTypingText()}</span>
      <div className="flex space-x-1">
        <div className={cn('h-1 w-1 rounded-full bg-slate-400 animate-bounce', '[animation-delay:-0.3s]')} />
        <div className={cn('h-1 w-1 rounded-full bg-slate-400 animate-bounce', '[animation-delay:-0.15s]')} />
        <div className="h-1 w-1 rounded-full bg-slate-400 animate-bounce" />
      </div>
    </div>
  )
}

export default TypingIndicator
