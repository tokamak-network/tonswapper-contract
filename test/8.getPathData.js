const hre = require("hardhat");
const { ethers } = require("hardhat");
const { uniswapInfo } = require("./goerli_info");
const { FeeAmount, encodePath } = require("./utils");
const Web3EthAbi = require("web3-eth-abi");
const { padLeft, keccak256 } = require("web3-utils");

const { marshalString, unmarshalString } = require('./marshal');


let accounts, provider, admin1;
let swapperV2, swapperV2Logic, swapperV2Proxy, quoter, tonContract, wtonContract, tosContract;
let auraContract, lydaContract;

const TOS_ABI = require("../abis/TOS.json");
const TON_ABI = require("../abis/TON.json");
const WTON_ABI = require("../abis/WTON.json");
const QuoterABI = require("../abis/Quoter.json");
// const SWAP_ABI = require("../artifacts/contracts/Swapper.sol/Swapper.json");
const SWAP2_ABI = require("../artifacts/contracts/SwapperV2.sol/SwapperV2.json");

const { expect } = require("chai");

function getExactInputParams(recipient, path, amountIn, amountOut) {
  return {
    recipient: recipient,
    path: path,
    amountIn: amountIn,
    amountOutMinimum: amountOut,
    deadline: 0,
  };
}

function getExactOutputParams(recipient, path, amountInMaximum, amountOut) {
  return {
    recipient: recipient,
    path: path,
    amountOut: amountOut,
    amountInMaximum: amountInMaximum,
    deadline: 0,
  };
}

async function quoteExactInputSingle(
  quoteContract,
  tokenIn,
  tokenOut,
  fee,
  amountIn
) {
  const amountOut = await quoteContract.callStatic.quoteExactInputSingle(
    tokenIn,
    tokenOut,
    fee,
    amountIn,
    0
  );

  return amountOut;
}

async function quoteExactInput(quoteContract, path, amountIn) {
  const amountOut = await quoteContract.callStatic.quoteExactInput(
    path,
    amountIn
  );

  return amountOut;
}

async function quoteExactOutputSingle(
  quoteContract,
  tokenIn,
  tokenOut,
  fee,
  amountOut_
) {
  const amountIn = await quoteContract.callStatic.quoteExactOutputSingle(
    tokenIn,
    tokenOut,
    fee,
    amountOut_,
    0
  );

  return amountIn;
}

async function quoteExactOutput(quoteContract, path, amountOut) {
  const amountIn = await quoteContract.callStatic.quoteExactOutput(
    path,
    amountOut
  );

  return amountIn;
}
let depositManagerAddr = "0x0ad659558851f6ba8a8094614303F56d42f8f39A"
let candidateContractAddr = "0xC811b0ECa34f154e10aFBa0178ca037e4fb159c4"

const data = ethers.utils.solidityPack(
  ["address", "address"],
  [depositManagerAddr, candidateContractAddr]
);

const data2 = marshalString(
  [depositManagerAddr, candidateContractAddr]
    .map(unmarshalString)
    .map(str => padLeft(str, 64))
    .join(''),
);

describe("Swapper V2", function () {
  before(async () => {
    accounts = await ethers.getSigners();
    [admin1,admin2] = accounts;

    provider = ethers.provider;

    await hre.ethers.provider.send("hardhat_setBalance", [
      admin1.address,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);
  
    console.log(data);
    console.log(data.length);
    console.log("-------------------")
    console.log(data2);
    console.log(data2.length);
  });

  it("set Quote Contract", async () => {
    quoter = await ethers.getContractAt(
      QuoterABI.abi,
      uniswapInfo.Quoter,
      provider
    );
  });

  // it("set tonContract Contract", async () => {
  //   tonContract = await ethers.getContractAt(
  //     TON_ABI.abi,
  //     uniswapInfo.ton,
  //     provider
  //   );
  // });

  // it("set wtonContract Contract", async () => {
  //   wtonContract = await ethers.getContractAt(
  //     WTON_ABI.abi,
  //     uniswapInfo.wton,
  //     provider
  //   );
  // });

  // it("set tosContract Contract", async () => {
  //   tosContract = await ethers.getContractAt(
  //     TOS_ABI.abi,
  //     uniswapInfo.tos,
  //     provider
  //   );
  // });

  // it("set auraContract Contract", async () => {
  //   auraContract = await ethers.getContractAt(
  //     TOS_ABI.abi,
  //     uniswapInfo.aura,
  //     provider
  //   );
  // });

  // it("set lydaContract Contract", async () => {
  //   lydaContract = await ethers.getContractAt(
  //     TOS_ABI.abi,
  //     uniswapInfo.lyda,
  //     provider
  //   );
  // });

  // it("deploy Swapper V2 contract", async () => {
  //   const SwapperV2 = await ethers.getContractFactory("SwapperV2");
  //   swapperV2Logic = await SwapperV2.deploy();
  //   await swapperV2Logic.deployed();
  //   console.log("swapperV2Logic", swapperV2Logic.address);
  //   // console.log(swapperV2Logic);
  // });

  // it("deploy swapProxy contract and upgradeTo", async () => {
  //   const tonSwapProxy = await ethers.getContractFactory("SwapperProxy");
  //   swapperV2Proxy = await tonSwapProxy.deploy();
  //   await swapperV2Proxy.deployed();

  //   await swapperV2Proxy.connect(admin1).upgradeTo(swapperV2Logic.address);
  // })

  // it("initialize Swapper V2 contract", async () => {
  //   await swapperV2Proxy
  //     .connect(admin1)
  //     .initialize(
  //       uniswapInfo.wton,
  //       uniswapInfo.ton,
  //       uniswapInfo.tos,
  //       uniswapInfo.swapRouter,
  //       uniswapInfo.weth
  //     );
  // });

  // it("#2-4. swapProxy connection", async () => {
  //   swapperV2 = new ethers.Contract( swapperV2Proxy.address, SWAP2_ABI.abi, ethers.provider);
  // })

  // it("exactOutput: swap ETH to TON ", async () => {
  //   const amountOut = ethers.utils.parseEther("4000000000000");

  //   // ** !! reverse path !!
  //   const reversePath = encodePath(
  //     [uniswapInfo.wton, uniswapInfo.weth],
  //     [FeeAmount.MEDIUM]
  //   );

  //   const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

  //   console.log("ETH amountIn : ", amountIn);
  //   console.log("ETH amountIn : ", Number(amountIn));
  // });



});
