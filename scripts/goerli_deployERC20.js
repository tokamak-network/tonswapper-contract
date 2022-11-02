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
//   let ERC20Mock;
  let ERC20MockContract;

  //name, symbol
  let auraName = "AURA"
  let auraSymbol = "AURA"
  let docName = "Dooropen"
  let docSymbol = "DOC"
  let lydaName = "LYDA"
  let lydaSymbol = "LYDA"

  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  ERC20MockContract = await ERC20Mock.deploy(lydaName,lydaSymbol);
  await ERC20MockContract.deployed();
  console.log("ERC20Mock deployed : ", ERC20MockContract.address);
  
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

