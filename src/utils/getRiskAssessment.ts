import type { SiteInfo } from './getSiteInfo'
import type { Web3Context } from './detectWeb3'
import type { WalletInfo } from './getWalletInfo'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface RiskReason {
  label: string
  detail: string
  impact: number
}

export interface RiskAssessment {
  score: number
  level: RiskLevel
  reasons: RiskReason[]
}

interface Input {
  siteInfo: SiteInfo
  web3: Web3Context
  walletInfo?: WalletInfo
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const hasIpHostname = (hostname: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)

const SUSPICIOUS_KEYWORDS = ['airdrop', 'claim', 'verify', 'walletconnect', 'seed', 'bonus', 'mint-now', 'free-mint']
const RISKY_TLDS = ['xyz', 'top', 'click', 'gq', 'tk', 'work', 'zip', 'mov']
const TRUSTED_WEB3_HOSTS = new Set([
  'uniswap.org',
  'app.uniswap.org',
  'opensea.io',
  'blur.io',
  'magiceden.io',
  'aave.com',
  'app.aave.com',
  'compound.finance',
  'curve.fi',
  'balancer.fi',
  'app.1inch.io',
  'pancakeswap.finance',
  'app.sushi.com',
  'etherscan.io',
  'arbiscan.io',
  'bscscan.com',
  'polygonscan.com',
  'snapshot.org'
])
const SUSPICIOUS_QUERY_KEYS = ['redirect=', 'url=', 'next=', 'return=', 'callback=']

export const getRiskAssessment = ({ siteInfo, web3, walletInfo }: Input): RiskAssessment => {
  const reasons: RiskReason[] = []
  const url = siteInfo.href.toLowerCase()
  const hostname = siteInfo.hostname.toLowerCase()
  const protocol = new URL(siteInfo.href).protocol
  let score = 75

  if (protocol !== 'https:') {
    score -= 28
    reasons.push({ label: 'Insecure connection', detail: 'Site is not using HTTPS.', impact: -28 })
  } else {
    score += 5
    reasons.push({ label: 'Secure transport', detail: 'Connection uses HTTPS.', impact: 5 })
  }

  if (hostname.includes('xn--')) {
    score -= 25
    reasons.push({
      label: 'Punycode domain',
      detail: 'Hostname contains punycode and may impersonate another domain.',
      impact: -25
    })
  }

  if (hasIpHostname(hostname)) {
    score -= 20
    reasons.push({
      label: 'Raw IP host',
      detail: 'Site is loaded from an IP address instead of a domain.',
      impact: -20
    })
  }

  const tld = hostname.split('.').at(-1) || ''
  if (RISKY_TLDS.includes(tld)) {
    score -= 10
    reasons.push({ label: 'Risky TLD', detail: `Domain uses .${tld}, often abused in scam campaigns.`, impact: -10 })
  }

  const suspiciousHits = SUSPICIOUS_KEYWORDS.filter((item) => url.includes(item))
  if (suspiciousHits.length) {
    const impact = -Math.min(24, suspiciousHits.length * 8)
    score += impact
    reasons.push({
      label: 'Phishing-like keywords',
      detail: `Detected keywords: ${suspiciousHits.slice(0, 3).join(', ')}.`,
      impact
    })
  }

  const hyphenCount = (hostname.match(/-/g) || []).length
  if (hyphenCount >= 3) {
    score -= 8
    reasons.push({ label: 'Obfuscated hostname', detail: 'Hostname includes many hyphens.', impact: -8 })
  }

  if (web3.isWeb3Site) {
    if (TRUSTED_WEB3_HOSTS.has(hostname)) {
      score += 10
      reasons.push({
        label: 'Established protocol domain',
        detail: `Recognized known ${web3.platform ?? 'web3'} domain.`,
        impact: 10
      })
    } else {
      score -= 6
      reasons.push({
        label: 'Unrecognized Web3 domain',
        detail: 'Web3 context detected on a domain outside trusted list.',
        impact: -6
      })
    }
  }

  if (web3.contractAddress) {
    score += 4
    reasons.push({
      label: 'Contract context available',
      detail: 'A contract address was detected from URL context.',
      impact: 4
    })
  }

  if (walletInfo?.isDetected) {
    score += 2
    reasons.push({
      label: 'Wallet provider detected',
      detail: `Detected provider: ${walletInfo.provider ?? 'unknown'}.`,
      impact: 2
    })
  }

  if (url.includes('@')) {
    score -= 12
    reasons.push({
      label: 'Suspicious URL format',
      detail: 'URL contains @ symbol, common in phishing links.',
      impact: -12
    })
  }

  if (SUSPICIOUS_QUERY_KEYS.some((key) => url.includes(key))) {
    score -= 7
    reasons.push({
      label: 'Redirect-style parameters',
      detail: 'URL includes redirect/callback parameters often used in malicious flows.',
      impact: -7
    })
  }

  if (siteInfo.href.length > 140) {
    score -= 4
    reasons.push({ label: 'Long URL path', detail: 'Very long URL can hide malicious payloads.', impact: -4 })
  }

  const normalizedScore = clamp(Math.round(score), 0, 100)
  const level: RiskLevel = normalizedScore >= 75 ? 'LOW' : normalizedScore >= 45 ? 'MEDIUM' : 'HIGH'
  const sortedReasons = [...reasons].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))

  return {
    score: normalizedScore,
    level,
    reasons: sortedReasons
  }
}

export default getRiskAssessment
