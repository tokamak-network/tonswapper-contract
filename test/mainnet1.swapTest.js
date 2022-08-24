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
const TON_ABI = require("../abis/TON.json");
const WTON_ABI = require("../abis/WTON.json");

const TOS_ABI = require("../abis/TOS.json");

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

const tokenPooluniAmount = ethers.utils.parseUnits("100000", 18);
const wtonPooluniAmount = ethers.utils.parseUnits("100000", 27);

let uniswapInfo={
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "",
    wtonWethPool: "",
    wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
    wton: "0x709bef48982Bbfd6F2D4Be24660832665F53406C",
    tos: "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd",
    weth: "0xc778417e063141139fce010982780140aa0cd5ab",
    usdc: "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b",
    _fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
}
 
let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";

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

        await hre.ethers.provider.send("hardhat_setBalance", [
            admin.address,
            "0x8ac7230489e80000",
        ]);
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
    });

    describe("# 2. Deploy the TONSwapperContract", async () => {
        it("#2-1. deploy swap contract", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            tonSwapper = await tonSwapperFactory.deploy(
                wton.address, 
                ton.address,
                uniswapInfo.swapRouter
            );
            await tonSwapper.deployed();
            // console.log(tonSwapper.address);
        })

        it("#2-2. transfer TON", async () => {
            let beforeAmount = await ton.balanceOf(account1.address);
            expect(beforeAmount).to.be.equal(0);

            await ton.connect(admin).transfer(account1.address,tonuniAmount);

            let afterAmount = await ton.balanceOf(account1.address);
            expect(Number(afterAmount)).to.be.equal(Number(tonuniAmount));
        })
    })

    describe("# 4. test the TON -> Tokne swap", async () => {
        it("# 4-1-1. don't tonToToken before approve", async () => {
            let tx = tonSwapper.connect(account1).tonToToken(tonuniAmount,tos.address);

            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })

        it("# 4-1-2. tonToTOken after approve", async () => {
            let beforeAmount = await tos.balanceOf(account1.address);
            console.log("beforeAmount :",beforeAmount);
            expect(beforeAmount).to.be.equal(0);

            await ton.connect(account1).approve(tonSwapper.address,tonuniAmount);
            await tonSwapper.connect(account1).tonToToken(tonuniAmount,tos.address);

            let afterAmount = await tos.balanceOf(account1.address);
            console.log("afterAmount :",afterAmount);
            expect(afterAmount).to.be.above(0);
        })
    })
});
