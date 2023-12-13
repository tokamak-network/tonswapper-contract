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

  //sepolia Address
  let tonAddress = "0xa30fe40285b8f5c0457dbc3b7c8a280373c40044";
  let wtonAddress = "0x79e0d92670106c85e9067b56b8f674340dca0bbd";
  let tosAddress = "0xff3ef745d9878afe5934ff0b130868afddbc58e8";
  let uniswapRouter = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
  let wethAddress = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

  const tonSwapperFactory = await hre.ethers.getContractFactory("SwapperV2");
  tonSwapperLogic = await tonSwapperFactory.deploy(
  );
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

