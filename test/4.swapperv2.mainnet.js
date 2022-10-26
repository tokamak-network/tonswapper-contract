const hre = require("hardhat");
const { ethers } = require("hardhat");
const { uniswapInfo } = require("./mainnet_info");
const { FeeAmount, encodePath } = require("./utils");
const Web3EthAbi = require("web3-eth-abi");
const { keccak256 } = require("web3-utils");

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

describe("Swapper V2", function () {
  before(async () => {
    accounts = await ethers.getSigners();
    [admin1,admin2] = accounts;

    provider = ethers.provider;

    await hre.ethers.provider.send("hardhat_setBalance", [
      admin1.address,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);
  });

  it("set Quote Contract", async () => {
    quoter = await ethers.getContractAt(
      QuoterABI.abi,
      uniswapInfo.Quoter,
      provider
    );
  });

  it("set tonContract Contract", async () => {
    tonContract = await ethers.getContractAt(
      TON_ABI.abi,
      uniswapInfo.ton,
      provider
    );
  });

  it("set wtonContract Contract", async () => {
    wtonContract = await ethers.getContractAt(
      WTON_ABI.abi,
      uniswapInfo.wton,
      provider
    );
  });

  it("set tosContract Contract", async () => {
    tosContract = await ethers.getContractAt(
      TOS_ABI.abi,
      uniswapInfo.tos,
      provider
    );
  });

  it("set auraContract Contract", async () => {
    auraContract = await ethers.getContractAt(
      TOS_ABI.abi,
      uniswapInfo.aura,
      provider
    );
  });

  it("set lydaContract Contract", async () => {
    lydaContract = await ethers.getContractAt(
      TOS_ABI.abi,
      uniswapInfo.lyda,
      provider
    );
  });

  it("deploy Swapper V2 contract", async () => {
    const SwapperV2 = await ethers.getContractFactory("SwapperV2");
    swapperV2Logic = await SwapperV2.deploy();
    await swapperV2Logic.deployed();
    console.log("swapperV2Logic", swapperV2Logic.address);
    // console.log(swapperV2Logic);
  });

  it("deploy swapProxy contract and upgradeTo", async () => {
    const tonSwapProxy = await ethers.getContractFactory("SwapperProxy");
    swapperV2Proxy = await tonSwapProxy.deploy();
    await swapperV2Proxy.deployed();

    await swapperV2Proxy.connect(admin1).upgradeTo(swapperV2Logic.address);
  })

  it("initialize Swapper V2 contract", async () => {
    await swapperV2Proxy
      .connect(admin1)
      .initialize(
        uniswapInfo.wton,
        uniswapInfo.ton,
        uniswapInfo.tos,
        uniswapInfo.swapRouter,
        uniswapInfo.weth
      );
  });

  it("#2-4. swapProxy connection", async () => {
    swapperV2 = new ethers.Contract( swapperV2Proxy.address, SWAP2_ABI.abi, ethers.provider);
  })

  it("exactOutput: swap ETH to TON ", async () => {
    const amountExactOut = ethers.utils.parseEther("1000");
    const amountWTONOut = ethers.BigNumber.from("1" + "0".repeat(30));

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );
    const amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountWTONOut
    );

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountWTONOut
    );

    const prevBalance = await tonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await tonContract.balanceOf(admin1.address);
    const amountOutTON = amountWTONOut.div(ethers.BigNumber.from("1000000000"));
    expect(afterBalance).to.be.gte(prevBalance.add(amountOutTON));
    expect(amountExactOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap ETH to WTON ", async () => {
    const amountOut = ethers.utils.parseEther("1000" + "1000000000");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );
    const amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountOut
    );

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const prevBalance = await wtonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await wtonContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap ETH to TOS ", async () => {
    const amountOut = ethers.utils.parseEther("100");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap ETH to AURA ", async () => {
    const amountOut = ethers.utils.parseEther("1000");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap TON to TOS ", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    let amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.wton,
      uniswapInfo.tos,
      FeeAmount.MEDIUM,
      amountOut
    );

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    const diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap TON to AURA ", async () => {
    const amountOut = ethers.utils.parseEther("100");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    let amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    const diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap WTON to TOS ", async () => {
    const amountOut = ethers.utils.parseEther("100");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap WTON to AURA ", async () => {
    const amountOut = ethers.utils.parseEther("100");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap AURA to LYDA ", async () => {
    const amountOut = ethers.utils.parseEther("100");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.lyda, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await lydaContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await lydaContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("exactOutput: swap AURA to TON ", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await tonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tonContract.balanceOf(admin1.address);
    const amountOutTON = amountOut.div(ethers.BigNumber.from("1000000000"));
    expect(afterBalance).to.be.gte(prevBalance.add(amountOutTON));
  });

  it("exactOutput: swap AURA to WTON ", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await wtonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await wtonContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactOutput: swap AURA to TOS ", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap ETH to TON ", async () => {
    const amountIn = ethers.utils.parseEther("1");
    const path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountIn
    );

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await tonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await tonContract.balanceOf(admin1.address);
    const amountOutTON = amountOut.div(ethers.BigNumber.from("1000000000"));
    expect(afterBalance).to.be.gte(prevBalance.add(amountOutTON));
  });

  it("exactInput: swap ETH to WTON ", async () => {
    const amountIn = ethers.utils.parseEther("0.1");
    const path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountIn
    );

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await wtonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await wtonContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap ETH to TOS ", async () => {
    const amountIn = ethers.utils.parseEther("0.1");
    const path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap ETH to AURA ", async () => {
    const amountIn = ethers.utils.parseEther("0.1");
    const path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });

    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap TON to TOS ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap TON to AURA ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap WTON to TOS ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap WTON to AURA ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap AURA to LYDA ", async () => {
    const amountIn = ethers.utils.parseEther("1");
    const path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.lyda],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
    const prevBalance = await lydaContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await lydaContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap AURA to TON ", async () => {
    const amountIn = ethers.utils.parseEther("100");
    const path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    const prevBalance = await tonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tonContract.balanceOf(admin1.address);
    const amountOutTON = amountOut.div(ethers.BigNumber.from("1000000000"));
    expect(afterBalance).to.be.gte(prevBalance.add(amountOutTON));
  });

  it("exactInput: swap AURA to WTON ", async () => {
    const amountIn = ethers.utils.parseEther("1000");
    const path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    const prevBalance = await wtonContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await wtonContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("exactInput: swap AURA to TOS ", async () => {
    const amountIn = ethers.utils.parseEther("100");
    const path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, inputWrapWTON, outputUnwrapTON);

    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("TON.approveAndCall:  exactOutput: swap TON to TOS ", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    let amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.wton,
      uniswapInfo.tos,
      FeeAmount.MEDIUM,
      amountOut
    );

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    const diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff).add(ethers.constants.One);
    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
    // const selector = Web3EthAbi.encodeFunctionSignature(
    //   "_exactOutput((bytes,address,uint256,uint256,uint256),bool,bool,bool)"
    // );

    // console.log("selector", selector);
    // console.log("params.path", params.path);
    // console.log("params.recipient", params.recipient);
    // console.log("params.deadline", params.deadline);
    // console.log("params.amountOut", params.amountOut.toString());
    // console.log("params.amountInMaximum", params.amountInMaximum.toString());

    const paramsData = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountOut,
        params.amountInMaximum,
      ]
    );
    // console.log("wrapEth", wrapEth);
    // console.log("inputWrapWTON", inputWrapWTON);
    // console.log("outputUnwrapTON", outputUnwrapTON);

    // bool ExactOutputParams true
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, inputWrapWTON, outputUnwrapTON]
    );
    // console.log("data", data);

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("TON.approveAndCall:  exactOutput: swap TON to AURA ", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    let amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    const diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff).add(ethers.constants.One);
    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const paramsData = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountOut,
        params.amountInMaximum,
      ]
    );
    // console.log("wrapEth", wrapEth);
    // console.log("inputWrapWTON", inputWrapWTON);
    // console.log("outputUnwrapTON", outputUnwrapTON);

    // bool ExactOutputParams true, bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("TON.approveAndCall:  exactInput: swap TON to TOS ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    // ISwapRouter.ExactInputParams {
    //     bytes path;
    //     address recipient;
    //     uint256 deadline;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    // }
    const ExactInputParams = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountIn,
        params.amountOutMinimum,
      ]
    );

    // bool ExactInputParams false
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    // await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("WTON.approveAndCall:  exactInput: swap TON to AURA", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    // ISwapRouter.ExactInputParams {
    //     bytes path;
    //     address recipient;
    //     uint256 deadline;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    // }
    const ExactInputParams = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountIn,
        params.amountOutMinimum,
      ]
    );

    // bool ExactInputParams false, bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("WTON.approveAndCall:  exactOutput: swap WTON to AURA ", async () => {
    const amountOut = ethers.utils.parseEther("1000");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const paramsData = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountOut,
        params.amountInMaximum,
      ]
    );

    // bool ExactOutputParams true, bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, params.amountInMaximum, data);
    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("WTON.approveAndCall:  exactOutput: swap WTON to TOS ", async () => {
    const amountOut = ethers.utils.parseEther("1000");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );

    const paramsData = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountOut,
        params.amountInMaximum,
      ]
    );

    // bool ExactOutputParams true, bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, params.amountInMaximum, data);
    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
    expect(amountOut).to.be.eq(afterBalance.sub(prevBalance));
  });

  it("WTON.approveAndCall:  exactInput: swap WTON to AURA ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    // ISwapRouter.ExactInputParams {
    //     bytes path;
    //     address recipient;
    //     uint256 deadline;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    // }
    const ExactInputParams = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountIn,
        params.amountOutMinimum,
      ]
    );

    // bool ExactInputParams false, bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await auraContract.balanceOf(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await auraContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("WTON.approveAndCall:  exactInput: swap WTON to TOS ", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );

    const ExactInputParams = ethers.utils.solidityPack(
      ["bytes", "address", "uint256", "uint256", "uint256"],
      [
        params.path,
        params.recipient,
        params.deadline,
        params.amountIn,
        params.amountOutMinimum,
      ]
    );

    // bool ExactInputParams false, bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("approveAndCall: swap TON to WTON", async () => {
    const amountIn = ethers.utils.parseEther("1");
    await tonContract.connect(admin1).transfer(admin2.address,amountIn)

    const tonToWTON = true;

    const data = ethers.utils.solidityPack(
      ["address","bool"],
      [admin2.address,tonToWTON]
    );
    
    console.log("admin2.address : ",admin2.address);

    const prevBalance = await wtonContract.balanceOf(admin2.address);
    // console.log("prevBalance :",Number(prevBalance));
    const tx = await tonContract
      .connect(admin2)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await wtonContract.balanceOf(admin2.address);
    // console.log("afterBalance :",Number(afterBalance));
    expect(afterBalance).to.be.gte(prevBalance);
  })

  it("approveAndCall: swap WTON to TON", async () => {
    // const amountIn = ethers.utils.parseEther("1");
    const amountIn = ethers.utils.parseEther("1000000000"); 
    // let wtonuniAmount = ethers.utils.parseUnits("1", 27);

    const tonToWTON = false;

    const data = ethers.utils.solidityPack(
      ["address","bool"],
      [admin2.address,tonToWTON]
    );
    
    console.log("admin2.address : ",admin2.address);

    const prevBalance = await tonContract.balanceOf(admin2.address);
    // console.log("prevBalance :",Number(prevBalance));
    const tx = await wtonContract
      .connect(admin2)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await tonContract.balanceOf(admin2.address);
    // console.log("afterBalance :",Number(afterBalance));
    expect(afterBalance).to.be.gte(prevBalance);
  })

});
