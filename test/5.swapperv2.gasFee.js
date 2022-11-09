const hre = require("hardhat");
const { ethers } = require("hardhat");
const { uniswapInfo } = require("./mainnet_info");
const { FeeAmount, encodePath } = require("./utils");
const Web3EthAbi = require("web3-eth-abi");
const { keccak256 } = require("web3-utils");
const {
  BigNumber,
} = require("@ethersproject/bignumber");

let accounts, provider, admin1;
let swapperV2, swapperV2Logic, swapperV2Proxy, quoter, tonContract, wtonContract, tosContract;
let auraContract, lydaContract;
let wethContract;
let uniswapRouter;

let amountIn;
let amountOut;
let amountWTONOut;

let path;
let reversePath;
let params;
let diff;

const TOS_ABI = require("../abis/TOS.json");
const TON_ABI = require("../abis/TON.json");
const WTON_ABI = require("../abis/WTON.json");
const WETH_ABI = require("../abis/WETH.json");

const QuoterABI = require("../abis/Quoter.json");
// const SWAP_ABI = require("../artifacts/contracts/Swapper.sol/Swapper.json");
const SWAP2_ABI = require("../artifacts/contracts/SwapperV2.sol/SwapperV2.json");
const UNISWAPROUTER_ABI = require("../abis/SwapRouter.json");


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

  it("set uniswapRouter Contract", async () => {
    uniswapRouter = await ethers.getContractAt(
      UNISWAPROUTER_ABI.abi, 
      uniswapInfo.swapRouter, 
      ethers.provider
    );
  })

  it("set weth Contract", async () => {
    wethContract = await ethers.getContractAt(
      WETH_ABI,
      uniswapInfo.weth,
      provider
    );
  })

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

  it("swapProxy connection", async () => {
    swapperV2 = new ethers.Contract( swapperV2Proxy.address, SWAP2_ABI.abi, ethers.provider);
  })

  it("get amountIn", async () => {
    amountWTONOut = ethers.BigNumber.from("1" + "0".repeat(30));

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountWTONOut
    );

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountWTONOut
    );
  })

  it("exactOutput: swap ETH to TON ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1000" + "1000000000");

    reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountOut
    );
    
    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap ETH to WTON ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("100");

    reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap ETH to TOS ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1000");

    reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap ETH to AURA ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.wton,
      uniswapInfo.tos,
      FeeAmount.MEDIUM,
      amountOut
    );

    diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap TON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff);
    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("100");

    reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap TON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("100");

    reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap WTON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("100");

    reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap WTON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("100");

    reversePath = encodePath(
      [uniswapInfo.lyda, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap AURA to LYDA ", async () => {

    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);
    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap AURA to TON ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap AURA to WTON ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap AURA to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap TON to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });
  
  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1");

    path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap ETH to TOS", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;
    
    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  })

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("0.1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput: swap TOS to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await tosContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1");

    path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountIn
    );

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap ETH to TON ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("0.1");

    path = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInputSingle(
      quoter,
      uniswapInfo.weth,
      uniswapInfo.wton,
      FeeAmount.MEDIUM,
      amountIn
    );

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap ETH to WTON ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("0.1");

    path = encodePath(
      [uniswapInfo.weth, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap ETH to TOS ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("0.1");

    path = encodePath(
      [uniswapInfo.weth, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap ETH to AURA ", async () => {
    const wrapEth = true;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON, {
        value: amountIn,
      });
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap TON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap TON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap WTON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap WTON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });


  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1");

    path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.lyda],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap AURA to LYDA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);
    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("100");

    path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap AURA to TON ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000");

    path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap AURA to WTON ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("100");

    path = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap AURA to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, amountIn);
    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("100");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap TON to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    await tonContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  })

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("100");

    path = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM,FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput: swap TOS to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await tosContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  })

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.wton,
      uniswapInfo.tos,
      FeeAmount.MEDIUM,
      amountOut
    );

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("TON.approveAndCall:  exactOutput: swap TON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff).add(ethers.constants.One);

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

    // bool ExactOutputParams true
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("TON.approveAndCall:  exactOutput: swap TON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff).add(ethers.constants.One);

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );
    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("TON.approveAndCall:  exactInput: swap TON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("TON.approveAndCall:  exactInput: swap TON to AURA", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const diff = ethers.BigNumber.from("1000000000");
    const amountInTON = amountIn.div(diff);

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1000");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("WTON.approveAndCall:  exactOutput: swap WTON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, params.amountInMaximum, data);
  });

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1000");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("WTON.approveAndCall:  exactOutput: swap WTON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;


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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, params.amountInMaximum, data);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
      [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("WTON.approveAndCall:  exactInput: swap WTON to AURA ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
  });

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("WTON.approveAndCall:  exactInput: swap WTON to TOS ", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
  });


  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("100");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("TON.approveAndCall: exactInput swap TON to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
  })

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.wton,
      uniswapInfo.weth,
      FeeAmount.MEDIUM,
      amountOut
    );

    diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("TON.approveAndCall: exactOutput swap TON to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = true;
    const outputUnwrapTON = false;

    const amountInTON = amountIn.div(diff).add(ethers.constants.One);

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

    // bool ExactOutputParams true
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
  })

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("1000000000");

    path = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("WTON.approveAndCall exactInput WTON to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
  })

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("WTON.approveAndCall exactOutput WTON to ETH", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, params.amountInMaximum, data);
  })

  it("get amountOut", async () => {
    amountIn = ethers.utils.parseEther("10");

    path = encodePath(
      [uniswapInfo.tos, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    amountOut = await quoteExactInput(quoter, path, amountIn);

    params = getExactInputParams(
      admin1.address,
      path,
      amountIn,
      amountOut
    );
  })

  it("exactInput : TOS to TON", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await tosContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  })

  it("get amountIn", async () => {
    amountOut = ethers.utils.parseEther("0.1");

    // ** !! reverse path !!
    reversePath = encodePath(
      [uniswapInfo.wton, uniswapInfo.tos],
      [FeeAmount.MEDIUM]
    );

    amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    params = getExactOutputParams(
      admin1.address,
      reversePath,
      amountIn,
      amountOut
    );
  })

  it("exactOutput : TOS to TON", async () => {
    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = true;

    await tosContract.connect(admin1).approve(swapperV2.address, amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
  })
  

  describe("#uniswap gasFee", async () => {
    describe("#exactInput", async () => {
      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = {
          tokenIn: uniswapInfo.weth,
          tokenOut: uniswapInfo.wton,
          fee: 3000,
          recipient: admin1.address,
          deadline: 100000000000000,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0,
        };
      })
      
      it("#exactInput ETH -> TON", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
  
        await uniswapRouter.connect(admin1).exactInputSingle(params);
  
        await wtonContract.connect(admin1).swapToTON(amountIn);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("0.1");
    
        path = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput ETH -> TOS", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = {
          tokenIn: uniswapInfo.weth,
          tokenOut: uniswapInfo.wton,
          fee: 3000,
          recipient: admin1.address,
          deadline: 100000000000000,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0,
        };
      })


      it("#exactInput ETH -> WTON", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
  
        await uniswapRouter.connect(admin1).exactInputSingle(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("0.1");
    
        path = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput ETH -> AURA", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
    
        path = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, wtonAmountIn);
    
        params = {
          tokenIn: uniswapInfo.wton,
          tokenOut: uniswapInfo.tos,
          fee: 3000,
          recipient: admin1.address,
          deadline: 100000000000000,
          amountIn: wtonAmountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0,
        };
      })

      it("#exactInput TON -> TOS", async () => {
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
        await tonContract.connect(admin1).approve(wtonContract.address,amountIn);
        await wtonContract.connect(admin1).swapFromTON(amountIn);
        await wtonContract.connect(admin1).approve(uniswapRouter.address,wtonAmountIn);
        await uniswapRouter.connect(admin1).exactInputSingle(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
    
        path = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, wtonAmountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          wtonAmountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput TON -> AURA", async () => {
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
        await tonContract.connect(admin1).approve(wtonContract.address,amountIn);
        await wtonContract.connect(admin1).swapFromTON(amountIn);
        await wtonContract.connect(admin1).approve(uniswapRouter.address,wtonAmountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
    
        path = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, wtonAmountIn);
    
        params = {
          tokenIn: uniswapInfo.wton,
          tokenOut: uniswapInfo.tos,
          fee: 3000,
          recipient: admin1.address,
          deadline: 100000000000000,
          amountIn: wtonAmountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0,
        };
      })

      it("#exactInput WTON -> TOS", async () => {
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
        await wtonContract.connect(admin1).approve(uniswapRouter.address,wtonAmountIn);
        await uniswapRouter.connect(admin1).exactInputSingle(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
    
        path = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, wtonAmountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          wtonAmountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput WTON -> AURA", async () => {
        let wtonAmountIn = ethers.utils.parseEther("1000000000");
        await wtonContract.connect(admin1).approve(uniswapRouter.address,wtonAmountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.lyda],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM] 
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput AURA -> LYDA", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput AURA -> TON", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
        await wtonContract.connect(admin1).swapToTON(amountIn);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput AURA -> WTON", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput AURA -> TOS", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })


      it("#exactInput TON -> ETH", async () => {
        await tonContract.connect(admin1).approve(wtonContract.address,amountIn);
        await wtonContract.connect(admin1).swapFromTON(amountIn);
        amountIn = amountIn.mul(diff);
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
        await wethContract.connect(admin1).withdraw(amountOut);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })


      it("#exactInput TOS -> ETH", async () => {
        await tosContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
        await wethContract.connect(admin1).withdraw(amountOut);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1000000000");
    
        path = encodePath(
          [uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput WTON -> ETH", async () => {
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
        await wethContract.connect(admin1).withdraw(amountOut);
      })

      it("get amountOut", async () => {
        amountIn = ethers.utils.parseEther("1");
    
        path = encodePath(
          [uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountOut = await quoteExactInput(quoter, path, amountIn);
    
        params = getExactInputParams(
          admin1.address,
          path,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactInput TOS -> TON", async () => {
        await tosContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactInput(params);
        await wtonContract.connect(admin1).swapToTON(amountIn);
      })

    })

    describe("#exactOutput", async () => {
      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput TOS -> ETH", async () => {
        await tosContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
        await wethContract.connect(admin1).withdraw(amountOut);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("0.01");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        amountIn = amountIn.div(diff).mul(diff);
        let denominator = BigNumber.from("100")
        let numerator = BigNumber.from("110")
        amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })


      it("#exactOutput TON -> ETH", async () => {
        amountIn = amountIn.div(diff);
        await tonContract.connect(admin1).approve(wtonContract.address,amountIn);
        await wtonContract.connect(admin1).swapFromTON(amountIn);
        amountIn = amountIn.mul(diff);
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
        await wethContract.connect(admin1).withdraw(amountOut);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput AURA -> TOS", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })


      it("#exactOutput AURA -> WTON", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput AURA -> TON", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
        await wtonContract.connect(admin1).swapToTON(amountIn);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.lyda, uniswapInfo.tos, uniswapInfo.aura],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput AURA -> LYDA", async () => {
        await auraContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput WTON -> AURA", async () => {
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput WTON -> TOS", async () => {
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        amountIn = amountIn.div(diff).mul(diff);
        let denominator = BigNumber.from("100")
        let numerator = BigNumber.from("110")
        amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput TON -> AURA", async () => {
        amountIn = amountIn.div(diff);
        await tonContract.connect(admin1).approve(wtonContract.address,amountIn);
        await wtonContract.connect(admin1).swapFromTON(amountIn);
        amountIn = amountIn.mul(diff);
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.tos, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        amountIn = amountIn.div(diff).mul(diff);
        let denominator = BigNumber.from("100")
        let numerator = BigNumber.from("110")
        amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput TON -> TOS", async () => {
        amountIn = amountIn.div(diff);
        await tonContract.connect(admin1).approve(wtonContract.address,amountIn);
        await wtonContract.connect(admin1).swapFromTON(amountIn);
        amountIn = amountIn.mul(diff);
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("100");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.aura, uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        // amountIn = amountIn.div(diff).mul(diff);
        // let denominator = BigNumber.from("100")
        // let numerator = BigNumber.from("110")
        // amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput ETH -> AURA", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("100");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.tos, uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        // amountIn = amountIn.div(diff).mul(diff);
        // let denominator = BigNumber.from("100")
        // let numerator = BigNumber.from("110")
        // amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput ETH -> TOS", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("100");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        // amountIn = amountIn.div(diff).mul(diff);
        // let denominator = BigNumber.from("100")
        // let numerator = BigNumber.from("110")
        // amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput ETH -> WTON", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("100");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.wton, uniswapInfo.weth],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        // amountIn = amountIn.div(diff).mul(diff);
        // let denominator = BigNumber.from("100")
        // let numerator = BigNumber.from("110")
        // amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput ETH -> TON", async () => {
        await wethContract.connect(admin1).deposit(
          {value: amountIn}
        )
        await wethContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
        await wtonContract.connect(admin1).swapToTON(amountIn);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("0.1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.weth, uniswapInfo.wton],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        // amountIn = amountIn.div(diff).mul(diff);
        // let denominator = BigNumber.from("100")
        // let numerator = BigNumber.from("110")
        // amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })

      it("#exactOutput WTON -> ETH", async () => {
        await wtonContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
        await wethContract.connect(admin1).withdraw(amountOut);
      })

      it("get amountIn", async () => {
        amountOut = ethers.utils.parseEther("1");
    
        // ** !! reverse path !!
        reversePath = encodePath(
          [uniswapInfo.wton, uniswapInfo.tos],
          [FeeAmount.MEDIUM]
        );
    
        amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
        // amountIn = amountIn.div(diff).mul(diff);
        // let denominator = BigNumber.from("100")
        // let numerator = BigNumber.from("110")
        // amountIn = amountIn.mul(numerator).div(denominator);
    
        params = getExactOutputParams(
          admin1.address,
          reversePath,
          amountIn,
          amountOut
        );

        let block = await ethers.provider.getBlock();
        params.deadline = block.timestamp + 10;
      })


      it("#exactOutput TOS -> TON", async () => {
        await tosContract.connect(admin1).approve(uniswapRouter.address,amountIn);
        await uniswapRouter.connect(admin1).exactOutput(params);
        await wtonContract.connect(admin1).swapToTON(amountIn);
      })
    })
  })

});
