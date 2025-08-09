export interface Web3Context {
  isWeb3Site: boolean
  platform?: 'dex' | 'nft' | 'defi' | 'dao' | 'bridge' | 'launchpad' | 'wallet' | 'explorer'
  chain?: string
  contractAddress?: string
  tokenSymbol?: string
  protocol?: string
}

// Popular Web3 domains and their classifications
const WEB3_SITES: Record<string, { platform: Web3Context['platform']; protocol: string }> = {
  'uniswap.org': { platform: 'dex', protocol: 'Uniswap' },
  'app.uniswap.org': { platform: 'dex', protocol: 'Uniswap' },
  'opensea.io': { platform: 'nft', protocol: 'OpenSea' },
  'pro.opensea.io': { platform: 'nft', protocol: 'OpenSea Pro' },
  'blur.io': { platform: 'nft', protocol: 'Blur' },
  'magiceden.io': { platform: 'nft', protocol: 'Magic Eden' },
  'foundation.app': { platform: 'nft', protocol: 'Foundation' },
  'superrare.com': { platform: 'nft', protocol: 'SuperRare' },
  'aave.com': { platform: 'defi', protocol: 'Aave' },
  'app.aave.com': { platform: 'defi', protocol: 'Aave' },
  'compound.finance': { platform: 'defi', protocol: 'Compound' },
  'app.compound.finance': { platform: 'defi', protocol: 'Compound' },
  'makerdao.com': { platform: 'defi', protocol: 'MakerDAO' },
  'oasis.app': { platform: 'defi', protocol: 'Maker Oasis' },
  'curve.fi': { platform: 'dex', protocol: 'Curve' },
  'balancer.fi': { platform: 'dex', protocol: 'Balancer' },
  'app.1inch.io': { platform: 'dex', protocol: '1inch' },
  'pancakeswap.finance': { platform: 'dex', protocol: 'PancakeSwap' },
  'app.sushi.com': { platform: 'dex', protocol: 'SushiSwap' },
  'etherscan.io': { platform: 'explorer', protocol: 'Etherscan' },
  'bscscan.com': { platform: 'explorer', protocol: 'BscScan' },
  'polygonscan.com': { platform: 'explorer', protocol: 'PolygonScan' },
  'arbiscan.io': { platform: 'explorer', protocol: 'Arbiscan' },
  'optimistic.etherscan.io': { platform: 'explorer', protocol: 'Optimism Explorer' },
  'snapshot.org': { platform: 'dao', protocol: 'Snapshot' },
  'app.ens.domains': { platform: 'wallet', protocol: 'ENS' },
  'ens.domains': { platform: 'wallet', protocol: 'ENS' },
  'gnosis-safe.io': { platform: 'wallet', protocol: 'Safe' },
  'app.safe.global': { platform: 'wallet', protocol: 'Safe' },
  'rainbow.me': { platform: 'wallet', protocol: 'Rainbow' },
  'metamask.io': { platform: 'wallet', protocol: 'MetaMask' },
  'bridge.arbitrum.io': { platform: 'bridge', protocol: 'Arbitrum Bridge' },
  'wallet.polygon.technology': { platform: 'bridge', protocol: 'Polygon Bridge' },
  'app.hop.exchange': { platform: 'bridge', protocol: 'Hop Protocol' },
  'across.to': { platform: 'bridge', protocol: 'Across' },
  'app.moonwell.fi': { platform: 'defi', protocol: 'Moonwell' },
  'app.venus.io': { platform: 'defi', protocol: 'Venus' },
  'dydx.exchange': { platform: 'dex', protocol: 'dYdX' },
  'trade.dydx.exchange': { platform: 'dex', protocol: 'dYdX' },
  'app.gmx.io': { platform: 'dex', protocol: 'GMX' },
  'coinbase.com': { platform: 'dex', protocol: 'Coinbase' },
  'pro.coinbase.com': { platform: 'dex', protocol: 'Coinbase Pro' },
  'advanced.coinbase.com': { platform: 'dex', protocol: 'Coinbase Advanced' },
  // Newly added known domains per user request
  'coincollect.org': { platform: 'nft', protocol: 'CoinCollect' },
  'questgalaxy.com': { platform: 'launchpad', protocol: 'QuestGalaxy' }
}

// Chain detection patterns
const CHAIN_PATTERNS: Record<string, string> = {
  ethereum: 'Ethereum',
  eth: 'Ethereum',
  polygon: 'Polygon',
  matic: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  bsc: 'BSC',
  binance: 'BSC',
  avalanche: 'Avalanche',
  avax: 'Avalanche',
  fantom: 'Fantom',
  solana: 'Solana',
  sol: 'Solana'
}

export const detectWeb3Context = (): Web3Context => {
  const hostname = window.location.hostname.toLowerCase()
  const pathname = window.location.pathname.toLowerCase()
  const url = window.location.href.toLowerCase()

  // Check against known Web3 sites
  const siteInfo = WEB3_SITES[hostname]
  if (siteInfo) {
    const context: Web3Context = {
      isWeb3Site: true,
      platform: siteInfo.platform,
      protocol: siteInfo.protocol
    }

    // Try to detect chain from URL or page content
    for (const [pattern, chain] of Object.entries(CHAIN_PATTERNS)) {
      if (url.includes(pattern) || pathname.includes(pattern)) {
        context.chain = chain
        break
      }
    }

    // Extract contract address from URL (common pattern: /address/0x... or /token/0x...)
    const contractMatch = url.match(/(?:address|token|contract)\/0x[a-f0-9]{40}/i)
    if (contractMatch) {
      context.contractAddress = contractMatch[0].split('/')[1]
    }

    // Extract token symbol from URL
    const symbolMatch = pathname.match(/\/([A-Z]{2,10})(?:\/|$)/)
    if (symbolMatch) {
      context.tokenSymbol = symbolMatch[1]
    }

    return context
  }

  // Check for Web3 indicators in the page
  const hasWeb3Indicators = () => {
    // Check for common Web3 terms in page title/meta
    const title = document.title.toLowerCase()
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.toLowerCase() || ''

    const web3Keywords = [
      'defi',
      'dex',
      'nft',
      'dao',
      'crypto',
      'blockchain',
      'ethereum',
      'bitcoin',
      'metamask',
      'wallet',
      'dapp',
      'swap',
      'stake',
      'yield',
      'farming',
      'liquidity',
      'contract',
      'token',
      'coin',
      'mining',
      'web3'
    ]

    return web3Keywords.some((keyword) => title.includes(keyword) || description.includes(keyword))
  }

  // Check for window.ethereum or other Web3 provider objects
  const hasWeb3Provider = () => {
    return !!(window as any).ethereum || !!(window as any).solana || !!(window as any).phantom || !!(window as any).web3
  }

  const isWeb3Site = hasWeb3Indicators() || hasWeb3Provider()

  return {
    isWeb3Site,
    // Try to infer platform from content if it's a Web3 site
    platform: isWeb3Site ? 'defi' : undefined
  }
}

export const getChainIcon = (chain?: string): string => {
  const chainIcons: Record<string, string> = {
    Ethereum: '⟠',
    Polygon: '⬟',
    Arbitrum: '🔵',
    Optimism: '🔴',
    BSC: '⬡',
    Avalanche: '🔺',
    Fantom: '👻',
    Solana: '◎'
  }

  return chainIcons[chain || ''] || '🌐'
}

export const getPlatformIcon = (platform?: Web3Context['platform']): string => {
  const platformIcons: Record<string, string> = {
    dex: '🔄',
    nft: '🖼️',
    defi: '🏦',
    dao: '🗳️',
    bridge: '🌉',
    launchpad: '🚀',
    wallet: '👛',
    explorer: '🔍'
  }

  return platformIcons[platform || ''] || '🌐'
}
