import { SmileIcon } from 'lucide-react'
import { useState, type FC } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { EMOJI_LIST } from '@/constants/config'
import { chunk } from '@/utils'

export interface EmojiButtonProps {
  onSelect?: (value: string) => void
}

const emojiGroups = chunk([...EMOJI_LIST], 6)

/**
 * WORKAROUNDS FOR RADIX UI BUGS:
 *
 * 1. Shadow DOM issue (https://github.com/radix-ui/primitives/pull/2433):
 *    Popover dismiss events don't work correctly in shadow DOM environments.
 *    Current workaround: Using controlled state with onOpenChange.
 *
 * 2. ScrollArea Viewport asChild issue (https://github.com/radix-ui/primitives/issues/1666):
 *    The asChild prop on ScrollArea.Viewport doesn't work correctly due to extra DOM nodes.
 *    Current workaround: Not using asChild on ScrollArea components.
 */
const EmojiButton: FC<EmojiButtonProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false)

  const handleSelect = (value: string) => {
    setOpen(false)
    onSelect?.(value)
  }

  const handleCloseAutoFocus = (event: Event) => {
    // Prevent auto-focus on close to avoid focus management issues
    // This helps with the shadow DOM bug mentioned above
    event.preventDefault()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="dark:text-white">
          <SmileIcon className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-infinity w-64 overflow-hidden rounded-xl p-0 dark:bg-slate-900"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <ScrollArea className="size-64 p-1">
          {emojiGroups.map((group, index) => {
            return (
              <div key={index} className="grid grid-cols-6">
                {group.map((emoji, index) => (
                  <Button
                    key={index}
                    size="icon"
                    className="text-xl"
                    variant="ghost"
                    onClick={() => handleSelect(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            )
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

EmojiButton.displayName = 'EmojiButton'

export default EmojiButton
