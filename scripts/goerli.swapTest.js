// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {
    BigNumber,
} = require("@ethersproject/bignumber");
const { ethers } = require("hardhat");
const { FeeAmount, encodePath } = require("../test/utils");

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

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');
    let admin1;
    let admin2;
    let accounts = await ethers.getSigners();
    [admin1,admin2] = accounts;

    const TOS_ABI = require("../abis/TOS.json");
    const TON_ABI = require("../abis/TON.json");
    const WTON_ABI = require("../abis/WTON.json");
    const QuoterABI = require("../abis/Quoter.json");
    const swapProxyABI = require("../artifacts/contracts/SwapperV2.sol/SwapperV2.json")

    let swapProxyAddress = "0xb99300e6650f2b40a5359D00396a6Ae17Bf1bc97";
    let swapperV2 = new ethers.Contract( swapProxyAddress, swapProxyABI.abi, ethers.provider); 

    //goerli Address
    let uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    let quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

    let wtonAddress = "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6";
    let tonAddress = "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00";
    let tosAddress = "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9";
    let wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
    let auraAddress = "0x80Eea029B5Cdb8A215Ae78e20B4fF81607F44A38";
    let docAddress = "0x020A7c41212057B2A880191c07F7c7C7a71a8b57";
    let lydaAddress = "0x51C5E2D3dc8Ee66Dffdb1747dEB20d6b326E8bF2";

    let tosContract;
    let auraContract;
    let lydaContract;

    wtonContract = await ethers.getContractAt(
        WTON_ABI.abi,
        wtonAddress,
        ethers.provider
    );

    tosContract = await ethers.getContractAt(
        TOS_ABI.abi,
        tosAddress,
        ethers.provider
    );

    auraContract = await ethers.getContractAt(
        TOS_ABI.abi,
        auraAddress,
        ethers.provider
    );

    lydaContract = await ethers.getContractAt(
        TOS_ABI.abi,
        lydaAddress,
        ethers.provider
    );

    quoter = await ethers.getContractAt(
        QuoterABI.abi,
        quoterAddress,
        ethers.provider
    );


    //TOS -> AURA
    // const amountIn = ethers.utils.parseEther("10");
    // const path = encodePath(
    //   [tosAddress, auraAddress],
    //   [3000]
    // );

    // const amountOut = await quoteExactInput(quoter, path, amountIn);
    // console.log("amountOut :",Number(amountOut));
    // //slippage test
    // let denominator = BigNumber.from("100")
    // let numerator = BigNumber.from("95")
    // let minimumAmountOut = amountOut.mul(numerator).div(denominator);

    // const wrapEth = false;
    // const outputUnwrapEth = false;
    // const inputWrapWTON = false;
    // const outputUnwrapTON = false;

    // await tosContract.connect(admin1).approve(swapperV2.address, amountIn);
    // console.log("approve success");

    // const params = getExactInputParams(
    //   admin1.address,
    //   path,
    //   amountIn,
    //   minimumAmountOut
    // );

    // console.log("let's go transaction");
    // const tx = await swapperV2
    //   .connect(admin1)
    //   .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
    // await tx.wait();


    //TOS -> DOC
    // const amountIn = ethers.utils.parseEther("10");
    // const path = encodePath(
    //   [tosAddress, docAddress],
    //   [3000]
    // );

    // const amountOut = await quoteExactInput(quoter, path, amountIn);
    // console.log("amountOut :",Number(amountOut));
    // //slippage test
    // let denominator = BigNumber.from("100")
    // let numerator = BigNumber.from("99")
    // let minimumAmountOut = amountOut.mul(numerator).div(denominator);

    // const wrapEth = false;
    // const outputUnwrapEth = false;
    // const inputWrapWTON = false;
    // const outputUnwrapTON = false;

    // await tosContract.connect(admin1).approve(swapperV2.address, amountIn);
    // console.log("approve success");

    // const params = getExactInputParams(
    //   admin1.address,
    //   path,
    //   amountIn,
    //   minimumAmountOut
    // );

    // console.log("let's go transaction");
    // const tx = await swapperV2
    //   .connect(admin1)
    //   .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
    // await tx.wait();


    //AURA -> LYDA
    // const amountIn = ethers.utils.parseEther("10");
    // const path = encodePath(
    //     [auraAddress, tosAddress, lydaAddress],
    //     [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    // );

    // const amountOut = await quoteExactInput(quoter, path, amountIn);
    // console.log("amountOut :",Number(amountOut));
    // //slippage test
    // let denominator = BigNumber.from("100")
    // let numerator = BigNumber.from("95")
    // let minimumAmountOut = amountOut.mul(numerator).div(denominator);

    // const wrapEth = false;
    // const outputUnwrapEth = false;
    // const inputWrapWTON = false;
    // const outputUnwrapTON = false;

    // await auraContract.connect(admin1).approve(swapperV2.address, amountIn);
    // console.log("approve success");

    // const params = getExactInputParams(
    //   admin1.address,
    //   path,
    //   amountIn,
    //   minimumAmountOut
    // );

    // console.log("let's go transaction");
    // const tx = await swapperV2
    //   .connect(admin1)
    //   .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
    // await tx.wait();

    //WTON -> AURA
    // const amountIn = ethers.utils.parseEther("1000000000");
    // const path = encodePath(
    //     [wtonAddress, tosAddress, auraAddress],
    //     [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    // );

    // const amountOut = await quoteExactInput(quoter, path, amountIn);
    // console.log("amountOut :",Number(amountOut));
    // //slippage test
    // let denominator = BigNumber.from("100")
    // let numerator = BigNumber.from("90")
    // let minimumAmountOut = amountOut.mul(numerator).div(denominator);
    // console.log("minimumAmountOut :",Number(minimumAmountOut));

    // const wrapEth = false;
    // const outputUnwrapEth = false;
    // const inputWrapWTON = false;
    // const outputUnwrapTON = false;

    // await wtonContract.connect(admin1).approve(swapperV2.address, amountIn);
    // console.log("approve success");

    // const params = getExactInputParams(
    //   admin1.address,
    //   path,
    //   amountIn,
    //   minimumAmountOut
    // );

    // console.log("let's go transaction");
    // const tx = await swapperV2
    //   .connect(admin1)
    //   .exactInput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
    // await tx.wait();

    //LYDA -> AURA exactOutput
    // const amountOut = ethers.utils.parseEther("1");
    // const reversePath = encodePath(
    //     [auraAddress, tosAddress, lydaAddress],
    //     [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    // );

    // const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    // console.log("amountIn :",Number(amountIn));
    // //slippage test
    // let denominator = BigNumber.from("100")
    // let numerator = BigNumber.from("110")
    // let maxmumInputAmount = amountIn.mul(numerator).div(denominator);
    // console.log("maxmumInputAmount :",Number(maxmumInputAmount));

    // const wrapEth = false;
    // const outputUnwrapEth = false;
    // const inputWrapWTON = false;
    // const outputUnwrapTON = false;

    // await lydaContract.connect(admin1).approve(swapperV2.address, maxmumInputAmount);
    // console.log("approve success");

    // const params = getExactOutputParams(
    //     admin1.address,
    //     reversePath,
    //     maxmumInputAmount,
    //     amountOut
    // );

    // console.log("let's go transaction");
    // const tx = await swapperV2
    //   .connect(admin1)
    //   .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
    // await tx.wait();

    //AURA -> WTON exactOutput
    const amountOut = ethers.utils.parseEther("100000000");
    const reversePath = encodePath(
        [wtonAddress, tosAddress, auraAddress],
        [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
    );

    const amountIn = await quoteExactOutput(quoter, reversePath, amountOut);
    console.log("amountIn :",Number(amountIn));
    //slippage test
    let denominator = BigNumber.from("100")
    let numerator = BigNumber.from("110")
    let maxmumInputAmount = amountIn.mul(numerator).div(denominator);
    console.log("maxmumInputAmount :",Number(maxmumInputAmount));

    const wrapEth = false;
    const outputUnwrapEth = false;
    const inputWrapWTON = false;
    const outputUnwrapTON = false;

    await auraContract.connect(admin1).approve(swapperV2.address, maxmumInputAmount);
    console.log("approve success");

    const params = getExactOutputParams(
        admin1.address,
        reversePath,
        maxmumInputAmount,
        amountOut
    );

    console.log("let's go transaction");
    const tx = await swapperV2
      .connect(admin1)
      .exactOutput(params, wrapEth, outputUnwrapEth, inputWrapWTON, outputUnwrapTON);
    await tx.wait();
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

