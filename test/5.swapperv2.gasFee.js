const hre = require("hardhat");
const { ethers } = require("hardhat");
const { uniswapInfo } = require("./mainnet_info");
const { FeeAmount, encodePath } = require("./utils");
const Web3EthAbi = require("web3-eth-abi");
const { keccak256 } = require("web3-utils");

let accounts, provider, admin1;
let swapperV2, swapperV2Logic, swapperV2Proxy, quoter, tonContract, wtonContract, tosContract;
let auraContract, lydaContract;

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
    const outputUnwrapEth = false;
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

    // bool ExactOutputParams true
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
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
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await tosContract.balanceOf(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await tosContract.balanceOf(admin1.address);
    expect(afterBalance).to.be.gte(prevBalance.add(amountOut));
  });

  it("TON.approveAndCall: swap TON to WTON", async () => {
    const amountIn = ethers.utils.parseEther("1");
    await tonContract.connect(admin1).transfer(admin2.address,amountIn)

    const tonToWTON = true;

    const data = ethers.utils.solidityPack(
      ["address","bool"],
      [admin2.address,tonToWTON]
    );
    
    // console.log("admin2.address : ",admin2.address);

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

  it("WTON.approveAndCall: swap WTON to TON", async () => {
    // const amountIn = ethers.utils.parseEther("1");
    const amountIn = ethers.utils.parseEther("1000000000"); 
    // let wtonuniAmount = ethers.utils.parseUnits("1", 27);

    const tonToWTON = false;

    const data = ethers.utils.solidityPack(
      ["address","bool"],
      [admin2.address,tonToWTON]
    );
    
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

  it("TON.approveAndCall: exactInput swap TON to ETH", async () => {
    const amountIn = ethers.utils.parseEther("100");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const outputUnwrapEth = true;
    const inputWrapWTON = true;
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

    // bool ExactInputParams false
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    // await tonContract.connect(admin1).approve(swapperV2.address, amountInTON);

    const prevBalance = await provider.getBalance(admin1.address);

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await await provider.getBalance(admin1.address);
    expect(amountOut).to.be.gte(afterBalance.sub(prevBalance));
  })

  it("TON.approveAndCall: exactOutput swap TON to ETH", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    let amountIn = await quoteExactOutputSingle(
      quoter,
      uniswapInfo.wton,
      uniswapInfo.weth,
      FeeAmount.MEDIUM,
      amountOut
    );

    // // 주의할것 !! amountInMaximum 입력값을 조금 크게 보정. (TON, WTON 변환으로 인한 보정 )
    const diff = ethers.BigNumber.from("1000000000");
    amountIn = amountIn.div(diff).add(ethers.constants.One).mul(diff);

    const wrapEth = false;
    const outputUnwrapEth = true;
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

    // bool ExactOutputParams true
    // bytes params, bool wrapEth, bool inputWrapWTON, bool outputUnwrapTON
    const data = ethers.utils.solidityPack(
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );
    // console.log("data", data);

    const prevBalance = await provider.getBalance(admin1.address);

    const tx = await tonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountInTON, data);
    await tx.wait();

    const afterBalance = await await provider.getBalance(admin1.address);
    expect(amountOut).to.be.gte(afterBalance.sub(prevBalance));
  })

  it("WTON.approveAndCall exactInput WTON to ETH", async () => {
    const amountIn = ethers.utils.parseEther("1000000000");
    const path = encodePath(
      [uniswapInfo.wton, uniswapInfo.weth],
      [FeeAmount.MEDIUM]
    );

    const amountOut = await quoteExactInput(quoter, path, amountIn);

    const wrapEth = false;
    const outputUnwrapEth = true;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [false, ExactInputParams, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await provider.getBalance(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, amountIn, data);
    await tx.wait();

    const afterBalance = await await provider.getBalance(admin1.address);
    expect(amountOut).to.be.gte(afterBalance.sub(prevBalance));
  })

  it("WTON.approveAndCall exactOutput WTON to ETH", async () => {
    const amountOut = ethers.utils.parseEther("1");

    // ** !! reverse path !!
    const reversePath = encodePath(
      [uniswapInfo.weth, uniswapInfo.wton],
      [FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);

    const wrapEth = false;
    const outputUnwrapEth = false;
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
      ["bool", "bytes", "bool", "bool", "bool", "bool"],
      [true, paramsData, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON]
    );

    const prevBalance = await provider.getBalance(admin1.address);

    const tx = await wtonContract
      .connect(admin1)
      .approveAndCall(swapperV2.address, params.amountInMaximum, data);
    await tx.wait();

    const afterBalance = await await provider.getBalance(admin1.address);
    expect(amountOut).to.be.gte(afterBalance.sub(prevBalance));
  })

  it("exactInput: TON to WTON", async () => {
    //want to input the 1TON
    const amountIn = ethers.utils.parseEther("1");
    const diff = ethers.BigNumber.from("1000000000");

    //want to output WTON amount
    const amountOut = amountIn.mul(diff);

    await tonContract.connect(admin1).approve(swapperV2.address,amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .tonToWton(amountIn);
  })

  it("exactInput: WTON to TON", async () => {
    //want to input the 1WTON
    const amountIn = ethers.utils.parseEther("1000000000");

    const diff = ethers.BigNumber.from("1000000000");

    //want to output TON amount
    const amountOut = amountIn.div(diff);

    await wtonContract.connect(admin1).approve(swapperV2.address,amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .wtonToTon(amountIn);
  })

  it("exactOutput: TON to WTON", async () => {
    //want to get 1 WTON
    const amountOut = ethers.utils.parseEther("1000000000");

    const diff = ethers.BigNumber.from("1000000000");

    //get exactInput TON Amount
    const amountIn = amountOut.div(diff);

    await tonContract.connect(admin1).approve(swapperV2.address,amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .tonToWton(amountIn);
  })

  it("exactOutput: WTON to TON", async () => {
    //want to get 1TON
    const amountOut = ethers.utils.parseEther("1");

    const diff = ethers.BigNumber.from("1000000000");

    //get exactInput WTON Amount
    const amountIn = amountOut.mul(diff);
    
    await wtonContract.connect(admin1).approve(swapperV2.address,amountIn);

    const tx = await swapperV2
      .connect(admin1)
      .wtonToTon(amountIn);
  })

});
