// server.js - Optimized Uniswap V3 Triangular Arbitrage Scanner
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');  // Add this line

const app = express();
app.use(cors());
app.use(express.json());

// ====================== TOKEN CONFIGURATION ======================
const NETWORKS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    
    // Your Arbitrum tokens with categories for optimization
    tokens: {
      // Stablecoins (highest liquidity, most persistent opportunities)
      'USDC': { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', decimals: 6, category: 'stable', minLiquidity: 50000 },
      'USDC.e': { address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', decimals: 6, category: 'stable', minLiquidity: 30000 },
      'USDT': { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', decimals: 6, category: 'stable', minLiquidity: 40000 },
      'DAI': { address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', decimals: 18, category: 'stable', minLiquidity: 20000 },
      'LUSD': { address: '0x93b346b6bc25483a79a3e517304e2b5c1de2e47c', decimals: 18, category: 'stable', minLiquidity: 5000 },
      'FRAX': { address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f', decimals: 18, category: 'stable', minLiquidity: 5000 },
      
      // Major Blue Chips (high liquidity)
      'WETH': { address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', decimals: 18, category: 'major', minLiquidity: 10000 },
      'WBTC': { address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', decimals: 8, category: 'major', minLiquidity: 500 },
      'cbETH': { address: '0x1debd73e752beaf79865fd6446b0c970eae7732f', decimals: 18, category: 'major', minLiquidity: 1000 },
      'cbBTC': { address: '0x28fe63565e51ceaf7e3b686d6cd7ba24fb4a8558', decimals: 8, category: 'major', minLiquidity: 50 },
      'tBTC': { address: '0x6c84a8f1c29108f47a79964b5fe888d4f4d0de40', decimals: 18, category: 'major', minLiquidity: 100 },
      
      // Major DeFi Tokens (good liquidity)
      'ARB': { address: '0x912ce59144191c1204e64559fe8253a0e49e6548', decimals: 18, category: 'defi', minLiquidity: 20000 },
      'GMX': { address: '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a', decimals: 18, category: 'defi', minLiquidity: 5000 },
      'UNI': { address: '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0', decimals: 18, category: 'defi', minLiquidity: 3000 },
      'LINK': { address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4', decimals: 18, category: 'defi', minLiquidity: 4000 },
      'AAVE': { address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', decimals: 18, category: 'defi', minLiquidity: 1000 },
      'CRV': { address: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978', decimals: 18, category: 'defi', minLiquidity: 2000 },
      'COMP': { address: '0x354a6da4a1c414131c964d7c0b50c373e9c1a845', decimals: 18, category: 'defi', minLiquidity: 500 },
      'SNX': { address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4', decimals: 18, category: 'defi', minLiquidity: 800 },
      'MKR': { address: '0x2e14bf0409894809d5e2e733707698d38c400a62', decimals: 18, category: 'defi', minLiquidity: 300 },
      'BAL': { address: '0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8', decimals: 18, category: 'defi', minLiquidity: 400 },
      'LDO': { address: '0x13ad51ed4f1b7e9dc168d8a00cb3f91e71e6e8d0', decimals: 18, category: 'defi', minLiquidity: 1500 },
      'FXS': { address: '0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7', decimals: 18, category: 'defi', minLiquidity: 800 },
      'SUSHI': { address: '0xd4d42f0b6def4ce0383636770ef773390d85c61a', decimals: 18, category: 'defi', minLiquidity: 600 },
      'PENDLE': { address: '0x0c880f6761f1af8d9aa9c466984b80dab9a8c9e8', decimals: 18, category: 'defi', minLiquidity: 700 },
      'RPL': { address: '0xb766039cc6db368759c1e56b79affe831d0cc507', decimals: 18, category: 'defi', minLiquidity: 200 },
      
      // Mid Cap Tokens (moderate liquidity)
      'MAGIC': { address: '0x539bde0d4d63320772d99f2d1be671a7c23e7e4c', decimals: 18, category: 'midcap', minLiquidity: 1000 },
      'RDNT': { address: '0x230d620a2c47e252e6c3f75a94971f15bffb8e72', decimals: 18, category: 'midcap', minLiquidity: 800 },
      'IMX': { address: '0x3a4f40631a4f906c2bad353ed06de7a5d3fcb430', decimals: 18, category: 'midcap', minLiquidity: 600 },
      'APE': { address: '0x2d3bd680c6a1994e25fa22716b653e3d7a8c74dc', decimals: 18, category: 'midcap', minLiquidity: 400 },
      'AXS': { address: '0x2be31b290b855e80d4c61b2cd0b45b5e961483a5', decimals: 18, category: 'midcap', minLiquidity: 300 },
      'GRT': { address: '0x230d620a2c47e252e6c3f75a94971f15bffb8e72', decimals: 18, category: 'midcap', minLiquidity: 500 },
      '1INCH': { address: '0x5438107231c501f4929a5e2e3155e2665a9a8f7b', decimals: 18, category: 'midcap', minLiquidity: 400 },
      'YFI': { address: '0x92a4e761d63a5e554a252e735463e97a7a3db93a', decimals: 18, category: 'midcap', minLiquidity: 100 },
      'BAT': { address: '0x1fe622e247605caa74864bb598084a053d8db3e3', decimals: 18, category: 'midcap', minLiquidity: 200 },
      'MANA': { address: '0x3b484b82567a09e2588a13d54d032153f0c0aee0', decimals: 18, category: 'midcap', minLiquidity: 300 },
      'MATIC': { address: '0x6f14c025c4eb8cf9499c7dd3e82517a67c09c2cd', decimals: 18, category: 'midcap', minLiquidity: 800 },
      'ENS': { address: '0x3e97808d9ef9a7d7ed98312e3fe9f070b94269de', decimals: 18, category: 'midcap', minLiquidity: 150 },
      'UMA': { address: '0x07c654634b5d52a2f295a4911f8f1987a6e56a33', decimals: 18, category: 'midcap', minLiquidity: 100 },
      'PERP': { address: '0x67c597624b17b16fb7b6d89c9e87a83d3da07f1b', decimals: 18, category: 'midcap', minLiquidity: 200 },
      'RNDR': { address: '0xa45e36133a1e79d62f99e4f4c6c9e8e9f0a1b2c3', decimals: 18, category: 'midcap', minLiquidity: 150 },
      'ANKR': { address: '0xe05a08244e5c6e65edea2cce6a4ec8fd3ba915c4', decimals: 18, category: 'midcap', minLiquidity: 100 },
      'ETHFI': { address: '0x9a6ae5622990ba5ec98225a455c56f4d5a8a0b1c', decimals: 18, category: 'midcap', minLiquidity: 80 },
      'ZRO': { address: '0x957c9c64f7c2ce091e54af275d4ef8e72e434d5e', decimals: 18, category: 'midcap', minLiquidity: 50 },
      'ARKM': { address: '0x5c54e69e08849145065638863172a61a2b57497e', decimals: 18, category: 'midcap', minLiquidity: 60 },
      'ONDO': { address: '0x9f39e5a0a9a9b8c7d6e5f4c3b2a1908f7e6d5c4b', decimals: 18, category: 'midcap', minLiquidity: 40 },
      'SYN': { address: '0x9988843262134637195981eaaa8858da39236c3e', decimals: 18, category: 'midcap', minLiquidity: 70 },
      
      // Smaller Cap / Higher Risk
      'PEPE': { address: '0x7069e91f2e19f862c21453d753e70afeb1914318', decimals: 18, category: 'smallcap', minLiquidity: 50 },
      'TURBO': { address: '0x1a8e39ae59e5556b56b76fcba98d22c9ae557396', decimals: 18, category: 'smallcap', minLiquidity: 30 },
      'MOG': { address: '0x3c753b1a9e9a1e9e9f0a1b2c3d4e5f6a7b8c9d0e', decimals: 18, category: 'smallcap', minLiquidity: 20 },
      'MIM': { address: '0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a', decimals: 18, category: 'smallcap', minLiquidity: 40 },
      'SPELL': { address: '0x3e6648c5a70a150a88bce65f4ad4d506fe15d2af', decimals: 18, category: 'smallcap', minLiquidity: 30 },
      'ALPHA': { address: '0xc854e43631a66032b4a37b6c96d8a7fb8c5d6e9e', decimals: 18, category: 'smallcap', minLiquidity: 25 },
      'API3': { address: '0x43448ca009a397316b4e566e714eb8217e12e152', decimals: 18, category: 'smallcap', minLiquidity: 20 },
      'BICO': { address: '0x5f016b336c804d52a39e96f44b4f5e265a8a7f3d', decimals: 18, category: 'smallcap', minLiquidity: 15 },
      'COW': { address: '0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab', decimals: 18, category: 'smallcap', minLiquidity: 10 },
      'SD': { address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', decimals: 18, category: 'smallcap', minLiquidity: 8 },
      'AXL': { address: '0x8ff33111786bf5e56a56d603df6a8116b5a9174a', decimals: 18, category: 'smallcap', minLiquidity: 12 },
      'MORPHO': { address: '0x57a2f53c8f1d6e8e9f0a1b2c3d4e5f6a7b8c9d0e', decimals: 18, category: 'smallcap', minLiquidity: 10 },
    }
  },
  
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    
    // Your Polygon tokens
    tokens: {
      // Stablecoins
      'USDC': { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6, category: 'stable', minLiquidity: 30000 },
      'USDT': { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, category: 'stable', minLiquidity: 25000 },
      'DAI': { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, category: 'stable', minLiquidity: 15000 },
      'FRAX': { address: '0x45c32fA6DF82ead1e2EF74d17b76547EDdFfE206', decimals: 18, category: 'stable', minLiquidity: 3000 },
      'LUSD': { address: '0x93b346b6bc25483a79a3e517304e2b5c1de2e47c', decimals: 18, category: 'stable', minLiquidity: 1000 },
      'GUSD': { address: '0x62359Ed7505Efc61FF1D56fEF82158CcaffA23D7', decimals: 2, category: 'stable', minLiquidity: 500 },
      'BUSD': { address: '0xdAb529f40E671A1D4bF91361c21bf9f0C9712ab7', decimals: 18, category: 'stable', minLiquidity: 1000 },
      
      // Major Tokens
      'WETH': { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, category: 'major', minLiquidity: 5000 },
      'WBTC': { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, category: 'major', minLiquidity: 200 },
      'WMATIC': { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, category: 'major', minLiquidity: 10000 },
      
      // Major DeFi
      'AAVE': { address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b', decimals: 18, category: 'defi', minLiquidity: 800 },
      'LINK': { address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', decimals: 18, category: 'defi', minLiquidity: 1500 },
      'UNI': { address: '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784', decimals: 18, category: 'defi', minLiquidity: 800 },
      'CRV': { address: '0x172370d5Cd63279eFa6d502DAB29171933a610AF', decimals: 18, category: 'defi', minLiquidity: 600 },
      'SNX': { address: '0x50B728D8D964fd00C2d0AAD81718b71311feF68a', decimals: 18, category: 'defi', minLiquidity: 300 },
      'SUSHI': { address: '0x0b3F868E0BE5597D5DB7fB1f246656A3173BdD50', decimals: 18, category: 'defi', minLiquidity: 200 },
      'COMP': { address: '0x8505b9d2254a7ae468c0e9dd10ccea3a837aef5c', decimals: 18, category: 'defi', minLiquidity: 150 },
      'MKR': { address: '0x6f7C932e7684666C9fd1d445277654365bc1011c', decimals: 18, category: 'defi', minLiquidity: 100 },
      'BAL': { address: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3', decimals: 18, category: 'defi', minLiquidity: 80 },
      'FXS': { address: '0x3e121107F6F22Da4911079845a470733ACFe4CA5', decimals: 18, category: 'defi', minLiquidity: 60 },
      'LDO': { address: '0xC3C7d4228098520355d85941A481512E6b31E154', decimals: 18, category: 'defi', minLiquidity: 40 },
      'PENDLE': { address: '0x0C880f6761F1af8d9aA9C466984b80Dab9a8c9e8', decimals: 18, category: 'defi', minLiquidity: 30 },
      
      // Mid Cap
      'QUICK': { address: '0xB5C0642510a044dA1431547651885E2599891180', decimals: 18, category: 'midcap', minLiquidity: 50 },
      'GRT': { address: '0x5fe2B58c013d7601147DcdD68C143A77499f5531', decimals: 18, category: 'midcap', minLiquidity: 200 },
      '1INCH': { address: '0x111111111117dc0aa78b770fa6a738034120c302', decimals: 18, category: 'midcap', minLiquidity: 100 },
      'AXS': { address: '0x3323916121E777F8E923091B7e4781656c51CC39', decimals: 18, category: 'midcap', minLiquidity: 80 },
      'APE': { address: '0x4791396604512f8584f15bb54ef5e38b12e1b31a', decimals: 18, category: 'midcap', minLiquidity: 60 },
      'SAND': { address: '0x3E708Fdb6E7483814C99559E224D2c41a0538E00', decimals: 18, category: 'midcap', minLiquidity: 70 },
      'MANA': { address: '0xA1c57f48F0Deb89f569dFbe6E2B7f46D33606fD4', decimals: 18, category: 'midcap', minLiquidity: 90 },
      'IMX': { address: '0x607a9f2d98A1a5E43E44B1f19Ae962543b38C421', decimals: 18, category: 'midcap', minLiquidity: 40 },
      'RNDR': { address: '0x61299774020dA444Af8416062C8152f3Fc3fF201', decimals: 18, category: 'midcap', minLiquidity: 30 },
      'PERP': { address: '0x67c597624b17b16fb7b6d89c9e87a83d3da07f1b', decimals: 18, category: 'midcap', minLiquidity: 20 },
      
      // Smaller Cap
      'MIM': { address: '0x49a0421f7631145e138491c1e3C6631541182e91', decimals: 18, category: 'smallcap', minLiquidity: 15 },
      'GNO': { address: '0x5FFD62D3C3eE2E867574c26A2F7C14122aD33123', decimals: 18, category: 'smallcap', minLiquidity: 8 },
      'BNT': { address: '0x31f4904F6d16190DB594171b75908201f476AfF9', decimals: 18, category: 'smallcap', minLiquidity: 10 },
      'ENJ': { address: '0x2C78F1b70Cc349542c83269d9b3289e36d38261d', decimals: 18, category: 'smallcap', minLiquidity: 12 },
      'BAND': { address: '0x4136e91140a0e4C36D2C3189E91C1A128247117D', decimals: 18, category: 'smallcap', minLiquidity: 6 },
      'CTSI': { address: '0x6A6C605700f477E3848932a7c272432546421080', decimals: 18, category: 'smallcap', minLiquidity: 5 },
      'ALCX': { address: '0x765277eebeca2e31912c9946eae1021199b39c61', decimals: 18, category: 'smallcap', minLiquidity: 4 },
      'ALICE': { address: '0x3402a719021e1e8b1d14e6d78c2815419f1e37c1', decimals: 18, category: 'smallcap', minLiquidity: 3 },
      'AGLD': { address: '0x5592ec0cfb3d079665e877c5a623c1f78190fa36', decimals: 18, category: 'smallcap', minLiquidity: 2 },
      'ALPHA': { address: '0x2675609F6C2a62aE1BD2dB28B19d51331C212B5F', decimals: 18, category: 'smallcap', minLiquidity: 3 },
      'AMP': { address: '0xb99e247c1a39f7dcfd6e3b8fc9ab24eef7eb6e33', decimals: 18, category: 'smallcap', minLiquidity: 2 },
      'ANT': { address: '0x960b236A07cf122663c4303350609A66A7B288C0', decimals: 18, category: 'smallcap', minLiquidity: 1 },
      'ARPA': { address: '0x8F1E15bc8cA9215F6BA3428AE5249359d0252713', decimals: 18, category: 'smallcap', minLiquidity: 2 },
      'AUDIO': { address: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a', decimals: 18, category: 'smallcap', minLiquidity: 3 },
      'BICO': { address: '0x5f016b336c804d52a39e96f44b4f5e265a8a7f3d', decimals: 18, category: 'smallcap', minLiquidity: 2 },
      'BLZ': { address: '0x26c8AFBBFE1EBaca03C2bB082E69D0476Bffe099', decimals: 18, category: 'smallcap', minLiquidity: 1 },
      'ERN': { address: '0x1dF34a1A33b3911803b15B344CD1c18F5E923691', decimals: 18, category: 'smallcap', minLiquidity: 2 },
      'GTC': { address: '0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e', decimals: 18, category: 'smallcap', minLiquidity: 1 },
      'GYEN': { address: '0xB2987753D1561570913920401E43C5A4106B6161', decimals: 6, category: 'smallcap', minLiquidity: 0.5 },
      'HOPR': { address: '0xfE1C248349220150673F7d8929d2255d99F22d31', decimals: 18, category: 'smallcap', minLiquidity: 1 },
      'INDEX': { address: '0x72355A56D50831481d5e1ef3712359E025212024', decimals: 18, category: 'smallcap', minLiquidity: 0.8 },
      'JASMY': { address: '0x7B9C2f68F16c3613e8b6c93Ef67d37E5d8c0A944', decimals: 18, category: 'smallcap', minLiquidity: 1 },
      'LOKA': { address: '0x5a33492d5db4474e72c6b3e61266a7f2a01e5f2a', decimals: 18, category: 'smallcap', minLiquidity: 0.5 },
      'LRC': { address: '0x24D39324C3693956463d28cB23431964D515D3a5', decimals: 18, category: 'smallcap', minLiquidity: 0.7 },
    }
  }
};

// ====================== SCANNER CONFIGURATION ======================
const SCANNER_CONFIG = {
  // Path generation strategies
  strategies: {
    stable: {
      description: 'Stablecoin triangles only',
      categories: ['stable'],
      minLiquidity: 10000,
      feePriority: [500, 3000], // Prefer 0.05% and 0.3% pools
      maxPaths: 10
    },
    defi: {
      description: 'DeFi token triangles',
      categories: ['stable', 'major', 'defi'],
      minLiquidity: 1000,
      feePriority: [3000, 500, 10000],
      maxPaths: 15
    },
    aggressive: {
      description: 'All token combinations',
      categories: ['stable', 'major', 'defi', 'midcap'],
      minLiquidity: 100,
      feePriority: [3000, 10000, 500],
      maxPaths: 20
    },
    test: {
      description: 'Quick test with top tokens',
      categories: ['stable', 'major'],
      minLiquidity: 5000,
      feePriority: [3000],
      maxPaths: 5
    }
  },
  
  // Uniswap V3 fee tiers
  feeTiers: {
    500: { label: '0.05%', tickSpacing: 10 },
    3000: { label: '0.3%', tickSpacing: 60 },
    10000: { label: '1%', tickSpacing: 200 }
  },
  
  // Gas estimates (in gas units)
  gasEstimates: {
    quoteCall: 80000,
    swapExactInputSingle: 150000,
    multicallOverhead: 50000,
    flashLoanFee: 300000
  },
  
  // Scanner limits
  maxRpcRetries: 2,
  rpcRetryDelay: 100,
  poolCacheTtl: 300000, // 5 minutes
  gasCacheTtl: 15000,   // 15 seconds
};

// ====================== SMART CONTRACT ABIs ======================
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

const POOL_ABI = [
  'function liquidity() external view returns (uint128)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
];

// ====================== INITIALIZATION ======================
const providers = {};
const quoters = {};
const factories = {};
const caches = {
  pools: new Map(),
  gasPrices: { lastUpdate: 0, data: null }
};

for (const [network, config] of Object.entries(NETWORKS)) {
  providers[network] = new ethers.JsonRpcProvider(config.rpc, config.chainId, {
    staticNetwork: true,
    batchMaxCount: 1
  });
  
  quoters[network] = new ethers.Contract(
    config.quoter,
    QUOTER_ABI,
    providers[network]
  );
  
  factories[network] = new ethers.Contract(
    config.factory,
    FACTORY_ABI,
    providers[network]
  );
}

// ====================== CORE FUNCTIONS ======================

/**
 * Get tokens by category for a network
 */
function getTokensByCategory(network, categories) {
  const tokens = NETWORKS[network].tokens;
  const filtered = {};
  
  for (const [symbol, data] of Object.entries(tokens)) {
    if (categories.includes(data.category)) {
      filtered[symbol] = data;
    }
  }
  
  return filtered;
}

/**
 * Generate optimized paths based on strategy
 */
function generateOptimizedPaths(network, strategy = 'defi') {
  const config = SCANNER_CONFIG.strategies[strategy] || SCANNER_CONFIG.strategies.defi;
  const tokens = getTokensByCategory(network, config.categories);
  const tokenSymbols = Object.keys(tokens);
  
  const paths = [];
  
  if (strategy === 'stable') {
    // Generate all stablecoin triangles
    const stables = tokenSymbols.filter(s => tokens[s].category === 'stable');
    for (let i = 0; i < stables.length; i++) {
      for (let j = 0; j < stables.length; j++) {
        for (let k = 0; k < stables.length; k++) {
          if (i !== j && j !== k && i !== k) {
            paths.push([stables[i], stables[j], stables[k]]);
          }
        }
      }
    }
  } else if (strategy === 'defi') {
    // DeFi strategy: stable -> major/defi -> stable
    const stables = tokenSymbols.filter(s => tokens[s].category === 'stable');
    const defiTokens = tokenSymbols.filter(s => 
      ['major', 'defi'].includes(tokens[s].category)
    );
    
    for (const stable of stables.slice(0, 3)) {
      for (const defi1 of defiTokens.slice(0, 5)) {
        for (const defi2 of defiTokens.slice(0, 5)) {
          if (defi1 !== defi2 && defi1 !== stable && defi2 !== stable) {
            paths.push([stable, defi1, defi2]);
          }
        }
      }
    }
  } else {
    // Aggressive strategy: mix of all categories
    const priorityTokens = tokenSymbols.filter(s => 
      tokens[s].category === 'stable' || tokens[s].category === 'major'
    );
    
    for (let i = 0; i < Math.min(priorityTokens.length, 4); i++) {
      for (let j = 0; j < Math.min(tokenSymbols.length, 6); j++) {
        for (let k = 0; k < Math.min(tokenSymbols.length, 6); k++) {
          const t1 = priorityTokens[i];
          const t2 = tokenSymbols[j];
          const t3 = tokenSymbols[k];
          
          if (t1 !== t2 && t2 !== t3 && t1 !== t3) {
            paths.push([t1, t2, t3]);
          }
        }
      }
    }
  }
  
  // Remove duplicates and limit
  const uniquePaths = [];
  const seen = new Set();
  
  for (const path of paths) {
    const key = path.sort().join('-');
    if (!seen.has(key)) {
      seen.add(key);
      uniquePaths.push(path);
    }
    if (uniquePaths.length >= config.maxPaths) break;
  }
  
  return uniquePaths;
}

/**
 * Get optimal fee tiers for a token pair
 */
function getOptimalFeeTiers(tokenA, tokenB, strategy = 'defi') {
  const config = SCANNER_CONFIG.strategies[strategy];
  const isStablePair = (
    (NETWORKS.arbitrum.tokens[tokenA]?.category === 'stable' || 
     NETWORKS.polygon.tokens[tokenA]?.category === 'stable') &&
    (NETWORKS.arbitrum.tokens[tokenB]?.category === 'stable' ||
     NETWORKS.polygon.tokens[tokenB]?.category === 'stable')
  );
  
  if (isStablePair) {
    return [500, 3000]; // Stables in 0.05% or 0.3% pools
  }
  
  return config.feePriority || [3000, 500, 10000];
}

/**
 * Check if pool exists and has sufficient liquidity
 */
async function validatePool(network, tokenA, tokenB, fee) {
  const cacheKey = `${network}:${tokenA}:${tokenB}:${fee}`;
  
  if (caches.pools.has(cacheKey)) {
    const cached = caches.pools.get(cacheKey);
    if (Date.now() - cached.timestamp < SCANNER_CONFIG.poolCacheTtl) {
      return cached.data;
    }
  }
  
  try {
    const tokenAAddr = NETWORKS[network].tokens[tokenA]?.address;
    const tokenBAddr = NETWORKS[network].tokens[tokenB]?.address;
    
    if (!tokenAAddr || !tokenBAddr) {
      return null;
    }
    
    const poolAddress = await factories[network].getPool(tokenAAddr, tokenBAddr, fee);
    
    if (poolAddress === ethers.ZeroAddress) {
      caches.pools.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }
    
    const pool = new ethers.Contract(poolAddress, POOL_ABI, providers[network]);
    const liquidity = await pool.liquidity();
    
    const minLiquidity = Math.min(
      NETWORKS[network].tokens[tokenA]?.minLiquidity || 100,
      NETWORKS[network].tokens[tokenB]?.minLiquidity || 100
    );
    
    const liquidityInToken = Number(ethers.formatUnits(liquidity, 18));
    
    if (liquidityInToken < minLiquidity) {
      caches.pools.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }
    
    const result = { address: poolAddress, liquidity: liquidityInToken };
    caches.pools.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
    
  } catch (error) {
    console.error(`Pool validation error: ${error.message}`);
    return null;
  }
}

/**
 * Get price quote with retry logic
 */
async function getQuote(network, tokenIn, tokenOut, amountIn, fee, retries = SCANNER_CONFIG.maxRpcRetries) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const tokenInData = NETWORKS[network].tokens[tokenIn];
      const tokenOutData = NETWORKS[network].tokens[tokenOut];
      
      if (!tokenInData || !tokenOutData) {
        return null;
      }
      
      const amountInWei = ethers.parseUnits(amountIn.toString(), tokenInData.decimals);
      
      const amountOut = await quoters[network].quoteExactInputSingle.staticCall(
        tokenInData.address,
        tokenOutData.address,
        fee,
        amountInWei,
        0
      );
      
      return parseFloat(ethers.formatUnits(amountOut, tokenOutData.decimals));
      
    } catch (error) {
      if (attempt === retries) {
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, SCANNER_CONFIG.rpcRetryDelay * (attempt + 1)));
    }
  }
  return null;
}

/**
 * Get current gas price
 */
async function getGasPrice(network) {
  const now = Date.now();
  if (caches.gasPrices.data && now - caches.gasPrices.lastUpdate < SCANNER_CONFIG.gasCacheTtl) {
    return caches.gasPrices.data;
  }
  
  try {
    const feeData = await providers[network].getFeeData();
    const gasPrice = {
      maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('30', 'gwei'),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei'),
      lastBlock: await providers[network].getBlockNumber()
    };
    
    caches.gasPrices.data = gasPrice;
    caches.gasPrices.lastUpdate = now;
    return gasPrice;
  } catch (error) {
    return {
      maxFeePerGas: ethers.parseUnits('30', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
      lastBlock: 0
    };
  }
}

/**
 * Calculate gas cost for triangular arbitrage
 */
async function calculateGasCost(network, fees) {
  try {
    const gasPrice = await getGasPrice(network);
    
    let totalGas = 0;
    fees.forEach(fee => {
      totalGas += SCANNER_CONFIG.gasEstimates.swapExactInputSingle;
    });
    totalGas += SCANNER_CONFIG.gasEstimates.multicallOverhead;
    
    const gasCostWei = gasPrice.maxFeePerGas * BigInt(Math.ceil(totalGas));
    return parseFloat(ethers.formatUnits(gasCostWei, 18));
  } catch (error) {
    return 0.001; // Conservative default
  }
}

/**
 * Convert gas cost to token value
 */
async function convertGasToToken(network, gasCostEth, tokenSymbol) {
  try {
    if (tokenSymbol === 'WETH') return gasCostEth;
    
    const tokenPerEth = await getQuote(network, 'WETH', tokenSymbol, 1, 3000);
    if (!tokenPerEth) return gasCostEth;
    
    return gasCostEth * tokenPerEth;
  } catch (error) {
    return gasCostEth;
  }
}

/**
 * Calculate price impact for a swap
 */
async function calculatePriceImpact(network, tokenIn, tokenOut, amountIn, fee) {
  try {
    const smallAmount = amountIn * 0.001;
    const quoteSmall = await getQuote(network, tokenIn, tokenOut, smallAmount, fee);
    if (!quoteSmall) return Infinity;
    
    const quoteActual = await getQuote(network, tokenIn, tokenOut, amountIn, fee);
    if (!quoteActual) return Infinity;
    
    const effectivePriceSmall = quoteSmall / smallAmount;
    const effectivePriceActual = quoteActual / amountIn;
    const priceImpact = ((effectivePriceSmall - effectivePriceActual) / effectivePriceSmall) * 100;
    
    return Math.max(0, priceImpact);
  } catch (error) {
    return Infinity;
  }
}

/**
 * Main arbitrage calculation function
 */
async function calculateArbitrageOpportunity(network, path, amountIn, strategy = 'defi') {
  const [tokenA, tokenB, tokenC] = path;
  
  const feeTiers1 = getOptimalFeeTiers(tokenA, tokenB, strategy);
  const feeTiers2 = getOptimalFeeTiers(tokenB, tokenC, strategy);
  const feeTiers3 = getOptimalFeeTiers(tokenC, tokenA, strategy);
  
  let bestResult = null;
  let bestNetProfit = -Infinity;
  
  // Limit fee combinations to reduce RPC calls
  const maxFees = strategy === 'stable' ? 2 : 1;
  
  for (const fee1 of feeTiers1.slice(0, maxFees)) {
    const pool1 = await validatePool(network, tokenA, tokenB, fee1);
    if (!pool1) continue;
    
    const impact1 = await calculatePriceImpact(network, tokenA, tokenB, amountIn, fee1);
    if (impact1 > 2.0) continue;
    
    const amountB = await getQuote(network, tokenA, tokenB, amountIn, fee1);
    if (!amountB || amountB <= 0) continue;
    
    for (const fee2 of feeTiers2.slice(0, maxFees)) {
      const pool2 = await validatePool(network, tokenB, tokenC, fee2);
      if (!pool2) continue;
      
      const impact2 = await calculatePriceImpact(network, tokenB, tokenC, amountB, fee2);
      if (impact2 > 2.0) continue;
      
      const amountC = await getQuote(network, tokenB, tokenC, amountB, fee2);
      if (!amountC || amountC <= 0) continue;
      
      for (const fee3 of feeTiers3.slice(0, maxFees)) {
        const pool3 = await validatePool(network, tokenC, tokenA, fee3);
        if (!pool3) continue;
        
        const impact3 = await calculatePriceImpact(network, tokenC, tokenA, amountC, fee3);
        if (impact3 > 2.0) continue;
        
        const amountFinal = await getQuote(network, tokenC, tokenA, amountC, fee3);
        if (!amountFinal || amountFinal <= 0) continue;
        
        // Calculate profits
        const grossProfit = amountFinal - amountIn;
        const grossProfitPercent = (grossProfit / amountIn) * 100;
        
        // Calculate gas costs
        const gasCostEth = await calculateGasCost(network, [fee1, fee2, fee3]);
        const gasCostTokenA = await convertGasToToken(network, gasCostEth, tokenA);
        
        const netProfit = grossProfit - gasCostTokenA;
        const netProfitPercent = (netProfit / amountIn) * 100;
        
        if (netProfitPercent > bestNetProfit) {
          bestNetProfit = netProfitPercent;
          bestResult = {
            path: `${tokenA} → ${tokenB} → ${tokenC} → ${tokenA}`,
            inputAmount: amountIn,
            outputAmount: amountFinal,
            grossProfit,
            grossProfitPercent,
            netProfit,
            netProfitPercent,
            gasCostTokenA,
            fees: [fee1, fee2, fee3],
            feeLabels: [
              SCANNER_CONFIG.feeTiers[fee1].label,
              SCANNER_CONFIG.feeTiers[fee2].label,
              SCANNER_CONFIG.feeTiers[fee3].label
            ],
            poolAddresses: [pool1.address, pool2.address, pool3.address],
            priceImpacts: [impact1, impact2, impact3],
            network,
            strategy,
            timestamp: new Date().toISOString(),
            confidence: calculateConfidenceScore(grossProfitPercent, netProfitPercent, [impact1, impact2, impact3])
          };
        }
      }
    }
  }
  
  return bestResult;
}

/**
 * Calculate confidence score for opportunity
 */
function calculateConfidenceScore(grossProfit, netProfit, impacts) {
  let score = 0;
  
  // Net to gross ratio (0-40 points)
  if (netProfit > 0 && grossProfit > 0) {
    score += Math.min(40, (netProfit / grossProfit) * 40);
  }
  
  // Price impact (0-30 points)
  const maxImpact = Math.max(...impacts);
  if (maxImpact < 0.5) score += 30;
  else if (maxImpact < 1.0) score += 20;
  else if (maxImpact < 1.5) score += 10;
  
  // Gross profit magnitude (0-30 points)
  if (grossProfit > 1.0) score += 30;
  else if (grossProfit > 0.5) score += 20;
  else if (grossProfit > 0.2) score += 10;
  else if (grossProfit > 0.1) score += 5;
  
  return Math.min(100, Math.round(score));
}

// ====================== API ENDPOINTS ======================

app.get('/health', async (req, res) => {
  try {
    const networks = {};
    for (const [name, config] of Object.entries(NETWORKS)) {
      const block = await providers[name].getBlockNumber();
      networks[name] = {
        connected: true,
        block,
        tokens: Object.keys(config.tokens).length,
        categories: [...new Set(Object.values(config.tokens).map(t => t.category))]
      };
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      networks,
      strategies: Object.keys(SCANNER_CONFIG.strategies),
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

app.post('/scan', async (req, res) => {
  const { 
    network = 'arbitrum', 
    amount = 1000, 
    strategy = 'defi',
    minNetProfit = 0.3,
    maxPaths = null
  } = req.body;
  
  if (!NETWORKS[network]) {
    return res.status(400).json({ error: `Network ${network} not supported` });
  }
  
  if (!SCANNER_CONFIG.strategies[strategy]) {
    return res.status(400).json({ 
      error: `Invalid strategy. Choose from: ${Object.keys(SCANNER_CONFIG.strategies).join(', ')}` 
    });
  }
  
  try {
    console.log(`Starting ${strategy} scan on ${network} with $${amount}...`);
    
    const strategyConfig = SCANNER_CONFIG.strategies[strategy];
    const paths = generateOptimizedPaths(network, strategy);
    const limit = maxPaths || strategyConfig.maxPaths;
    
    const opportunities = [];
    const startTime = Date.now();
    
    for (let i = 0; i < Math.min(paths.length, limit); i++) {
      const path = paths[i];
      console.log(`Scanning path ${i + 1}/${limit}: ${path.join(' → ')}`);
      
      const result = await calculateArbitrageOpportunity(network, path, amount, strategy);
      
      if (result && result.netProfitPercent >= minNetProfit) {
        opportunities.push(result);
        console.log(`✓ Found: ${result.netProfitPercent.toFixed(3)}% profit`);
      }
      
      // Rate limiting for public RPCs
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const scanTime = Date.now() - startTime;
    
    // Sort by net profit
    opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);
    
    res.json({
      success: true,
      scan: {
        network,
        strategy,
        amount,
        minNetProfit,
        pathsScanned: Math.min(paths.length, limit),
        scanTimeMs: scanTime,
        opportunitiesFound: opportunities.length
      },
      opportunities: opportunities.slice(0, 10),
      summary: {
        bestNetProfit: opportunities[0]?.netProfitPercent || 0,
        bestGrossProfit: opportunities[0]?.grossProfitPercent || 0,
        estimatedGasCost: opportunities[0]?.gasCostTokenA || 0,
        averageConfidence: opportunities.length > 0 
          ? Math.round(opportunities.reduce((sum, opp) => sum + opp.confidence, 0) / opportunities.length)
          : 0,
        recommendation: opportunities.length > 0
          ? `Found ${opportunities.length} opportunities. Execute within 30 seconds.`
          : 'No profitable opportunities found. Try different strategy or amount.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        gasPrice: await getGasPrice(network).then(gp => 
          ethers.formatUnits(gp.maxFeePerGas, 'gwei')
        )
      }
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
      error: error.message,
      tip: 'Try reducing amount or using a simpler strategy'
    });
  }
});

app.get('/tokens/:network', (req, res) => {
  const { network } = req.params;
  
  if (!NETWORKS[network]) {
    return res.status(400).json({ error: 'Network not found' });
  }
  
  const tokens = NETWORKS[network].tokens;
  const byCategory = {};
  
  for (const [symbol, data] of Object.entries(tokens)) {
    if (!byCategory[data.category]) {
      byCategory[data.category] = [];
    }
    byCategory[data.category].push({
      symbol,
      address: data.address,
      decimals: data.decimals,
      minLiquidity: data.minLiquidity
    });
  }
  
  res.json({
    network,
    totalTokens: Object.keys(tokens).length,
    categories: byCategory
  });
});

app.post('/analyze-path', async (req, res) => {
  const { network, path, amount = 1000, fees = [3000, 3000, 3000] } = req.body;
  
  if (!NETWORKS[network]) {
    return res.status(400).json({ error: 'Network not supported' });
  }
  
  if (!Array.isArray(path) || path.length !== 3) {
    return res.status(400).json({ error: 'Path must be array of 3 token symbols' });
  }
  
  const [tokenA, tokenB, tokenC] = path;
  
  try {
    // Validate all tokens exist
    for (const token of path) {
      if (!NETWORKS[network].tokens[token]) {
        return res.status(400).json({ error: `Token ${token} not found on ${network}` });
      }
    }
    
    // Get quotes
    const amountB = await getQuote(network, tokenA, tokenB, amount, fees[0]);
    if (!amountB) throw new Error(`No liquidity for ${tokenA} → ${tokenB}`);
    
    const amountC = await getQuote(network, tokenB, tokenC, amountB, fees[1]);
    if (!amountC) throw new Error(`No liquidity for ${tokenB} → ${tokenC}`);
    
    const amountFinal = await getQuote(network, tokenC, tokenA, amountC, fees[2]);
    if (!amountFinal) throw new Error(`No liquidity for ${tokenC} → ${tokenA}`);
    
    // Calculate profits
    const grossProfit = amountFinal - amount;
    const grossProfitPercent = (grossProfit / amount) * 100;
    
    // Calculate gas
    const gasCostEth = await calculateGasCost(network, fees);
    const gasCostTokenA = await convertGasToToken(network, gasCostEth, tokenA);
    
    const netProfit = grossProfit - gasCostTokenA;
    const netProfitPercent = (netProfit / amount) * 100;
    
    res.json({
      analysis: {
        path: `${tokenA} → ${tokenB} → ${tokenC} → ${tokenA}`,
        steps: [
          { from: tokenA, to: tokenB, amountIn: amount, amountOut: amountB, fee: fees[0] },
          { from: tokenB, to: tokenC, amountIn: amountB, amountOut: amountC, fee: fees[1] },
          { from: tokenC, to: tokenA, amountIn: amountC, amountOut: amountFinal, fee: fees[2] }
        ],
        summary: {
          inputAmount: amount,
          outputAmount: amountFinal,
          grossProfit,
          grossProfitPercent,
          gasCostTokenA,
          netProfit,
          netProfitPercent,
          profitable: netProfit > 0
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================== SERVER START ======================

// Serve static files from 'public' directory (ADD THIS)
app.use(express.static(path.join(__dirname, 'public')));

// Send index.html for all other routes (ADD THIS)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Your existing app.listen() line stays here
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Uniswap V3 Arbitrage Scanner`);
  console.log(`Version 2.0 - With Token Optimization`);
  console.log(`Port: ${PORT}`);
  console.log(`=========================================`);
  console.log(`Networks:`);
  for (const [network, config] of Object.entries(NETWORKS)) {
    console.log(`  ${network}: ${Object.keys(config.tokens).length} tokens`);
  }
  console.log(`=========================================`);
  console.log(`Strategies:`);
  for (const [strategy, config] of Object.entries(SCANNER_CONFIG.strategies)) {
    console.log(`  ${strategy}: ${config.description}`);
  }
  console.log(`=========================================`);
  console.log(`API Endpoints:`);
  console.log(`  POST /scan - Main scanning endpoint`);
  console.log(`  POST /analyze-path - Analyze specific path`);
  console.log(`  GET /tokens/:network - List tokens by network`);
  console.log(`  GET /health - Health check`);
  console.log(`=========================================`);
});
