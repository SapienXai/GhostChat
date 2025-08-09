// Wallet detection script that runs in page context
// This safely reads provider information without triggering connection prompts

;(function () {
  'use strict'

  const CHAIN_NAMES = {
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

  const detectWallet = async () => {
    const result = {
      isDetected: false,
      provider: null,
      chainId: null,
      chainName: null,
      error: null
    }

    try {
      // Check for Ethereum provider
      if (window.ethereum) {
        try {
          // Safe read-only call - doesn't trigger wallet connection
          const chainId = await window.ethereum.request({
            method: 'eth_chainId'
          })

          result.isDetected = true
          result.provider = 'ethereum'
          result.chainId = chainId
          result.chainName = CHAIN_NAMES[chainId] || `Chain ${parseInt(chainId, 16)}`
        } catch {
          // Provider exists but blocked the request
          result.isDetected = true
          result.provider = 'ethereum'
          result.error = 'Provider detected but unavailable'
        }
      }
      // Check for Solana providers
      else if (window.solana || (window.phantom && window.phantom.solana)) {
        const provider = window.solana || window.phantom.solana

        result.isDetected = true
        result.provider = provider.isPhantom ? 'phantom' : 'solana'
        result.chainName = 'Solana'
      }
      // Check for legacy web3
      else if (window.web3) {
        result.isDetected = true
        result.provider = 'web3'
        result.chainName = 'Legacy Web3'
      }
    } catch (error) {
      result.error = `Detection failed: ${error && error.message ? error.message : String(error)}`
    }

    // Send result back to content script via both mechanisms for reliability
    try {
      document.dispatchEvent(new CustomEvent('ghostchat-wallet-detected', { detail: result }))
    } catch {
      void 0
    }

    try {
      window.postMessage({ source: 'ghostchat', type: 'walletDetected', payload: result }, '*')
    } catch {
      void 0
    }
  }

  // Run detection after a brief delay to ensure providers are loaded
  setTimeout(detectWallet, 100)
})()
