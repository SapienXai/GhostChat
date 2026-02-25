import type { ReactNode } from 'react'
import { type MouseEvent, type FC, type ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils'
import NumberFlow from '@number-flow/react'

export interface LikeButtonIconProps {
  children: ReactNode
}

export const LikeButtonIcon: FC<LikeButtonIconProps> = ({ children }) => children

export interface LikeButtonProps {
  count: number
  checked: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  onChange?: (checked: boolean, count: number) => void
  children: ReactElement<LikeButtonIconProps>
}

const LikeButton: FC<LikeButtonProps> & { Icon: FC<LikeButtonIconProps> } = ({
  checked,
  count,
  onClick,
  onChange,
  children
}) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    onChange?.(!checked, checked ? count - 1 : count + 1)
  }

  return (
    <Button
      onClick={handleClick}
      variant="secondary"
      className={cn(
        'grid select-none items-center overflow-hidden rounded-full border border-white/40 bg-white/70 leading-none shadow-sm transition-all hover:bg-white/85 dark:border-white/10 dark:bg-slate-800/70 dark:hover:bg-slate-700/80',
        checked ? 'text-orange-500' : 'text-slate-500 dark:text-slate-200',
        count ? 'grid-cols-[auto_1fr] gap-x-1' : 'grid-cols-[auto_0fr] gap-x-0'
      )}
      size="xs"
    >
      {children}
      {!!count && (
        <span className="min-w-0 text-xs">
          {import.meta.env.FIREFOX ? <span className="tabular-nums">{count}</span> : <NumberFlow value={count} />}
        </span>
      )}
    </Button>
  )
}

LikeButton.Icon = LikeButtonIcon

LikeButton.displayName = 'LikeButton'

export default LikeButton
