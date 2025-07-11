import { cn } from '@/utils'
import type { ReactNode, Ref } from 'react'

export interface LinkProps {
  href: string
  className?: string
  children: ReactNode
  underline?: boolean
  target?: string
}

const Link = ({
  ref,
  href,
  className,
  children,
  underline = true,
  target
}: LinkProps & { ref?: Ref<HTMLAnchorElement | null> }) => {
  return (
    <a
      href={href}
      target={target}
      rel="noopener noreferrer"
      className={cn(underline && 'hover:underline', className)}
      ref={ref}
    >
      {children}
    </a>
  )
}

Link.displayName = 'Link'
export default Link
