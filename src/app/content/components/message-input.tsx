import type { CompositionEvent, ClipboardEvent, Ref } from 'react'
import { type ChangeEvent, type KeyboardEvent } from 'react'

import { cn } from '@/utils'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import LoadingIcon from '@/assets/images/loading.svg'

export interface MessageInputProps {
  value?: string
  className?: string
  maxLength?: number
  preview?: boolean
  autoFocus?: boolean
  disabled?: boolean
  loading?: boolean
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onCompositionStart?: (e: CompositionEvent<HTMLTextAreaElement>) => void
  onCompositionEnd?: (e: CompositionEvent<HTMLTextAreaElement>) => void
}

/**
 *  Need @ syntax highlighting? Waiting for textarea to support Highlight API
 *
 * @see https://github.com/w3c/csswg-drafts/issues/4603
 */
const MessageInput = ({
  ref,
  value = '',
  className,
  maxLength = 500,
  onChange,
  onPaste,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  autoFocus,
  disabled,
  loading
}: MessageInputProps & { ref?: Ref<HTMLTextAreaElement | null> }) => {
  return (
    <div className={cn('relative', className)}>
      <ScrollArea className="box-border max-h-40 w-full rounded-xl border border-white/25 bg-white/70 shadow-sm backdrop-blur-md transition-[color,box-shadow] 2xl:max-h-52 dark:border-white/8 dark:bg-slate-900/60 has-focus-visible:ring-[3px] has-focus-visible:border-ring has-focus-visible:ring-ring/40">
        <Textarea
          ref={ref}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          maxLength={maxLength}
          rows={3}
          value={value}
          spellCheck={false}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder="Type your message here."
          onChange={onChange}
          disabled={disabled || loading}
          className={cn(
            'box-border resize-none whitespace-pre-wrap border-none bg-transparent px-2 pb-10 text-sm text-slate-700 [word-break:break-word] focus-visible:ring-0 dark:text-slate-100',
            {
              'disabled:opacity-100': loading
            }
          )}
        ></Textarea>
      </ScrollArea>
      <div
        className={cn('absolute right-3 top-1.5 rounded-lg text-[11px] text-slate-500 dark:text-slate-400', {
          'opacity-50': disabled || loading
        })}
      >
        {value?.length ?? 0}/{maxLength}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-800 after:absolute after:inset-0 after:backdrop-blur-xs dark:text-slate-100">
          <LoadingIcon className="relative z-10 size-10"></LoadingIcon>
        </div>
      )}
    </div>
  )
}

MessageInput.displayName = 'MessageInput'

export default MessageInput
