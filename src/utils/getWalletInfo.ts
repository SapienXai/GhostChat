export interface WalletInfo {
  isDetected: boolean
  provider?: 'ethereum' | 'solana' | 'phantom' | 'web3'
  chainId?: string
  chainName?: string
  error?: string
}

// Chain ID to human-readable name mapping
const CHAIN_NAMES: Record<string, string> = {
  '0x1': 'Ethereum',
  '0x89': 'Polygon',
  '0xa4b1': 'Arbitrum',
  '0xa': 'Optimism',
  '0x38': 'BSC',
  '0xa86a': 'Avalanche',
  '0xfa': 'Fantom',
  '0x2105': 'Base',
  '0xa4ec': 'Celo',
  '0x144': 'zkSync Era'
}

export const getWalletInfo = async (): Promise<WalletInfo> => {
  try {
    // Check for Ethereum provider
    if ((window as any).ethereum) {
      try {
        const provider = (window as any).ethereum
        // Safe read-only call - doesn't trigger wallet connection
        const chainId = await provider.request({
          method: 'eth_chainId'
        })

        return {
          isDetected: true,
          provider: 'ethereum',
          chainId,
          chainName: CHAIN_NAMES[chainId] || `Chain ${parseInt(chainId, 16)}`
        }
      } catch {
        // Provider exists but blocked the request
        return {
          isDetected: true,
          provider: 'ethereum',
          error: 'Provider detected but unavailable'
        }
      }
    }

    // Check for Solana providers
    if ((window as any).solana || (window as any).phantom?.solana) {
      const provider = (window as any).solana || (window as any).phantom?.solana

      try {
        // For Solana, we can't safely get network without connecting
        // Just detect presence
        return {
          isDetected: true,
          provider: provider.isPhantom ? 'phantom' : 'solana',
          chainName: 'Solana'
        }
      } catch {
        return {
          isDetected: true,
          provider: 'solana',
          chainName: 'Solana',
          error: 'Provider detected but unavailable'
        }
      }
    }

    // Check for legacy web3
    if ((window as any).web3) {
      return {
        isDetected: true,
        provider: 'web3',
        chainName: 'Legacy Web3'
      }
    }

    return { isDetected: false }
  } catch (error) {
    return {
      isDetected: false,
      error: `Detection failed: ${error}`
    }
  }
}

export const getProviderIcon = (provider?: WalletInfo['provider']): string => {
  const icons: Record<string, string> = {
    ethereum: '⟠',
    solana: '◎',
    phantom: '👻',
    web3: '🌐'
  }

  return icons[provider || ''] || '👛'
}
