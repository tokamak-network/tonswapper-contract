const { ethers } = require("hardhat");

const uniswapInfo = {
  poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  wethUsdcPool: "",
  wtonWethPool: "",
  wtonTosPool: "",
  tosethPool: "",
  wton: "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6",
  tos: "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9",
  weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  fee: ethers.BigNumber.from("3000"),
  NonfungibleTokenPositionDescriptor:
    "0x91ae842A5Ffd8d12023116943e72A606179294f3",
  UniswapV3Staker: "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65",
  ton: "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00",
  lockTOSaddr: "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79",
  Quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  aura: "0x80Eea029B5Cdb8A215Ae78e20B4fF81607F44A38",
  lyda: "0x51C5E2D3dc8Ee66Dffdb1747dEB20d6b326E8bF2",
  doc: "0x020A7c41212057B2A880191c07F7c7C7a71a8b57"
};

module.exports = {
  uniswapInfo,
};
