import type { FC } from 'react'
import { TwitterIcon, SendIcon, DiscIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from '@/components/link'
import type { SiteInfo } from '@/utils/getSiteInfo'

interface SocialLinksProps {
  siteInfo: SiteInfo
}

const SocialLinks: FC<SocialLinksProps> = ({ siteInfo }) => {
  return (
    <div className="flex items-center gap-x-1">
      {siteInfo.twitter && (
        <Link href={siteInfo.twitter} target="_blank">
          <Button variant="ghost" size="xs">
            <TwitterIcon className="size-3" />
          </Button>
        </Link>
      )}
      {siteInfo.telegram && (
        <Link href={siteInfo.telegram} target="_blank">
          <Button variant="ghost" size="xs">
            <SendIcon className="size-3" />
          </Button>
        </Link>
      )}
      {siteInfo.discord && (
        <Link href={siteInfo.discord} target="_blank">
          <Button variant="ghost" size="xs">
            <DiscIcon className="size-3" />
          </Button>
        </Link>
      )}
    </div>
  )
}

export default SocialLinks
