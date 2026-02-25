import type { FC } from 'react'
import { TwitterIcon, SendIcon, DiscIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { SiteInfo } from '@/utils/getSiteInfo'

interface SocialLinksProps {
  siteInfo: SiteInfo
}

const SocialLinks: FC<SocialLinksProps> = ({ siteInfo }) => {
  return (
    <div className="flex items-center gap-x-1">
      {siteInfo.twitter && (
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="xs"
              aria-label="Twitter"
              className="rounded-full border border-white/45 bg-white/70 text-slate-600 backdrop-blur-md hover:bg-white dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200"
            >
              <a href={siteInfo.twitter} target="_blank" rel="noopener noreferrer">
                <TwitterIcon className="size-3" />
              </a>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto px-2 py-1 text-xs">Twitter</HoverCardContent>
        </HoverCard>
      )}
      {siteInfo.telegram && (
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="xs"
              aria-label="Telegram"
              className="rounded-full border border-white/45 bg-white/70 text-slate-600 backdrop-blur-md hover:bg-white dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200"
            >
              <a href={siteInfo.telegram} target="_blank" rel="noopener noreferrer">
                <SendIcon className="size-3" />
              </a>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto px-2 py-1 text-xs">Telegram</HoverCardContent>
        </HoverCard>
      )}
      {siteInfo.discord && (
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="xs"
              aria-label="Discord"
              className="rounded-full border border-white/45 bg-white/70 text-slate-600 backdrop-blur-md hover:bg-white dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200"
            >
              <a href={siteInfo.discord} target="_blank" rel="noopener noreferrer">
                <DiscIcon className="size-3" />
              </a>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto px-2 py-1 text-xs">Discord</HoverCardContent>
        </HoverCard>
      )}
    </div>
  )
}

export default SocialLinks
