import { format as formatDate } from 'date-fns'
import { type FC } from 'react'
import { Slot } from '@radix-ui/react-slot'

export interface FormatDateProps {
  date: Date | number | string
  format?: string
  asChild?: boolean
  className?: string
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const MONTH_DISPLAY_DAY = 30

const toTimestamp = (value: Date | number | string) => {
  if (value instanceof Date) {
    return value.getTime()
  }
  if (typeof value === 'number') {
    return value
  }
  return new Date(value).getTime()
}

const getRelativeLabel = (timestamp: number, now: number) => {
  if (!Number.isFinite(timestamp)) {
    return '--'
  }

  const diffMs = now - timestamp

  if (diffMs < 0) {
    return formatDate(timestamp, 'HH:mm')
  }

  if (diffMs < 5 * 1000) {
    return 'just now'
  }

  if (diffMs < MINUTE_MS) {
    return `${Math.floor(diffMs / 1000)}s ago`
  }

  if (diffMs < HOUR_MS) {
    return `${Math.floor(diffMs / MINUTE_MS)}m ago`
  }

  if (diffMs < DAY_MS) {
    return `${Math.floor(diffMs / HOUR_MS)}h ago`
  }

  if (diffMs < MONTH_DISPLAY_DAY * DAY_MS) {
    return `${Math.floor(diffMs / DAY_MS)}d ago`
  }

  return null
}

const FormatDate: FC<FormatDateProps> = ({ date, format = 'yyyy/MM/dd', asChild = false, ...props }) => {
  const Comp = asChild ? Slot : 'div'
  const timestamp = toTimestamp(date)
  const now = Date.now()
  const relativeLabel = getRelativeLabel(timestamp, now)
  return <Comp {...props}>{relativeLabel ?? formatDate(timestamp, format)}</Comp>
}

FormatDate.displayName = 'FormatDate'
export default FormatDate
