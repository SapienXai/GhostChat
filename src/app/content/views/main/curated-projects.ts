export interface CuratedProject {
  id: string
  name: string
  origin: string
  description: string
  tags: string[]
  activeUsers: number
  messages24h: number
  lastActiveMinutesAgo: number
  trendingBoost: number
  risingBoost: number
}

export const CURATED_PROJECTS: CuratedProject[] = [
  {
    id: 'curated-uniswap',
    name: 'Uniswap',
    origin: 'https://app.uniswap.org',
    description: 'Leading DEX for swaps, pools, and on-chain market discovery.',
    tags: ['DEX', 'Ethereum', 'Blue Chip'],
    activeUsers: 68,
    messages24h: 790,
    lastActiveMinutesAgo: 3,
    trendingBoost: 26,
    risingBoost: 8
  },
  {
    id: 'curated-aave',
    name: 'Aave',
    origin: 'https://app.aave.com',
    description: 'Top DeFi lending protocol with deep liquidity and active communities.',
    tags: ['Lending', 'DeFi', 'Blue Chip'],
    activeUsers: 49,
    messages24h: 520,
    lastActiveMinutesAgo: 6,
    trendingBoost: 22,
    risingBoost: 6
  },
  {
    id: 'curated-curve',
    name: 'Curve',
    origin: 'https://curve.fi',
    description: 'Major stablecoin DEX with strong DeFi-native user activity.',
    tags: ['DEX', 'Stablecoins', 'DeFi'],
    activeUsers: 41,
    messages24h: 440,
    lastActiveMinutesAgo: 8,
    trendingBoost: 18,
    risingBoost: 5
  },
  {
    id: 'curated-lido',
    name: 'Lido',
    origin: 'https://stake.lido.fi',
    description: 'Liquid staking hub heavily discussed during staking cycles.',
    tags: ['Staking', 'Ethereum', 'DeFi'],
    activeUsers: 36,
    messages24h: 378,
    lastActiveMinutesAgo: 10,
    trendingBoost: 16,
    risingBoost: 4
  },
  {
    id: 'curated-jupiter',
    name: 'Jupiter',
    origin: 'https://jup.ag',
    description: 'Solana aggregator with very active routing and trading chatter.',
    tags: ['Solana', 'Aggregator', 'Trading'],
    activeUsers: 57,
    messages24h: 640,
    lastActiveMinutesAgo: 4,
    trendingBoost: 24,
    risingBoost: 14
  },
  {
    id: 'curated-raydium',
    name: 'Raydium',
    origin: 'https://raydium.io',
    description: 'Core Solana DEX ecosystem project with strong token momentum.',
    tags: ['Solana', 'DEX', 'New & Rising'],
    activeUsers: 34,
    messages24h: 392,
    lastActiveMinutesAgo: 7,
    trendingBoost: 14,
    risingBoost: 12
  },
  {
    id: 'curated-pancakeswap',
    name: 'PancakeSwap',
    origin: 'https://pancakeswap.finance',
    description: 'Large multi-chain DEX with sustained user participation.',
    tags: ['DEX', 'BNB Chain', 'DeFi'],
    activeUsers: 44,
    messages24h: 455,
    lastActiveMinutesAgo: 9,
    trendingBoost: 15,
    risingBoost: 6
  },
  {
    id: 'curated-opensea',
    name: 'OpenSea',
    origin: 'https://opensea.io',
    description: 'The best-known NFT marketplace with broad collector visibility.',
    tags: ['NFT', 'Marketplace', 'Blue Chip'],
    activeUsers: 32,
    messages24h: 336,
    lastActiveMinutesAgo: 11,
    trendingBoost: 14,
    risingBoost: 5
  },
  {
    id: 'curated-blur',
    name: 'Blur',
    origin: 'https://blur.io',
    description: 'Pro NFT trading interface with fast-moving community sentiment.',
    tags: ['NFT', 'Trading', 'New & Rising'],
    activeUsers: 29,
    messages24h: 348,
    lastActiveMinutesAgo: 8,
    trendingBoost: 12,
    risingBoost: 11
  },
  {
    id: 'curated-magiceden',
    name: 'Magic Eden',
    origin: 'https://magiceden.io',
    description: 'Multi-chain NFT platform with active drops and social traction.',
    tags: ['NFT', 'Marketplace', 'Solana'],
    activeUsers: 26,
    messages24h: 290,
    lastActiveMinutesAgo: 12,
    trendingBoost: 10,
    risingBoost: 9
  },
  {
    id: 'curated-hyperliquid',
    name: 'Hyperliquid',
    origin: 'https://app.hyperliquid.xyz',
    description: 'Perp trading venue drawing strong attention from active traders.',
    tags: ['Perps', 'Trading', 'New & Rising'],
    activeUsers: 47,
    messages24h: 610,
    lastActiveMinutesAgo: 5,
    trendingBoost: 20,
    risingBoost: 18
  },
  {
    id: 'curated-dydx',
    name: 'dYdX',
    origin: 'https://dydx.trade',
    description: 'Longstanding derivatives venue with deep trader communities.',
    tags: ['Perps', 'Trading', 'Blue Chip'],
    activeUsers: 33,
    messages24h: 356,
    lastActiveMinutesAgo: 9,
    trendingBoost: 13,
    risingBoost: 7
  },
  {
    id: 'curated-ethena',
    name: 'Ethena',
    origin: 'https://app.ethena.fi',
    description: 'Fast-growing stablecoin protocol often discussed in DeFi circles.',
    tags: ['Stablecoin', 'DeFi', 'New & Rising'],
    activeUsers: 35,
    messages24h: 410,
    lastActiveMinutesAgo: 7,
    trendingBoost: 14,
    risingBoost: 15
  },
  {
    id: 'curated-pendle',
    name: 'Pendle',
    origin: 'https://app.pendle.finance',
    description: 'Yield trading protocol with high engagement among power users.',
    tags: ['Yield', 'DeFi', 'New & Rising'],
    activeUsers: 30,
    messages24h: 340,
    lastActiveMinutesAgo: 9,
    trendingBoost: 12,
    risingBoost: 13
  },
  {
    id: 'curated-frax',
    name: 'Frax',
    origin: 'https://app.frax.finance',
    description: 'Major DeFi and stablecoin ecosystem with loyal user base.',
    tags: ['Stablecoin', 'DeFi', 'Ecosystem'],
    activeUsers: 23,
    messages24h: 258,
    lastActiveMinutesAgo: 14,
    trendingBoost: 8,
    risingBoost: 4
  },
  {
    id: 'curated-maker',
    name: 'Maker',
    origin: 'https://app.spark.fi',
    description: 'Foundational DeFi ecosystem with governance and lending activity.',
    tags: ['Lending', 'Stablecoin', 'Blue Chip'],
    activeUsers: 27,
    messages24h: 280,
    lastActiveMinutesAgo: 13,
    trendingBoost: 10,
    risingBoost: 4
  },
  {
    id: 'curated-arbitrum',
    name: 'Arbitrum',
    origin: 'https://bridge.arbitrum.io',
    description: 'High-volume L2 ecosystem discussed across many protocols.',
    tags: ['L2', 'Ecosystem', 'Ethereum'],
    activeUsers: 38,
    messages24h: 412,
    lastActiveMinutesAgo: 6,
    trendingBoost: 15,
    risingBoost: 8
  },
  {
    id: 'curated-base',
    name: 'Base',
    origin: 'https://bridge.base.org',
    description: 'Fast-growing L2 with strong app discovery and user conversation.',
    tags: ['L2', 'Ecosystem', 'New & Rising'],
    activeUsers: 40,
    messages24h: 438,
    lastActiveMinutesAgo: 6,
    trendingBoost: 16,
    risingBoost: 14
  },
  {
    id: 'curated-zora',
    name: 'Zora',
    origin: 'https://zora.co',
    description: 'Creator-driven onchain media platform with social momentum.',
    tags: ['Social', 'NFT', 'New & Rising'],
    activeUsers: 25,
    messages24h: 312,
    lastActiveMinutesAgo: 9,
    trendingBoost: 10,
    risingBoost: 12
  },
  {
    id: 'curated-polymarket',
    name: 'Polymarket',
    origin: 'https://polymarket.com',
    description: 'Prediction market with viral trading topics and broad visibility.',
    tags: ['Prediction', 'Trading', 'New & Rising'],
    activeUsers: 43,
    messages24h: 472,
    lastActiveMinutesAgo: 5,
    trendingBoost: 17,
    risingBoost: 16
  },
  {
    id: 'curated-coincollect',
    name: 'CoinCollect',
    origin: 'https://coincollect.org/',
    description: 'Onchain campaign and collection flows centered on community participation.',
    tags: ['Campaign', 'Community', 'Web3'],
    activeUsers: 22,
    messages24h: 228,
    lastActiveMinutesAgo: 10,
    trendingBoost: 7,
    risingBoost: 9
  },
  {
    id: 'curated-questlayer',
    name: 'QuestLayer',
    origin: 'https://questlayer.app/',
    description: 'Quest-driven growth platform with active engagement and reward loops.',
    tags: ['Quests', 'Growth', 'New & Rising'],
    activeUsers: 24,
    messages24h: 248,
    lastActiveMinutesAgo: 9,
    trendingBoost: 8,
    risingBoost: 10
  }
]
