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
const SWAP_ABI = require("../artifacts/contracts/Swapper.sol/Swapper.json");

let ico20Contracts;
let defaultSender;
let tonSwapper;
let tonSwapperProxy;
let tonSwapperLogic;

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
let dai;

let minimumAmount;
let maxmumInputAmount;

const tokenPooluniAmount = ethers.utils.parseUnits("100000", 18);
const wtonPooluniAmount = ethers.utils.parseUnits("100000", 27);

let bigNumber100 = BigNumber.from("100")
let bigNumber95 = BigNumber.from("95")

const oneETH = ethers.utils.parseUnits("1", 18);
const oneWTON = ethers.utils.parseUnits("1", 27);
const diffEqo = ethers.utils.parseUnits("1", 9);

let uniswapInfo={
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "",
    wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
    wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
    tosLydaPool: "0x3AE1E82F20C134867514ecd1E615856b312fB685",
    tosAuraPool: "0xBdDD3a50Bd2AFd27aED05Cc9FE1c8D67fCAA3218",
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
let daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
let hexlydaAddress = "E1B0630D7649CdF503eABc2b6423227Be9605247";
let hextosAddress = "409c4D8cd5d2924b9bc5509230d16a61289c8153";
let hexauraAddress = "aEC59E5b4f8DbF513e260500eA96EbA173F74149";

// const calculMinimumAmount  = async (address) => {
//     let tx2 = await tonSwapper.callStatic.quoterTest(address);
//     let bigNumber2100 = BigNumber.from("100")
//     let bigNumber295 = BigNumber.from("95")
//     let minimumAmount2 = tx2.mul(bigNumber295).div(bigNumber2100);
//     return minimumAmount2;
// }

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

        await hre.ethers.provider.send("hardhat_setBalance", [
            account1.address,
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

        it("#1-7. setting the DAI", async () => {
            dai = new ethers.Contract(daiAddress, TOS_ABI.abi, ethers.provider ); 
        })
    });

    describe("#2. Deploy the TONSwapperContract", async () => {
        it("#2-1. deploy swap contract", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swapper");
            tonSwapperLogic = await tonSwapperFactory.deploy(
            );
            await tonSwapperLogic.deployed();
            // console.log(tonSwapper.address);
        })

        it("#2-2. deploy swapProxy contract and initialize", async () => {
            const tonSwapProxy = await ethers.getContractFactory("SwapperProxy");
            tonSwapperProxy = await tonSwapProxy.deploy();
            await tonSwapperProxy.deployed();

            await tonSwapperProxy.connect(admin).upgradeTo(tonSwapperLogic.address);
        })

        it("#2-3. swapProxy initialize", async () => {
            await tonSwapperProxy.initialize(
                wton.address,
                ton.address,
                tos.address,
                uniswapInfo.swapRouter,
                weth.address
            )
        })

        it("#2-4. swapProxy connection", async () => {
            tonSwapper = new ethers.Contract( tonSwapperProxy.address, SWAP_ABI.abi, ethers.provider);
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
        it("quoter test callstatic", async () => {
            let tx = await tonSwapper.callStatic.tokenABQuoter(
                wton.address,
                weth.address,
                3000,
                oneWTON
            )
            console.log("tx : ", tx);
        })

        it("multiQuoter test1 callstatic(wton -> eth -> tos)", async () => {            
            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                wton.address,
                weth.address,
                tos.address,
                oneWTON
            )
            console.log("tosAmount : ", Number(tx));
        })

        // it("bytes test", async () => {
        //     var dec = 40000000000000000000000;
        //     var hex = dec.toString(16);
        //     console.log("hex :",hex);
        //     var data = 1;
        //     var hex2 = data.toString(16);
        //     console.log("hex2 :",hex2);
        //     // console.log("hex : ", hex, " hex.length : ", hex.length);
        //     let length = hex.length;
        //     let length2 = hex2.length;
        //     for(let i = 1; i<=(40-length); i++) {
        //         hex = "0"+hex;
        //     }
        //     // if(length2 == 1) {
        //     //     hex2 = "0"+hex2;
        //     // }
        //     for(i= 1; i<=(40-length2); i++) {
        //         hex2 = "0"+hex2;
        //     }
        //     let hex3 = "0x"+hex2+hex+hexlydaAddress;
        //     console.log("hex3 : ", hex3);
        //     // for(let i = 1; i<=(64-length); i++) {
        //     //     hex = "0"+hex;
        //     //     if (i==(64-length)) {
        //     //         hex = "0x" + hex;
        //     //     }
        //     // }
        //     // console.log("hex :",hex);
        //     await ton.connect(admin).approveAndCall(tonSwapper.address, oneETH, hex3);
        // })
    })

    describe("#4. test the tokenToTON (token to TON or WTON)", async () => {
        it("#4-1. minimumAmount WETH -> WTON", async () => {
            let tx = await tonSwapper.callStatic.tokenABQuoter(
                weth.address,
                wton.address,
                3000,
                oneETH
            )

            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);

            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));

        })

        it("#4-2. tokenToTON (ETH -> WTON swap)", async () => {
            let beforeAmount = await wton.balanceOf(admin.address);
            await tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                minimumAmount,
                true,
                true,
                {value : oneETH}
            )
            let afterAmount = await wton.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })

        it("#4-3. tokenToTON (ETH -> TON swap)", async () => {
            minimumAmount = await tonSwapper.callStatic.tokenABQuoter(
                weth.address,
                wton.address,
                3000,
                oneETH
            )

            minimumAmount = minimumAmount.mul(bigNumber95).div(bigNumber100);
            
            let beforeAmount = await ton.balanceOf(admin.address);
            await tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                minimumAmount,
                false,
                true,
                {value : oneETH}
            )
            let afterAmount = await ton.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            minimumAmount = minimumAmount/diffEqo;
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })

        it("#4-4. don't tokenToTON before approve", async () => {
            minimumAmount = await tonSwapper.callStatic.tokenABQuoter(
                weth.address,
                wton.address,
                3000,
                oneETH
            )

            tx = tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                minimumAmount,
                false,
                false
            );

            await expect(tx).to.be.revertedWith("SafeERC20: low-level call failed")
        })

        it("#4-5. tokenToTON after approve (WETH -> TON swap)", async () => {
            minimumAmount = await tonSwapper.callStatic.tokenABQuoter(
                weth.address,
                wton.address,
                3000,
                oneETH
            )
            
            minimumAmount = minimumAmount.mul(bigNumber95).div(bigNumber100);

            let beforeAmount = await ton.balanceOf(admin.address);

            await weth.connect(admin).approve(tonSwapper.address, oneETH);
            await tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                minimumAmount,
                false,
                false
            );
           
            let afterAmount = await ton.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            minimumAmount = minimumAmount/diffEqo;
            expect(Number(result)).to.be.above(Number(minimumAmount));
            // console.log("afterAmount :", Number(afterAmount));
            // expect(afterAmount).to.be.above(0);
        })

        it("#4-6. tokenToTON (WETH -> WTON swap)", async () => {
            minimumAmount = await tonSwapper.callStatic.tokenABQuoter(
                weth.address,
                wton.address,
                3000,
                oneETH
            )

            minimumAmount = minimumAmount.mul(bigNumber95).div(bigNumber100);

            await weth.connect(admin).deposit({value: oneETH});

            let beforeAmount = await wton.balanceOf(admin.address);

            await weth.connect(admin).approve(tonSwapper.address, oneETH);
            await tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                minimumAmount,
                true,
                false
            )
            let afterAmount = await wton.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })
    })

    describe("#5. test the tonToToken (TON or WTON to token)", async () => {
        it("#5-1. minimumAmount TON-> TOS", async () => {
            let tx = await tonSwapper.callStatic.tokenABQuoter(
                wton.address,
                tos.address,
                3000,
                oneWTON
            )

            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#5-2. don't tonToToken before approve", async () => {
            let tx = tonSwapper.connect(admin).tonToToken(
                admin.address,
                tos.address,
                oneETH,
                minimumAmount,
                false
            );

            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })

        it("#5-3. tonToToken after approve (TON -> TOS swap)", async () => {
            let beforeAmount = await tos.balanceOf(admin.address);
            console.log("beforeAmount :",beforeAmount);
            expect(beforeAmount).to.be.equal(0);

            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToToken(
                admin.address,
                tos.address,
                oneETH,
                minimumAmount,
                false
            );

            let afterAmount = await tos.balanceOf(admin.address);
            console.log("afterAmount :",afterAmount);
            expect(afterAmount).to.be.above(0);
        })

        it("#5-4. tonToToken after approve (WTON -> TOS swap)", async () => {
            let tx = await tonSwapper.callStatic.tokenABQuoter(
                wton.address,
                tos.address,
                3000,
                oneWTON
            )

            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);

            let beforeAmount = await tos.balanceOf(admin.address);

            await wton.connect(admin).approve(tonSwapper.address,oneWTON);
            await tonSwapper.connect(admin).tonToToken(
                admin.address,
                tos.address,
                oneWTON,
                minimumAmount,
                true
            );

            let afterAmount = await tos.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            expect(Number(result)).to.be.above(Number(minimumAmount));
            // console.log("afterAmount :",afterAmount);
            // expect(afterAmount).to.be.above(0);
        })

        it("#5-5. tokenToTON (TOS -> TON swap)", async () => {
            minimumAmount = await tonSwapper.callStatic.tokenABQuoter(
                tos.address,
                wton.address,
                3000,
                oneETH
            )

            minimumAmount = minimumAmount.mul(bigNumber95).div(bigNumber100);

            let beforeAmount = await ton.balanceOf(admin.address);

            await tos.connect(admin).approve(tonSwapper.address, oneETH);
            await tonSwapper.connect(admin).tokenToTon(
                tos.address,
                oneETH,
                minimumAmount,
                false,
                false
            )
            let afterAmount = await ton.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            minimumAmount = minimumAmount/diffEqo;
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })

        it("#5-6. tokenToTON (TOS -> WTON swap)", async () => {
            minimumAmount = await tonSwapper.callStatic.tokenABQuoter(
                tos.address,
                wton.address,
                3000,
                oneETH
            )

            minimumAmount = minimumAmount.mul(bigNumber95).div(bigNumber100);

            let beforeAmount = await wton.balanceOf(admin.address);

            await tos.connect(admin).approve(tonSwapper.address, oneETH);
            await tonSwapper.connect(admin).tokenToTon(
                tos.address,
                oneETH,
                minimumAmount,
                true,
                false
            )
            let afterAmount = await wton.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })

        it("5-7. tonToToken approveAndCall (TON -> TOS swap)", async () => {
            let tx = await tonSwapper.callStatic.tokenABQuoter(
                wton.address,
                tos.address,
                3000,
                oneWTON
            )

            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
            
            var dec = Number(minimumAmount);
            // console.log("dec1 :", dec);
            // dec = 2877088337990243300;
            // console.log("dec2 :", dec);
            var hex = dec.toString(16);
            var selector = 1;
            var hex2 = selector.toString(16);
            let length = hex.length;
            let length2 = hex2.length;
            for(let i = 1; i<=(40-length); i++) {
                hex = "0"+hex;
            }
            for(i= 1; i<=(40-length2); i++) {
                hex2 = "0"+hex2;
            }
            let hex3 = "0x"+hex2+hex+hextosAddress;
            console.log("hex3 : ", hex3);

            let beforeAmount = await tos.balanceOf(admin.address);

            await ton.connect(admin).approveAndCall(tonSwapper.address, oneETH, hex3);

            let afterAmount = await tos.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })

        it("5-8. tonToToken approveAndCall (WTON -> TOS swap)", async () => {
            let tx = await tonSwapper.callStatic.tokenABQuoter(
                wton.address,
                tos.address,
                3000,
                oneWTON
            )

            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));

            var dec = Number(minimumAmount);
            // console.log("dec1 :", dec);
            // dec = 2877088337990243300;
            // console.log("dec2 :", dec);
            var hex = dec.toString(16);
            var selector = 1;
            var hex2 = selector.toString(16);
            let length = hex.length;
            let length2 = hex2.length;
            for(let i = 1; i<=(40-length); i++) {
                hex = "0"+hex;
            }
            for(i= 1; i<=(40-length2); i++) {
                hex2 = "0"+hex2;
            }
            let hex3 = "0x"+hex2+hex+hextosAddress;
            console.log("hex3 : ", hex3);

            let beforeAmount = await tos.balanceOf(admin.address);

            await wton.connect(admin).approveAndCall(tonSwapper.address, oneWTON, hex3);

            let afterAmount = await tos.balanceOf(admin.address);
            let result = Number(afterAmount)-Number(beforeAmount);
            expect(Number(result)).to.be.above(Number(minimumAmount));
        })
    })

    describe("#6. ton -> wton && wton -> ton test", async () => {
        it("#6-1. ton -> wton test", async () => {
            let beforeWTONamount = await wton.balanceOf(admin.address);
            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToWton(oneETH);
            let afterWTONamount = await wton.balanceOf(admin.address);
            let result = Number(afterWTONamount)-Number(beforeWTONamount);
            console.log("result : ",Number(result));
            // expect(Number(result)).to.be.equal(Number(oneWTON));
        })

        it("#6-2. wton -> ton test", async () => {
            let beforeTONamount = await ton.balanceOf(admin.address);
            await wton.connect(admin).approve(tonSwapper.address,oneWTON);
            await tonSwapper.connect(admin).wtonToTON(oneWTON);
            let afterTONamount = await ton.balanceOf(admin.address);
            let result = Number(afterTONamount)-Number(beforeTONamount);
            expect(Number(result)).to.be.equal(Number(oneETH));
        })

        it("#6-3. approveAndCall ton -> wton test", async () => {
            let beforeWTONamount = await wton.balanceOf(admin.address);
            
            let data = 1;
            var hex = data.toString(16);
            let length = hex.length;
            for(i= 1; i<=(120-length); i++) {
                hex = "0"+hex;
                if (i==(120-length)) {
                    hex = "0x" + hex;
                }
            }
            // console.log(hex);
            await ton.connect(admin).approveAndCall(tonSwapper.address,oneETH,hex);

            let afterWTONamount = await wton.balanceOf(admin.address);
            let result = Number(afterWTONamount)-Number(beforeWTONamount);
            console.log("result : ",Number(result));
            // expect(Number(result)).to.be.equal(Number(oneWTON)); 
        })

        it("#6-4. approveAncCall wton -> ton test", async () => {
            let beforeTONamount = await ton.balanceOf(admin.address);

            // let data = 0x01;
            let data = 0;
            var hex = data.toString(16);
            let length = hex.length;
            for(i= 1; i<=(120-length); i++) {
                hex = "0"+hex;
                if (i==(120-length)) {
                    hex = "0x" + hex;
                }
            }
            // console.log(hex);
            await wton.connect(admin).approveAndCall(tonSwapper.address,oneWTON,hex);

            let afterTONamount = await ton.balanceOf(admin.address);
            let result = Number(afterTONamount)-Number(beforeTONamount);
            expect(Number(result)).to.be.equal(Number(oneETH));
        })
    })

    describe("#7. ton To Token multiSwap (tonToTokenMulti)", async () => {
        it("#7-1. calculate the minimumAmount for Get AURA", async () => {
            // let tx = await tonSwapper.callStatic.multiQuoterInputTONAmount(tos.address,auraAddress,oneETH);
            // console.log("auraAmount : ", Number(tx));

            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                wton.address,
                tos.address,
                auraAddress,
                oneWTON
            )
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
            await tonSwapper.connect(admin).tonToTokenMulti(
                admin.address,
                auraAddress,
                oneETH,
                minimumAmount,
                false
            );
            let afterARUAamount = await aura.balanceOf(admin.address);
            console.log("afterARUAamount : ", Number(afterARUAamount));
            let result = Number(afterARUAamount)-Number(beforeAURAamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })

        it("#7-3. calculate the minimumAmount for Get AURA", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                wton.address,
                tos.address,
                auraAddress,
                oneWTON
            );
            console.log("auraAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })


        it("#7-4. swap the WTON -> TOS -> AURA", async () => {
            let beforeAURAamount = await aura.balanceOf(admin.address);
            console.log("beforeAURAamount : ", Number(beforeAURAamount));
            await wton.connect(admin).approve(tonSwapper.address,oneWTON);
            await tonSwapper.connect(admin).tonToTokenMulti(
                admin.address,
                auraAddress,
                oneWTON,
                minimumAmount,
                true
            );
            let afterARUAamount = await aura.balanceOf(admin.address);
            console.log("afterARUAamount : ", Number(afterARUAamount));
            let result = Number(afterARUAamount)-Number(beforeAURAamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })

        it("#7-5. approveAndCall swap the TON -> WTON -> TOS -> AURA", async () => {
            // let tx = await tonSwapper.callStatic.multiQuoterInputTONAmount(tos.address,auraAddress,oneETH);

            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                wton.address,
                tos.address,
                auraAddress,
                oneWTON
            )
            // console.log("auraAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            // console.log("minimumAmount : ", minimumAmount);
            // console.log("minimumAmount : ", Number(minimumAmount));

            var dec = Number(minimumAmount);
            var hex = dec.toString(16);
            var selector = 2;
            var hex2 = selector.toString(16);
            let length = hex.length;
            let length2 = hex2.length;
            for(let i = 1; i<=(40-length); i++) {
                hex = "0"+hex;
            }
            for(i= 1; i<=(40-length2); i++) {
                hex2 = "0"+hex2;
            }
            let hex3 = "0x"+hex2+hex+hexauraAddress;
            console.log("hex3 : ", hex3);


            let beforeAURAamount = await aura.balanceOf(admin.address);
            console.log("beforeAURAamount : ", Number(beforeAURAamount));

            await ton.connect(admin).approveAndCall(tonSwapper.address, oneETH, hex3);

            let afterARUAamount = await aura.balanceOf(admin.address);
            console.log("afterARUAamount : ", Number(afterARUAamount));
            let result = Number(afterARUAamount)-Number(beforeAURAamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })

        it("#7-6. approveAndCall swap the WTON -> TOS -> AURA", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                wton.address,
                tos.address,
                auraAddress,
                oneWTON
            );
            // console.log("auraAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            // console.log("minimumAmount : ", minimumAmount);
            // console.log("minimumAmount : ", Number(minimumAmount));

            var dec = Number(minimumAmount);
            var hex = dec.toString(16);
            var selector = 2;
            var hex2 = selector.toString(16);
            let length = hex.length;
            let length2 = hex2.length;
            for(let i = 1; i<=(40-length); i++) {
                hex = "0"+hex;
            }
            for(i= 1; i<=(40-length2); i++) {
                hex2 = "0"+hex2;
            }
            let hex3 = "0x"+hex2+hex+hexauraAddress;
            console.log("hex3 : ", hex3);

            let beforeAURAamount = await aura.balanceOf(admin.address);
            console.log("beforeAURAamount : ", Number(beforeAURAamount));

            await wton.connect(admin).approveAndCall(tonSwapper.address, oneWTON, hex3);

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
            await tonSwapper.connect(admin).tokenToTonMulti(
                auraAddress,
                oneETH,
                minimumAmount,
                false
            );
            let afterTONamount = await ton.balanceOf(admin.address);
            console.log("afterTONamount : ", Number(afterTONamount));
            let result = Number(afterTONamount)-Number(beforeTONamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })

        it("#8-3. calculate the minimumAmount for WTON", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterInputTokenAmount(auraAddress,oneETH);
            console.log("tonAmount : ", Number(tx.tonAmount));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.wtonAmount.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#8-4. swap the ARUA -> TOS -> WTON", async () => {
            let beforeWTONamount = await wton.balanceOf(admin.address);
            console.log("beforeWTONamount : ", Number(beforeWTONamount));
            await aura.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToTonMulti(
                auraAddress,
                oneETH,
                minimumAmount,
                true
            );
            let afterWTONamount = await wton.balanceOf(admin.address);
            console.log("afterWTONamount : ", Number(afterWTONamount));
            let result = Number(afterWTONamount)-Number(beforeWTONamount);
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
            await tonSwapper.connect(admin).tokenToToken(
                auraAddress,
                lydaAddress,
                oneETH,
                minimumAmount,
                false
            );
            let afterLYDAamount = await lyda.balanceOf(admin.address);
            console.log("afterLYDAamount : ", Number(afterLYDAamount));
            expect(Number(afterLYDAamount)).to.be.gte(Number(minimumAmount));
        })

        it("#9-3. calculate the minimumAmount the ETH -> TOS -> LYDA", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                weth.address,
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

        it("#9-4. swap the ETH -> TOS -> LYDA", async () => {
            let beforeLYDAamount = await lyda.balanceOf(admin.address);
            console.log("beforeLYDAamount : ", Number(beforeLYDAamount));
            await tonSwapper.connect(admin).tokenToToken(
                weth.address,
                lydaAddress,
                oneETH,
                minimumAmount,
                true,
                {value : oneETH}
            );
            let afterLYDAamount = await lyda.balanceOf(admin.address);
            console.log("afterLYDAamount : ", Number(afterLYDAamount));
            let result = Number(afterLYDAamount)-Number(beforeLYDAamount);
            expect(Number(result)).to.be.gte(Number(minimumAmount));
        })
    })

    describe("#10. tokenToTokenArray Test", async () => {
        it("#10-1. minimumAmount LYDA -> TOS -> AURA", async () => {
            let tx = await tonSwapper.callStatic.multiQuoterTokenToToken(
                lyda.address,
                tos.address,
                auraAddress,
                oneETH
            );
            console.log("auraAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber95 = BigNumber.from("95")
            minimumAmount = tx.mul(bigNumber95).div(bigNumber100);
            console.log("minimumAmount : ", minimumAmount);
            console.log("minimumAmount : ", Number(minimumAmount));
        })

        it("#10-2. swap LYDA -> TOS -> AURA", async () => {
            let beforeAURAamount = await aura.balanceOf(admin.address);
            console.log("beforeAURAamount : ", Number(beforeAURAamount));
            await lyda.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToTokenArray(
                [lyda.address,tos.address,aura.address],
                [3000,3000],
                oneETH,
                admin.address
            )
            let afterARUAamount = await aura.balanceOf(admin.address);
            console.log("afterARUAamount : ", Number(afterARUAamount));
            let result = Number(afterARUAamount)-Number(beforeAURAamount);
            console.log("result : ", Number(result));
        })

        it("#10-3. swap LYDA -> TOS -> WTON -> WETH -> DAI", async () => {
            let beforeDAIamount = await dai.balanceOf(admin.address);
            console.log("beforeDAIamount : ", Number(beforeDAIamount));
            await lyda.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToTokenArray(
                [lyda.address,tos.address,wton.address,weth.address,dai.address],
                [3000,3000,3000,500],
                oneETH,
                admin.address
            )
            let afterDAIamount = await dai.balanceOf(admin.address);
            console.log("afterDAIamount : ", Number(afterDAIamount));
            let result = Number(afterDAIamount)-Number(beforeDAIamount);
            console.log("result : ", Number(result));
        })
    })

    describe("#11. tonToTokenExactOutput test", async () => {
        it("#11-1. exactOutputQuoter test (WTON -> token)", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            console.log("wtonAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
            // console.log("maxmumInputAmount : ", maxmumInputAmount);
            console.log("maxmumInputAmount : ", Number(maxmumInputAmount));
        })

        it("#11-2. tonToTokenExactOutput (WTON -> TOS)", async () => {
            let beforeTOSAmount = await tos.balanceOf(admin.address)
            let beforeWTONAmount = await wton.balanceOf(admin.address)
            console.log("beforeTOSAmount : ",Number(beforeTOSAmount));
            console.log("beforeWTONAmount : ",Number(beforeWTONAmount));
            console.log("maxmumInputAmount : ",Number(maxmumInputAmount));

            await wton.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tonToTokenExactOutput(
                admin.address,
                tos.address,
                oneETH,
                maxmumInputAmount,
                true
            )
            let afterTOSAmount = await tos.balanceOf(admin.address)
            let afterWTONAmount = await wton.balanceOf(admin.address)
            console.log("afterTOSAmount : ",Number(afterTOSAmount));
            console.log("afterWTONAmount : ",Number(afterWTONAmount));

            let resultTOS = Number(afterTOSAmount)-Number(beforeTOSAmount);
            let resultWTON = Number(beforeWTONAmount)-Number(afterWTONAmount);
            console.log("resultWTON : ",resultWTON);
            console.log("resultTOS : ",resultTOS);
            expect(resultTOS).to.be.equal(Number(oneETH));
            expect(Number(maxmumInputAmount)).to.be.above(Number(resultWTON));
        })
    })

    describe("#12. tokenToTonExactOutput test", async () => {
        it("#12-1. exactOutputQuoter test (TOS(token) -> wton)", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                tos.address,
                wton.address,
                3000,
                oneWTON
            )

            console.log("wtonAmount : ", Number(tx));
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
            console.log("maxmumInputAmount : ", maxmumInputAmount);
            console.log("maxmumInputAmount : ", Number(maxmumInputAmount));
        })

        it("#12-2. tokenToTonExactOutput (TOS -> WTON)", async() => {
            await tos.connect(admin).transfer(account1.address,maxmumInputAmount);
            let beforeTOSAmount = await tos.balanceOf(account1.address)
            let beforeWTONAmount = await wton.balanceOf(account1.address)
            console.log("beforeTOSAmount : ",Number(beforeTOSAmount));
            console.log("beforeWTONAmount : ",Number(beforeWTONAmount));
            console.log("maxmumInputAmount : ",Number(maxmumInputAmount));

            await tos.connect(account1).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(account1).tokenToTonExactOutput(
                tos.address,
                oneWTON,
                maxmumInputAmount,
                true,
                false
            )
            let afterTOSAmount = await tos.balanceOf(account1.address)
            let afterWTONAmount = await wton.balanceOf(account1.address)
            console.log("afterTOSAmount : ",Number(afterTOSAmount));
            console.log("afterWTONAmount : ",Number(afterWTONAmount));

            let resultTOS = Number(beforeTOSAmount)-Number(afterTOSAmount);
            let resultWTON = Number(afterWTONAmount)-Number(beforeWTONAmount);
            console.log("resultWTON : ",resultWTON);
            console.log("resultTOS : ",resultTOS);
            expect(resultWTON).to.be.equal(Number(oneWTON));
            expect(Number(maxmumInputAmount)).to.be.above(Number(resultTOS));
        })
    })
});
