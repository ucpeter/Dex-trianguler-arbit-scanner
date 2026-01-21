// server.js - Deploy this on Render
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

const NETWORKS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    tokens: {
      'WETH': { address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', decimals: 18 },
      'USDC': { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', decimals: 6 },
      'USDT': { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', decimals: 6 },
      'ARB': { address: '0x912ce59144191c1204e64559fe8253a0e49e6548', decimals: 18 },
      'LINK': { address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4', decimals: 18 },
      'UNI': { address: '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0', decimals: 18 },
      'WBTC': { address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', decimals: 8 },
      'DAI': { address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', decimals: 18 },
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    tokens: {
      'WETH': { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
      'USDC': { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
      'USDT': { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      'WMATIC': { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18 },
      'LINK': { address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', decimals: 18 },
      'UNI': { address: '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784', decimals: 18 },
      'WBTC': { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8 },
      'DAI': { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
    }
  }
};

const POOL_FEES = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// Uniswap V3 Quoter ABI (only the function we need)
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

// Initialize providers
const providers = {
  arbitrum: new ethers.JsonRpcProvider(NETWORKS.arbitrum.rpc),
  polygon: new ethers.JsonRpcProvider(NETWORKS.polygon.rpc)
};

// Get quoter contract
function getQuoter(network) {
  return new ethers.Contract(
    NETWORKS[network].quoter,
    QUOTER_ABI,
    providers[network]
  );
}

// Get quote for a single swap
async function getQuote(network, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = getQuoter(network);
    const tokenInData = NETWORKS[network].tokens[tokenIn];
    const tokenOutData = NETWORKS[network].tokens[tokenOut];
    
    // Convert amount to proper decimals
    const amountInWei = ethers.parseUnits(amountIn.toString(), tokenInData.decimals);
    
    // Call quoter (use static call to avoid gas cost)
    const amountOut = await quoter.quoteExactInputSingle.staticCall(
      tokenInData.address,
      tokenOutData.address,
      fee,
      amountInWei,
      0 // sqrtPriceLimitX96 = 0 means no limit
    );
    
    // Convert back to decimal
    return parseFloat(ethers.formatUnits(amountOut, tokenOutData.decimals));
  } catch (error) {
    // Pool might not exist or insufficient liquidity
    return null;
  }
}

// Calculate triangular arbitrage
async function calculateArbitrage(network, path, amount) {
  const [tokenA, tokenB, tokenC] = path;
  
  try {
    // Try different fee combinations
    let bestProfit = -Infinity;
    let bestResult = null;
    
    for (const fee1 of POOL_FEES) {
      for (const fee2 of POOL_FEES) {
        for (const fee3 of POOL_FEES) {
          // Swap 1: A -> B
          const amountB = await getQuote(network, tokenA, tokenB, amount, fee1);
          if (!amountB) continue;
          
          // Swap 2: B -> C
          const amountC = await getQuote(network, tokenB, tokenC, amountB, fee2);
          if (!amountC) continue;
          
          // Swap 3: C -> A
          const amountFinal = await getQuote(network, tokenC, tokenA, amountC, fee3);
          if (!amountFinal) continue;
          
          const profit = amountFinal - amount;
          const profitPercent = (profit / amount) * 100;
          
          if (profitPercent > bestProfit) {
            bestProfit = profitPercent;
            bestResult = {
              path: `${tokenA} → ${tokenB} → ${tokenC} → ${tokenA}`,
              inputAmount: amount,
              outputAmount: amountFinal,
              profit: profit,
              profitPercent: profitPercent,
              fees: [fee1, fee2, fee3],
              network: network,
              pathArray: [tokenA, tokenB, tokenC],
              addresses: [
                NETWORKS[network].tokens[tokenA].address,
                NETWORKS[network].tokens[tokenB].address,
                NETWORKS[network].tokens[tokenC].address
              ],
              timestamp: new Date().toISOString()
            };
          }
        }
      }
    }
    
    return bestResult;
  } catch (error) {
    console.error(`Error calculating arbitrage for ${path.join('-')}:`, error.message);
    return null;
  }
}

// Generate triangular paths
function generatePaths(network) {
  const tokens = Object.keys(NETWORKS[network].tokens);
  const paths = [];
  
  // Focus on paths with stablecoins/major assets as base
  const priorityTokens = ['USDC', 'USDT', 'DAI', 'WETH', 'WBTC'];
  const baseTokens = tokens.filter(t => priorityTokens.includes(t));
  
  for (const base of baseTokens) {
    for (const token1 of tokens) {
      if (token1 === base) continue;
      for (const token2 of tokens) {
        if (token2 === base || token2 === token1) continue;
        paths.push([base, token1, token2]);
      }
    }
  }
  
  return paths;
}

// API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/scan', async (req, res) => {
  const { network, amount, minProfit, maxPaths } = req.body;
  
  if (!NETWORKS[network]) {
    return res.status(400).json({ error: 'Invalid network' });
  }
  
  try {
    const paths = generatePaths(network);
    const opportunities = [];
    const limit = Math.min(maxPaths || 20, paths.length);
    
    console.log(`Scanning ${limit} paths on ${network}...`);
    
    for (let i = 0; i < limit; i++) {
      const result = await calculateArbitrage(network, paths[i], amount);
      
      if (result && result.profitPercent >= minProfit) {
        opportunities.push(result);
        console.log(`Found opportunity: ${result.path} - ${result.profitPercent.toFixed(3)}%`);
      }
      
      // Progress update every 5 paths
      if ((i + 1) % 5 === 0) {
        console.log(`Progress: ${i + 1}/${limit} paths scanned`);
      }
    }
    
    // Sort by profit
    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
    
    res.json({
      success: true,
      network,
      scanned: limit,
      opportunities: opportunities.slice(0, 10),
      stats: {
        total: opportunities.length,
        bestProfit: opportunities[0]?.profitPercent || 0
      }
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates (optional)
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('startScan', async (config) => {
    const { network, amount, minProfit } = config;
    
    // Continuous scanning
    const scanInterval = setInterval(async () => {
      const paths = generatePaths(network).slice(0, 10);
      
      for (const path of paths) {
        const result = await calculateArbitrage(network, path, amount);
        
        if (result && result.profitPercent >= minProfit) {
          socket.emit('opportunity', result);
        }
      }
    }, 10000); // Scan every 10 seconds
    
    socket.on('disconnect', () => {
      clearInterval(scanInterval);
      console.log('Client disconnected');
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Arbitrage scanner running on port ${PORT}`);
  console.log(`Networks: ${Object.keys(NETWORKS).join(', ')}`);
});
