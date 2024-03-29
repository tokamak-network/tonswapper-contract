const { ethers } = require("hardhat");

const uniswapInfo = {
  poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
  wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
  wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
  tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
  wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
  tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  fee: ethers.BigNumber.from("3000"),
  NonfungibleTokenPositionDescriptor:
    "0x91ae842A5Ffd8d12023116943e72A606179294f3",
  UniswapV3Staker: "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65",
  ton: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
  lockTOSaddr: "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79",
  Quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  aura: "0xaEC59E5b4f8DbF513e260500eA96EbA173F74149",
  lyda: "0xE1B0630D7649CdF503eABc2b6423227Be9605247",
};

module.exports = {
  uniswapInfo,
};
