
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
const UNISWAPROUTER_ABI = require("../abis/SwapRouter.json");

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
let uniswapRouter;

let minimumAmount;
let maxmumInputAmount;
let maxmumInputAmount2;

const tokenPooluniAmount = ethers.utils.parseUnits("100000", 18);
const wtonPooluniAmount = ethers.utils.parseUnits("100000", 27);

let bigNumber100 = BigNumber.from("100")
let bigNumber95 = BigNumber.from("95")

const oneETH = ethers.utils.parseUnits("1", 18);
const tenETH = ethers.utils.parseUnits("10", 18);
const oneWTON = ethers.utils.parseUnits("1", 27);
const diffEqo = ethers.utils.parseUnits("1", 9);

const threeTOS = ethers.utils.parseUnits("3", 18);

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

        it("#1-8. setting the uniRouter", async () => {
            uniswapRouter = new ethers.Contract(uniswapInfo.swapRouter, UNISWAPROUTER_ABI.abi, ethers.provider);
            // console.log(uniswapRouter);
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

        it("#2-5. ETH deposit and get WETH ", async () => {
            let beforeAmount = await weth.balanceOf(admin.address);
            // console.log("beforeAmount :",beforeAmount);
            // expect(beforeAmount).to.be.equal(0);

            await weth.connect(admin).deposit({value: oneETH});

            let afterAmount = await weth.balanceOf(admin.address);
            // console.log("afterAmount :",Number(afterAmount));
            // expect(Number(afterAmount)).to.be.equal(Number(oneETH));
        })

    });

    describe("##callstatic test", async () => {
        it("TON -> TOS test", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                threeTOS
            )
            console.log("wtonAmount : ", Number(tx));
        })
    })

    describe("#3. tonSwapperV2 tokenToTON gasFee", async () => {
        it("#3-1. ETH -> WTON swap", async () => {
            await tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                0,
                true,
                true,
                {value : oneETH}
            )
        })

        it("#3-2. ETH -> TON swap", async () => {
            await tonSwapper.connect(admin).tokenToTon(
                weth.address,
                oneETH,
                0,
                false,
                true,
                {value : oneETH}
            )
        })
    })

    describe("#4. uniswapRouter tokenToTON gasFee", async () => {
        it("#4-1. ETH -> WTON swap", async () => {
            await weth.connect(admin).deposit(
                {value: oneETH}
            )
            await weth.connect(admin).approve(uniswapRouter.address,oneETH);
            // let wethBalance = await weth.balanceOf(admin.address);
            // console.log("wethBalance : ", Number(wethBalance));
            const params = {
                tokenIn: weth.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            await uniswapRouter.connect(admin).exactInputSingle(params);
        })


        it("#4-2. ETH -> TON swap", async () => {
            await weth.connect(admin).deposit(
                {value: oneETH}
            )
            await weth.connect(admin).approve(uniswapRouter.address,oneETH);
            // let wethBalance = await weth.balanceOf(admin.address);
            // console.log("wethBalance : ", Number(wethBalance));
            const params = {
                tokenIn: weth.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            await uniswapRouter.connect(admin).exactInputSingle(params);

            await wton.connect(admin).swapToTON(oneWTON);
        })
    })

    describe("#5. tonSwapperV2 tokenToTonExactOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                weth.address,
                wton.address,
                3000,
                oneWTON
            )
        
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#5-1. ETH -> WTON swap", async () => {
            await tonSwapper.connect(admin).tokenToTonExactOutput(
                weth.address,
                oneWTON,
                maxmumInputAmount,
                true,
                true,
                {value : maxmumInputAmount}
            )
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                weth.address,
                wton.address,
                3000,
                oneWTON
            )
        
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#5-2. ETH -> WTON -> TON swap", async () => {
            await tonSwapper.connect(admin).tokenToTonExactOutput(
                weth.address,
                oneWTON,
                maxmumInputAmount,
                false,
                true,
                {value : maxmumInputAmount}
            )
        })
    })

    describe("#6. uniswapRouter tokenToTonExactOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                weth.address,
                wton.address,
                3000,
                oneWTON
            )
        
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#6-1. ETH -> WTON swap", async () => {
            await weth.connect(admin).deposit(
                {value: oneETH}
            )
            await weth.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);
            // let wethBalance = await weth.balanceOf(admin.address);
            // console.log("wethBalance : ", Number(wethBalance));
            const params = {
                tokenIn: weth.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneWTON,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                weth.address,
                wton.address,
                3000,
                oneWTON
            )
        
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#6-2. ETH -> WTON -> TON swap", async () => {
            await weth.connect(admin).deposit(
                {value: oneETH}
            )
            await weth.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);
            // let wethBalance = await weth.balanceOf(admin.address);
            // console.log("wethBalance : ", Number(wethBalance));
            const params = {
                tokenIn: weth.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneWTON,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);

            await wton.connect(admin).swapToTON(oneWTON);
        })
    })

    describe("#7. tonSwapperV2 tonToToken gasFee", async () => {
        it("#7-1. TON -> WTON -> TOS gasFee", async () => {
            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToToken(
                tos.address,
                oneETH,
                0,
                false
            );
        })

        it("#7-2. WTON -> TOS gasFee", async () => {
            await wton.connect(admin).approve(tonSwapper.address,oneWTON);
            await tonSwapper.connect(admin).tonToToken(
                tos.address,
                oneWTON,
                0,
                true
            );
        })

        it("#7-3. approveAndCall TON -> WTON -> TOS gasFee", async () => {
            var dec = Number(0);

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

            await ton.connect(admin).approveAndCall(tonSwapper.address, oneETH, hex3);
        }) 

        it("#7-4. approveAndCall TON -> WTON -> TOS gasFee", async () => {
            var dec = Number(0);

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

            await wton.connect(admin).approveAndCall(tonSwapper.address, oneWTON, hex3);
        })
    })

    describe("#8. uniswapRouter tonToToken gasFee", async () => {
        it("#8-1. TON -> WTON -> TOS gasFee", async () => {
            await ton.connect(admin).approve(wton.address,oneETH);
            await wton.connect(admin).swapFromTON(oneETH);
            await wton.connect(admin).approve(uniswapRouter.address,oneWTON);
            
            const params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneWTON,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            
            await uniswapRouter.connect(admin).exactInputSingle(params);
        })

        it("#8-2. WTON -> TOS gasFee", async () => {
            await wton.connect(admin).approve(uniswapRouter.address,oneWTON);
            
            const params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneWTON,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };

            await uniswapRouter.connect(admin).exactInputSingle(params);
        })
    })

    describe("#9. tonSwapperV2 tonToTokenExactOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#9-1. TON -> WTON -> TOS gasFee", async () => {
            await ton.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tonToTokenExactOutput(
                tos.address,
                oneETH,
                maxmumInputAmount,
                false
            )
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#9-2. WTON -> TOS gasFee", async () => {
            await wton.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tonToTokenExactOutput(
                tos.address,
                oneETH,
                maxmumInputAmount,
                true
            )
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#9-3. approveAndCall TON -> WTON -> TOS gasFee", async () => {
            var dec = Number(oneETH);
            var hex = dec.toString(16);
            var selector = 3;
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
            
            await ton.connect(admin).approveAndCall(tonSwapper.address, maxmumInputAmount, hex3);
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#9-4. approveAndCall WTON -> TOS gasFee", async () => {
            var dec = Number(oneETH);
            var hex = dec.toString(16);
            var selector = 3;
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
            
            await wton.connect(admin).approveAndCall(tonSwapper.address, maxmumInputAmount, hex3);
        })
    })

    describe("#10. uniswapRouter tonToTokenExactOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#10-1. TON -> WTON -> TOS gasFee", async () => {
            await ton.connect(admin).approve(wton.address,maxmumInputAmount);
            await wton.connect(admin).swapFromTON(maxmumInputAmount);
            maxmumInputAmount = maxmumInputAmount.mul(diffEqo);
            await wton.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);

            const params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneETH,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                wton.address,
                tos.address,
                3000,
                oneETH
            )

            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("#10-2. WTON -> TOS gasFee", async () => {
            await wton.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);

            const params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneETH,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);
        })
    })

    describe("#11. tonSwapperV2 tonToTokenHopInput gasFee", async () => {
        it("11-1. TON -> WTON -> TOS -> AURA", async () =>{
            await ton.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tonToTokenHopInput(
                auraAddress,
                oneETH,
                0,
                false
            );
        })

        it("11-2. WTON -> TOS -> AURA", async () =>{
            await wton.connect(admin).approve(tonSwapper.address,oneWTON);
            await tonSwapper.connect(admin).tonToTokenHopInput(
                auraAddress,
                oneWTON,
                0,
                true
            );
        })

        it("11-3. approveAndCall TON -> WTON -> TOS -> AURA", async () =>{
            var dec = Number(0);
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
        
            await ton.connect(admin).approveAndCall(tonSwapper.address, oneETH, hex3);
        })

        it("11-4. approveAndCall WTON -> TOS -> AURA", async () =>{
            var dec = Number(0);
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
        
            await wton.connect(admin).approveAndCall(tonSwapper.address, oneWTON, hex3);
        })
    })

    describe("#12. uniswapRouter tonToTokenHopInput gasFee", async () => {
        it("12-1. TON -> WTON -> TOS -> AURA", async () =>{
            await ton.connect(admin).approve(wton.address,oneETH);
            await wton.connect(admin).swapFromTON(oneETH);
            await wton.connect(admin).approve(uniswapRouter.address,oneWTON);
            
            let params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneWTON,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };

            await uniswapRouter.connect(admin).exactInputSingle(params);
          
            params = {
                tokenIn: tos.address,
                tokenOut: aura.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            await tos.connect(admin).approve(uniswapRouter.address,oneETH);
            await uniswapRouter.connect(admin).exactInputSingle(params);
        })

        it("12-2. WTON -> TOS -> AURA", async () =>{
            await wton.connect(admin).approve(uniswapRouter.address,oneWTON);
            
            let params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneWTON,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };

            await uniswapRouter.connect(admin).exactInputSingle(params);

            params = {
                tokenIn: tos.address,
                tokenOut: aura.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            await tos.connect(admin).approve(uniswapRouter.address,oneETH);
            await uniswapRouter.connect(admin).exactInputSingle(params);
        })
    })

    describe("#13. tonSwapperV2 tonToTokenHopOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("13-1. TON -> WTON -> TOS -> AURA", async () =>{
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);

            await ton.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tonToTokenHopOutput(
                auraAddress,
                oneETH,
                maxmumInputAmount,
                false
            )
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("13-2. WTON -> TOS -> AURA", async () =>{
            await wton.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tonToTokenHopOutput(
                auraAddress,
                oneETH,
                maxmumInputAmount,
                true
            )
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("13-3. approveAndCall TON -> WTON -> TOS -> AURA", async () =>{
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);

            var dec = Number(oneETH);
            var hex = dec.toString(16);
            var selector = 4;
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

            await ton.connect(admin).approveAndCall(tonSwapper.address, maxmumInputAmount, hex3);
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("13-4. approveAndCall WTON -> TOS -> AURA", async () =>{
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);

            var dec = Number(oneETH);
            var hex = dec.toString(16);
            var selector = 4;
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
          
            await wton.connect(admin).approveAndCall(tonSwapper.address, maxmumInputAmount, hex3);
        })
    })

    describe("#14. uniswapRouter tonToTokenHopOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("maxmumInputAmount2", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            // let bigNumber100 = BigNumber.from("100")
            // let bigNumber105 = BigNumber.from("102")
            // maxmumInputAmount2 = tx.mul(bigNumber105).div(bigNumber100);
            maxmumInputAmount2 = tx;
        })

        it("14-1. TON -> WTON -> TOS -> AURA", async () =>{
            await ton.connect(admin).approve(wton.address,maxmumInputAmount);
            await wton.connect(admin).swapFromTON(maxmumInputAmount);
            maxmumInputAmount = maxmumInputAmount.mul(diffEqo);
            await wton.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);

            let params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: maxmumInputAmount2,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);
            
            params = {
                tokenIn: tos.address,
                tokenOut: aura.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneETH,
                amountInMaximum: maxmumInputAmount2,
                sqrtPriceLimitX96: 0
            };
            await tos.connect(admin).approve(uniswapRouter.address,maxmumInputAmount2);

            await uniswapRouter.connect(admin).exactOutputSingle(params);
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                wton.address,
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("maxmumInputAmount2", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                tos.address,
                auraAddress,
                3000,
                oneETH
            )
            // let bigNumber100 = BigNumber.from("100")
            // let bigNumber105 = BigNumber.from("102")
            // maxmumInputAmount2 = tx.mul(bigNumber105).div(bigNumber100);
            maxmumInputAmount2 = tx;
        })

        it("14-2. WTON -> TOS -> AURA", async () =>{
            await wton.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);

            let params = {
                tokenIn: wton.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: maxmumInputAmount2,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);

            params = {
                tokenIn: tos.address,
                tokenOut: aura.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneETH,
                amountInMaximum: maxmumInputAmount2,
                sqrtPriceLimitX96: 0
            };
            await tos.connect(admin).approve(uniswapRouter.address,maxmumInputAmount2);
            await uniswapRouter.connect(admin).exactOutputSingle(params);
        })
    })

    describe("#15. tonSwapperV2 tokenToTonHopInput gasFee", async () => {
        it("#15-1. AURA -> TOS -> WTON -> TON", async () => {
            await aura.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToTonHopInput(
                auraAddress,
                oneETH,
                0,
                false
            );
        })

        it("#15-2. AURA -> TOS -> WTON", async () => {
            await aura.connect(admin).approve(tonSwapper.address,oneETH);
            await tonSwapper.connect(admin).tokenToTonHopInput(
                auraAddress,
                oneETH,
                0,
                true
            );
        })
    })

    describe("#16. uniswapRouter tokenToTonHopInput gasFee", async () => {
        it("#16-1. AURA -> TOS -> WTON -> TON", async () => {
            await aura.connect(admin).approve(uniswapRouter.address,oneETH);
            
            let params = {
                tokenIn: aura.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };

            await uniswapRouter.connect(admin).exactInputSingle(params);
          
            params = {
                tokenIn: tos.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            await tos.connect(admin).approve(uniswapRouter.address,oneETH);
            await uniswapRouter.connect(admin).exactInputSingle(params);

            await wton.connect(admin).swapToTON(oneWTON);
        })

        it("#16-2. AURA -> TOS -> WTON", async () => {
            await aura.connect(admin).approve(uniswapRouter.address,oneETH);
            
            let params = {
                tokenIn: aura.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };

            await uniswapRouter.connect(admin).exactInputSingle(params);
          
            params = {
                tokenIn: tos.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountIn: oneETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            };
            await tos.connect(admin).approve(uniswapRouter.address,oneETH);
            await uniswapRouter.connect(admin).exactInputSingle(params);
        })
    })

    describe("#17. tonSwapperV2 tokenToTonHopOutput gasFee", async () => {
        it("#17-1. AURA -> TOS -> WTON ", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                auraAddress,
                tos.address,
                wton.address,
                3000,
                oneWTON
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
          
            await aura.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tokenToTonHopOutput(
                auraAddress,
                oneWTON,
                maxmumInputAmount,
                true
            )
        })

        it("#17-2. AURA -> TOS -> WTON -> TON ", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                auraAddress,
                tos.address,
                wton.address,
                3000,
                oneWTON
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
          
            await aura.connect(admin).approve(tonSwapper.address,maxmumInputAmount);
            await tonSwapper.connect(admin).tokenToTonHopOutput(
                auraAddress,
                oneWTON,
                maxmumInputAmount,
                false
            )
        })
    })

    describe("#18. uniswapRouter tokenToTonHopOutput gasFee", async () => {
        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                aura.address,
                tos.address,
                wton.address,
                3000,
                oneWTON
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            // tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("maxmumInputAmount2", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                tos.address,
                wton.address,
                3000,
                oneWTON
            )
            // let bigNumber100 = BigNumber.from("100")
            // let bigNumber105 = BigNumber.from("102")
            // maxmumInputAmount2 = tx.mul(bigNumber105).div(bigNumber100);
            maxmumInputAmount2 = tx;
        })

        it("#18-1. AURA -> TOS -> WTON ", async () => {
            await aura.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);

            let params = {
                tokenIn: aura.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: maxmumInputAmount2,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);
            
            params = {
                tokenIn: tos.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneETH,
                amountInMaximum: maxmumInputAmount2,
                sqrtPriceLimitX96: 0
            };
            await tos.connect(admin).approve(uniswapRouter.address,maxmumInputAmount2);

            await uniswapRouter.connect(admin).exactOutputSingle(params);
        })

        it("maxmumInputAmount", async () => {
            let tx = await tonSwapper.callStatic.multiExactOutputQuoter(
                aura.address,
                tos.address,
                wton.address,
                3000,
                oneWTON
            )
            let bigNumber100 = BigNumber.from("100")
            let bigNumber105 = BigNumber.from("105")
            // tx = tx.div(diffEqo);
            maxmumInputAmount = tx.mul(bigNumber105).div(bigNumber100);
        })

        it("maxmumInputAmount2", async () => {
            let tx = await tonSwapper.callStatic.exactOutputQuoter(
                tos.address,
                wton.address,
                3000,
                oneWTON
            )
            // let bigNumber100 = BigNumber.from("100")
            // let bigNumber105 = BigNumber.from("102")
            // maxmumInputAmount2 = tx.mul(bigNumber105).div(bigNumber100);
            maxmumInputAmount2 = tx;
        })

        it("#18-2. AURA -> TOS -> WTON -> TON ", async () => {
            await aura.connect(admin).approve(uniswapRouter.address,maxmumInputAmount);

            let params = {
                tokenIn: aura.address,
                tokenOut: tos.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: maxmumInputAmount2,
                amountInMaximum: maxmumInputAmount,
                sqrtPriceLimitX96: 0
            };
            await uniswapRouter.connect(admin).exactOutputSingle(params);
            
            params = {
                tokenIn: tos.address,
                tokenOut: wton.address,
                fee: 3000,
                recipient: admin.address,
                deadline: 100000000000000,
                amountOut: oneWTON,
                amountInMaximum: maxmumInputAmount2,
                sqrtPriceLimitX96: 0
            };
            await tos.connect(admin).approve(uniswapRouter.address,maxmumInputAmount2);

            await uniswapRouter.connect(admin).exactOutputSingle(params);
            await wton.connect(admin).swapToTON(oneWTON)
        })
    })

});