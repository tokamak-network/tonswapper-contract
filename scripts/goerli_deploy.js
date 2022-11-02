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

  //goerli Address
  let wtonAddress = "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6";
  let tonAddress = "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00";
  let tosAddress = "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9";
  let uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  let wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

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

