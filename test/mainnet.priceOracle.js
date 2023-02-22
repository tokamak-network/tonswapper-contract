const { ethers } = require('ethers')
const JSBI = require('jsbi'); //jsbi@3.2.5
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const { TickMath, FullMath } = require('@uniswap/v3-sdk')

require('dotenv').config()

const POOL_ADDRESS = ''
const TOKEN0 = ''
const TOKEN1 = ''
const INFURA_URL_MAINNET = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_MAINNET)
const poolContract = new ethers.Contract(
    POOL_ADDRESS,
    IUniswapV3PoolABI,
    provider
)

async function main(pool, seconds) {
    const secondsAgo = [seconds, 0]

    const observeData = await pool.observe(secondsAgo)
    const tickCumulatives = observeData.tickCumulatives.map(v => Number(v))

    const tickCumulativesDelta = tickCumulatives[1] = tickCumulatives[0]

    const arithmeticMeanTick = (tickCumulativesDelta / secondsAgo[0]).toFixed(0)

}

main(poolContract, 100)