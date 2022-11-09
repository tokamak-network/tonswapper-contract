// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  let tonSwapperLogic;
  let tonSwapperProxy;

  //mainnet Address
  let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
  let wtonAddress = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
  let tosAddress = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153";
  let uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  const tonSwapperFactory = await hre.ethers.getContractFactory("SwapperV2");
  tonSwapperLogic = await tonSwapperFactory.deploy();
  await tonSwapperLogic.deployed();
  console.log("swapperV2 deployed : ", tonSwapperLogic.address);

  const tonSwapProxy = await hre.ethers.getContractFactory("SwapperProxy");
  tonSwapperProxy = await tonSwapProxy.deploy();
  await tonSwapperProxy.deployed();
  console.log("swapperProxy deployed : ", tonSwapperProxy.address);

  await tonSwapperProxy.upgradeTo(tonSwapperLogic.address);
  console.log("upgrade logic");

  await tonSwapperProxy.initialize(
    wtonAddress,
    tonAddress,
    tosAddress,
    uniswapRouter,
    wethAddress
  )
  console.log("initialize end");
  
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

