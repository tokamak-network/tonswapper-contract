/*
    1) just test the this functions -> account1, account2 before TONamount, WTONamount -> after TONamount, WTONAmount
    2) you fixed decimal calcul -> exact execute!   
    3) you deploy ton, wton that need
*/  
const { messagePrefix } = require("@ethersproject/hash");
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
let ico20Contracts;
let defaultSender;
let tonSwapper;

let wtonuniAmount;
let tonuniAmount;

let wtonTokenPoolAddress;
let wtonTokenPool;

let account1;
let account2;
let poolcreator;
let contractOwner;

let erc20token;
let erc20TokenContract;

let poolfactory;
let npm;
let swapRouter;
let nonfungibleTokenPD;

const tokenPooluniAmount = ethers.utils.parseUnits("1000000", 18);
const wtonPooluniAmount = ethers.utils.parseUnits("1000000", 27);

describe("swap", function () {

    beforeEach(async function () {
        const addresses = await getAddresses();
        ico20Contracts = new ICO20Contracts();
        defaultSender = addresses[0];
        account1 = await findSigner(addresses[1]);
        account2 = await findSigner(addresses[2]);
        poolcreator = await findSigner(addresses[3]);
        contractOwner = await findSigner(addresses[4]);
    }); 

    describe("# 1. Deploy the ton, wton, token contract", async function () {
        it("#1-1. ico20Contracts init ", async function () {
            TokamakContractsDeployed = await ico20Contracts.initializePlasmaEvmContracts(defaultSender);
            const cons = await ico20Contracts.getPlasamContracts();
            
            ton = cons.ton;
            wton = cons.wton;
            tonuniAmount = ethers.utils.parseUnits("10", 18);
            wtonuniAmount = ethers.utils.parseUnits("10", 27);

            await ton.mint(account1.address, ethers.utils.parseUnits("10", 18), {
                from: defaultSender,
            });
            
            // await wton.mint(account1.address, ethers.utils.parseUnits("30", 27), {
            //     from: defaultSender,
            // });

            // await ton.mint(account2.address, ethers.utils.parseUnits("1000", 18), {
            //     from: defaultSender,
            // });

            await wton.mint(account2.address, ethers.utils.parseUnits("10", 27), {
                from: defaultSender,
            });

            await wton.mint(poolcreator.address, wtonPooluniAmount, {
                from: defaultSender,
            });

            console.log("Account1 address", account1.address);
            console.log("Account2 address", account2.address);
            
        });

        it("#1-2. deploy token", async () => {
            erc20token = await ethers.getContractFactory("mockERC20");
            erc20TokenContract = await erc20token.connect(contractOwner).deploy("test", "TEST");
            await erc20TokenContract.deployed();
            await erc20TokenContract.connect(contractOwner).mint(poolcreator.address, tokenPooluniAmount);
        })
    });

    describe("# 2. UniswapV3 Pool setting", async () => {
        it("deployedUniswapV3Contracts", async function () {
            deployedUniswapV3 = await deployedUniswapV3Contracts();

            poolfactory = deployedUniswapV3.coreFactory.address;
            npm = deployedUniswapV3.nftPositionManager.address;
            swapRouter = deployedUniswapV3.swapRouter.address;
            nonfungibleTokenPD = deployedUniswapV3.nftDescriptor.address;
        });

        it("create WTON-TOKEN Pool", async () => {
            let tx = await deployedUniswapV3.coreFactory.connect(poolcreator).createPool(wton.address,erc20TokenContract.address,FeeAmount.MEDIUM);
            await tx.wait();
            let getpoolAddress = await deployedUniswapV3.coreFactory.connect(poolcreator).getPool(wton.address,erc20TokenContract.address,FeeAmount.MEDIUM);
            console.log(getpoolAddress);
            wtonTokenPoolAddress = getpoolAddress;

            wtonTokenPool = await getUniswapV3Pool(getpoolAddress,poolcreator);
            expect(await wtonTokenPool.factory()).to.eq(deployedUniswapV3.coreFactory.address);

            let token0 = await wtonTokenPool.token0()
            console.log("token0 :",token0)
            let token1 = await wtonTokenPool.token1()
            console.log("token1 :",token1)
            console.log("wton.address : ", wton.address)
            console.log("token.address : ", erc20TokenContract.address)
            expect(await wtonTokenPool.fee(), 'pool fee').to.eq(FeeAmount.MEDIUM)
            let slot = await wtonTokenPool.slot0();
            expect(slot.sqrtPriceX96).to.be.equal(0);
        })

        it("set initSqrtPrice", async () => {
            let sqrtPrice = encodePriceSqrt(1, 1);
            await wtonTokenPool.initialize(sqrtPrice);
            let slot = await wtonTokenPool.slot0();
            expect(slot.sqrtPriceX96).to.be.gte(0);
        })

        it("mint the WTON-TOS Pool", async () => {
            let beforeliquidity = await wtonTokenPool.liquidity();
            expect(beforeliquidity).to.be.equal(0);

            // console.log(deployedUniswapV3.nftPositionManager);
            await erc20TokenContract.connect(poolcreator).approve(deployedUniswapV3.nftPositionManager.address,tokenPooluniAmount)
            await wton.connect(poolcreator).approve(deployedUniswapV3.nftPositionManager.address,wtonPooluniAmount)
            await mintPosition2(erc20TokenContract.address,wton.address,tokenPooluniAmount,wtonPooluniAmount,deployedUniswapV3.nftPositionManager,poolcreator);

            let afterliquidity = await wtonTokenPool.liquidity();
            // console.log("liquidity : ",Number(liquidity));
            expect(afterliquidity).to.be.gt(0);
        })
    })

    describe("# 3. Deploy the TONSwapperContract", async () => {
        it("deploy swap contract", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            tonSwapper = await tonSwapperFactory.deploy(
                wton.address, 
                ton.address,
                swapRouter
            );
            await tonSwapper.deployed();
            // console.log(tonSwapper.address);
        })
    })

    describe("# 4. test the TON -> Tokne swap", async () => {
        
    })

    // describe("# 2. test the swap function", async function () {
    //     it("# 2-1-1. don't tonToWton before approve", async () => {
    //         let tx = tonSwapper.connect(account1).tonToWton(tonuniAmount);

    //         await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    //     })

    //     it("# 2-1-2. swap ton to Wton after approve", async () => {    
    //         let tonbalance1 = await ton.balanceOf(account1.address);
    //         let wtonbalance1 = await wton.balanceOf(account1.address);
    //         console.log("tonBalance1 : ", Number(tonbalance1));
    //         expect(Number(wtonbalance1)).to.be.equal(0);

    //         await ton.connect(account1).approve(tonSwapper.address,tonuniAmount);
    //         await tonSwapper.connect(account1).tonToWton(tonuniAmount);

    //         let tonbalance2 = await ton.balanceOf(account1.address);
    //         let wtonbalance2 = await wton.balanceOf(account1.address);
    //         console.log("tonBalance1 : ", Number(tonbalance2));
    //         console.log("wtonbalance2 : ", Number(wtonbalance2));
    //         expect(Number(wtonbalance2)).to.be.equal(Number(wtonuniAmount));
    //     })

    //     it("# 2-2-1. don't wtonToTON before approve", async () => {
    //         let tx = tonSwapper.connect(account1).wtonToTON(wtonuniAmount);

    //         await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    //     })

    //     it("# 2-2-2. swap wton to ton after approve", async () => {
    //         let tonbalance1 = await ton.balanceOf(account1.address);
    //         let wtonbalance1 = await wton.balanceOf(account1.address);
    //         console.log("wtonBalance1 : ", Number(wtonbalance1));
    //         expect(Number(tonbalance1)).to.be.equal(0);

    //         await wton.connect(account1).approve(tonSwapper.address,wtonuniAmount);
    //         await tonSwapper.connect(account1).wtonToTON(wtonuniAmount);

    //         let tonbalance2 = await ton.balanceOf(account1.address);
    //         let wtonbalance2 = await wton.balanceOf(account1.address);
    //         console.log("tonBalance1 : ", Number(tonbalance2));
    //         console.log("wtonbalance2 : ", Number(wtonbalance2));
    //         expect(Number(tonbalance2)).to.be.equal(Number(tonuniAmount));
    //     })
    // });


    // describe("# 3. test the approveAndCall", async function () {
    //     it("# 3-1-1. swap ton to wton", async () => {
    //         let tonbalance1 = await ton.balanceOf(account1.address);
    //         let wtonbalance1 = await wton.balanceOf(account1.address);
    //         console.log("wtonBalance1 : ", Number(wtonbalance1));
    //         expect(Number(wtonbalance1)).to.be.equal(0);
    //         let data = 0x01;
    //         await ton.connect(account1).approveAndCall(tonSwapper.address,tonuniAmount,data);

    //         let tonbalance2 = await ton.balanceOf(account1.address);
    //         let wtonbalance2 = await wton.balanceOf(account1.address);
    //         console.log("tonBalance1 : ", Number(tonbalance2));
    //         console.log("wtonbalance2 : ", Number(wtonbalance2));
    //         expect(Number(wtonbalance2)).to.be.equal(Number(wtonuniAmount));
    //     })

    //     it("# 3-1-2. swap wton to ton", async () => {
    //         let tonbalance1 = await ton.balanceOf(account1.address);
    //         let wtonbalance1 = await wton.balanceOf(account1.address);
    //         console.log("wtonBalance1 : ", Number(wtonbalance1));
    //         expect(Number(tonbalance1)).to.be.equal(0);
    //         let data = 0x01;
    //         await wton.connect(account1).approveAndCall(tonSwapper.address,wtonuniAmount,data);

    //         let tonbalance2 = await ton.balanceOf(account1.address);
    //         let wtonbalance2 = await wton.balanceOf(account1.address);
    //         console.log("tonBalance1 : ", tonbalance2);
    //         console.log("wtonbalance2 : ", wtonbalance2);
    //         expect(Number(tonbalance2)).to.be.equal(Number(tonuniAmount));
    //     })
    // });
});
