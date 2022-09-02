/*
    1) just test the this functions -> account1, account2 before TONamount, WTONamount -> after TONamount, WTONAmount
    2) you fixed decimal calcul -> exact execute!   
    3) you deploy ton, wton that need
*/  
const { messagePrefix } = require("@ethersproject/hash");
const {
    BigNumber,
    FixedFormat,
    FixedNumber,
    formatFixed,
    parseFixed
    // Types
    // BigNumberish
} = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    ICO20Contracts,
} = require("../utils/ico_test_deploy_ethers.js");

const {
    deployedUniswapV3Contracts,
    FeeAmount,
    TICK_SPACINGS,
    getMinTick,
    getMaxTick,
    getNegativeOneTick,
    getPositiveOneMaxTick,
    encodePriceSqrt,
    getUniswapV3Pool,
    getBlock,
    mintPosition2,
    getTick,
    // getMaxLiquidityPerTick,
  } = require("./uniswap-v3/uniswap-v3-contracts");

const { getAddresses, findSigner, setupContracts } = require("../utils/utils.js");
const TON_ABI = require("../abis/TON.json");
const WTON_ABI = require("../abis/WTON.json");
const TOS_ABI = require("../abis/TOS.json");
const WETH_ABI = require("../abis/WETH.json");

let ico20Contracts;
let defaultSender;
let tonSwapper;

let wtonuniAmount = ethers.utils.parseUnits("10", 27);
let tonuniAmount = ethers.utils.parseUnits("10", 18);

let wtonTokenPoolAddress;
let wtonTokenPool;

let account1;
let account2;
let poolcreator;
let contractOwner;

let admin;

let erc20token;
let erc20TokenContract;

let poolfactory;
let npm;
let swapRouter;
let nonfungibleTokenPD;

let ton;
let wton;
let tos;
let weth;
let aura;
let lyda;

let minimumAmount;

const tokenPooluniAmount = ethers.utils.parseUnits("100000", 18);
const wtonPooluniAmount = ethers.utils.parseUnits("100000", 27);

const oneETH = ethers.utils.parseUnits("1", 18);
const oneWTON = ethers.utils.parseUnits("1", 27);

let uniswapInfo={
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "",
    wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
    wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
    wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
    tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    _fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
}
 
let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
let auraAddress = "0xaEC59E5b4f8DbF513e260500eA96EbA173F74149";
let lydaAddress = "0xE1B0630D7649CdF503eABc2b6423227Be9605247";

describe("swap", function () {

    beforeEach(async function () {
        const addresses = await getAddresses();
        ico20Contracts = new ICO20Contracts();
        defaultSender = addresses[0];
        admin = await findSigner(addresses[0]);
        account1 = await findSigner(addresses[1]);
        account2 = await findSigner(addresses[2]);
        poolcreator = await findSigner(addresses[3]);
        contractOwner = await findSigner(addresses[4]);

        // let lockTosAdmin = 0x5b6e72248b19F2c5b88A4511A6994AD101d0c287;
        // await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);

        // let _lockTosAdmin = await ethers.getSigner(lockTosAdmin);

        //give the 10ETH
        await hre.ethers.provider.send("hardhat_setBalance", [
            admin.address,
            "0x8ac7230489e80000",
        ]);

        // let balanceETH = await ethers.provider.getBalance(admin.address);
        // console.log("balanceETH : ", Number(balanceETH));
    }); 

    describe("# 1. Deploy the ton, wton, token contract", async function () {
        it("#1-1. setting the TON", async () => {
            ton = new ethers.Contract( tonAddress, TON_ABI.abi, ethers.provider );
        })

        it("#1-2. setting the WTON", async () => {
            wton = new ethers.Contract(uniswapInfo.wton, WTON_ABI.abi, ethers.provider );
        })

        it("#1-3. setting the TOS(token)", async () => {
            tos = new ethers.Contract(uniswapInfo.tos, TOS_ABI.abi, ethers.provider );
        })

        it("#1-4. setting the WETH", async () => {
            weth = new ethers.Contract(uniswapInfo.weth, WETH_ABI, ethers.provider );
        })

        it("#1-5. setting the AURA", async () => {
            aura = new ethers.Contract(auraAddress, TOS_ABI.abi, ethers.provider ); 
        })

        it("#1-6. setting the LYDA", async () => {
            lyda = new ethers.Contract(lydaAddress, TOS_ABI.abi, ethers.provider ); 
        })
    });

    describe("#2. Deploy the TONSwapperContract", async () => {
        it("#2-1. deploy swap contract", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            tonSwapper = await tonSwapperFactory.deploy(
                wton.address, 
                ton.address,
                tos.address,
                uniswapInfo.swapRouter
            );
            await tonSwapper.deployed();
            // console.log(tonSwapper.address);
        })

        it("#2-2. ETH deposit and get WETH ", async () => {
            let beforeAmount = await weth.balanceOf(admin.address);
            // console.log("beforeAmount :",beforeAmount);
            expect(beforeAmount).to.be.equal(0);

            await weth.connect(admin).deposit({value: oneETH});

            let afterAmount = await weth.balanceOf(admin.address);
            console.log("afterAmount :",Number(afterAmount));
            expect(Number(afterAmount)).to.be.equal(Number(oneETH));
        })
    })

    describe("#3. quoter test", async () => {
        it("quoter test", async () => {
            // await weth.connect(admin).approve(tonSwapper.address, oneETH);
            let tx = await tonSwapper.connect(admin).quoterTest(weth.address);
            await tx.wait();
        })

        it("quoter test2", async () => {
            // await weth.connect(admin).approve(tonSwapper.address, oneETH);
            let tx = await tonSwapper.connect(admin).quoterTest2(weth.address);
            await tx.wait();
        })

        it("quoter test3 callstatic", async () => {
            // await weth.connect(admin).approve(tonSwapper.address, oneETH);
            let tx = await tonSwapper.callStatic.quoterTest(weth.address);
            console.log("tx : ", tx);
        })

        it("quoter test4 callstatic", async () => {
            // await weth.connect(admin).approve(tonSwapper.address, oneETH);
            let tx = await tonSwapper.callStatic.quoterTest2(weth.address);
            console.log("tx : ", tx);
        })

        it("multiQuoter test1 callstatic(wton -> eth -> tos)", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterInputWTONAmount(weth.address,tos.address,oneWTON);
            console.log("tosAmount : ", Number(tx));
        })
    })

    describe("#4. test the token -> TON swap", async () => {
        it("#4-1. minimumAmount WETH -> WTON", async () => {
            let tx = await tonSwapper.callStatic.quoterTest(weth.address);
            console.log("wtonAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#4-2. don't tokenToTON before approve", async () => {
            let tx = tonSwapper.connect(admin).tokenToTON(weth.address,oneETH,minimumAmount);

            await expect(tx).to.be.revertedWith("SafeERC20: low-level call failed")
        })

        it("#4-3. tokenToTON after approve (WETH -> TON swap)", async () => {
            let beforeAmount = await ton.balanceOf(admin.address);
            if(beforeAmount == 0){
                expect(beforeAmount).to.be.equal(0);
            }

            await weth.connect(admin).approve(tonSwapper.address, oneETH);
            await tonSwapper.connect(admin).tokenToTON(weth.address,oneETH,minimumAmount);
           
            let afterAmount = await ton.balanceOf(admin.address);
            console.log("afterAmount :", Number(afterAmount));
            expect(afterAmount).to.be.above(0);
        })
    })

    describe("#5. test the TON -> Token(TOS) singleSwap", async () => {
        it("#5-1. minimumAmount TON-> TOS", async () => {
            let tx = await tonSwapper.callStatic.quoterTest2(tos.address);
            console.log("tosAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#5-2. don't tonToToken before approve", async () => {
            let tx = tonSwapper.connect(admin).tonToToken(tos.address,oneETH,minimumAmount);

            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })

        it("#5-3. tonToToken after approve (TON -> TOS swap)", async () => {
            let beforeAmount = await tos.balanceOf(admin.address);
            console.log("beforeAmount :",beforeAmount);
            expect(beforeAmount).to.be.equal(0);

            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToToken(tos.address,oneETH,minimumAmount);

            let afterAmount = await tos.balanceOf(admin.address);
            console.log("afterAmount :",afterAmount);
            expect(afterAmount).to.be.above(0);
        })
    })

    describe("#6. ton -> wton && wton -> ton test", async () => {
        it("#6-1. ton -> wton test", async () => {
            let beforeWTONamount = await wton.balanceOf(admin.address);
            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToWton(oneETH);
            let afterWTONamount = await wton.balanceOf(admin.address);
            let result = Number(afterWTONamount)-Number(beforeWTONamount);
            expect(Number(result)).to.be.equal(Number(oneWTON));
        })

        it("#6-2. wton -> ton test", async () => {
            let beforeTONamount = await ton.balanceOf(admin.address);
            await wton.connect(admin).approve(tonSwapper.address,oneWTON);
            await tonSwapper.connect(admin).wtonToTON(oneWTON);
            let afterTONamount = await ton.balanceOf(admin.address);
            let result = Number(afterTONamount)-Number(beforeTONamount);
            expect(Number(result)).to.be.equal(Number(oneETH));
        })
    })

    describe("#7. ton To Token multiSwap", async () => {
        it("#7-1. calculate the minimumAmount for Get AURA", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterInputTONAmount(tos.address,auraAddress,oneETH);
            console.log("tosAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#7-2. swap the TON -> WTON -> TOS -> AURA", async () => {
            let beforeAURAamount = await aura.balanceOf(admin.address);
            console.log("beforeAURAamount : ", Number(beforeAURAamount));
            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToTokenMulti(auraAddress,oneETH,minimumAmount);
            let afterARUAamount = await aura.balanceOf(admin.address);
            console.log("afterARUAamount : ", Number(afterARUAamount));
            let result = Number(afterARUAamount)-Number(beforeAURAamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })
    })

    describe("#8. Token To TON multiSwap", async () => {
        it("#8-1. calculate the minimumAmount for TON", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterInputTokenAmount(auraAddress,oneETH);
            console.log("tonAmount : ", Number(tx.tonAmount));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.tonAmount.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#8-2. swap the ARUA -> TOS -> WTON -> TON", async () => {
            let beforeTONamount = await ton.balanceOf(admin.address);
            console.log("beforeTONamount : ", Number(beforeTONamount));
            await aura.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToTonMulti(auraAddress,oneETH,minimumAmount);
            let afterTONamount = await ton.balanceOf(admin.address);
            console.log("afterTONamount : ", Number(afterTONamount));
            let result = Number(afterTONamount)-Number(beforeTONamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })
    })

    describe("#9. Token To Token multiSwap", async () => {
        it("#9-1. calculate the minimumAmount Token To Token", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                auraAddress,
                tos.address,
                lydaAddress,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#9-2. swap the AURA -> TOS -> LYDA", async () => {
            let beforeLYDAamount = await lyda.balanceOf(admin.address);
            expect(beforeLYDAamount).to.be.equal(0);
            console.log("beforeLYDAamount : ", Number(beforeLYDAamount));
            await aura.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToToken(auraAddress,lydaAddress,oneETH,minimumAmount);
            let afterLYDAamount = await lyda.balanceOf(admin.address);
            console.log("afterLYDAamount : ", Number(afterLYDAamount));
            expect(Number(afterLYDAamount)).to.be.gte(Number(minimumAmount));
        })
    })
});
