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

const { getAddresses, findSigner, setupContracts } = require("../utils/utils.js");
let ico20Contracts;
let defaultSender;
let tonSwapper;
let tonSwapper2;
let wtonuniAmount;
let tonuniAmount;
let account1;
let account2;

describe("swap", function () {

    beforeEach(async function () {
        const addresses = await getAddresses();
        ico20Contracts = new ICO20Contracts();
        defaultSender = addresses[0];
        account1 = await findSigner(addresses[1]);
        account2 = await findSigner(addresses[2]);
    }); 

    describe("# 1. Deploy the Swap contract", async function () {
        it("1. ico20Contracts init ", async function () {
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

            console.log("Account1 address", account1.address);
            console.log("Account2 address", account2.address);
            
        });

        it("deploy swap contract", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            tonSwapper = await tonSwapperFactory.deploy(wton.address, ton.address);
            await tonSwapper.deployed();
            // console.log(tonSwapper.address);
        })
        
        it("deploy swap contract 2", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            tonSwapper2= await tonSwapperFactory.deploy(wton.address, ton.address);
            await tonSwapper2.deployed();
            // console.log(tonSwapper2.address);
        })

    });

    describe("# 2. test the swap function", async function () {
        it("# 2-1-1. don't tonToWton before approve", async () => {
            let tx = tonSwapper.connect(account1).tonToWton(tonuniAmount);

            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })

        it("# 2-1-2. swap ton to Wton after approve", async () => {    
            let tonbalance1 = await ton.balanceOf(account1.address);
            let wtonbalance1 = await wton.balanceOf(account1.address);
            console.log("tonBalance1 : ", Number(tonbalance1));
            expect(Number(wtonbalance1)).to.be.equal(0);

            await ton.connect(account1).approve(tonSwapper.address,tonuniAmount);
            await tonSwapper.connect(account1).tonToWton(tonuniAmount);

            let tonbalance2 = await ton.balanceOf(account1.address);
            let wtonbalance2 = await wton.balanceOf(account1.address);
            console.log("tonBalance1 : ", Number(tonbalance2));
            console.log("wtonbalance2 : ", Number(wtonbalance2));
            expect(Number(wtonbalance2)).to.be.equal(Number(wtonuniAmount));
        })

        it("# 2-2-1. don't wtonToTON before approve", async () => {
            let tx = tonSwapper.connect(account1).wtonToTON(wtonuniAmount);

            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })

        it("# 2-2-2. swap wton to ton after approve", async () => {
            let tonbalance1 = await ton.balanceOf(account1.address);
            let wtonbalance1 = await wton.balanceOf(account1.address);
            console.log("wtonBalance1 : ", Number(wtonbalance1));
            expect(Number(tonbalance1)).to.be.equal(0);

            await wton.connect(account1).approve(tonSwapper.address,wtonuniAmount);
            await tonSwapper.connect(account1).wtonToTON(wtonuniAmount);

            let tonbalance2 = await ton.balanceOf(account1.address);
            let wtonbalance2 = await wton.balanceOf(account1.address);
            console.log("tonBalance1 : ", Number(tonbalance2));
            console.log("wtonbalance2 : ", Number(wtonbalance2));
            expect(Number(tonbalance2)).to.be.equal(Number(tonuniAmount));
        })
    });


    describe("# 3. test the approveAndCall", async function () {
        it("# 3-1-1. swap ton to wton", async () => {
            let tonbalance1 = await ton.balanceOf(account1.address);
            let wtonbalance1 = await wton.balanceOf(account1.address);
            console.log("wtonBalance1 : ", Number(wtonbalance1));
            expect(Number(wtonbalance1)).to.be.equal(0);
            let data = 0x01;
            await ton.connect(account1).approveAndCall(tonSwapper.address,tonuniAmount,data);

            let tonbalance2 = await ton.balanceOf(account1.address);
            let wtonbalance2 = await wton.balanceOf(account1.address);
            console.log("tonBalance1 : ", Number(tonbalance2));
            console.log("wtonbalance2 : ", Number(wtonbalance2));
            expect(Number(wtonbalance2)).to.be.equal(Number(wtonuniAmount));
        })

        it("# 3-1-2. swap wton to ton", async () => {
            let tonbalance1 = await ton.balanceOf(account1.address);
            let wtonbalance1 = await wton.balanceOf(account1.address);
            console.log("wtonBalance1 : ", Number(wtonbalance1));
            expect(Number(tonbalance1)).to.be.equal(0);
            let data = 0x01;
            await wton.connect(account1).approveAndCall(tonSwapper.address,wtonuniAmount,data);

            let tonbalance2 = await ton.balanceOf(account1.address);
            let wtonbalance2 = await wton.balanceOf(account1.address);
            console.log("tonBalance1 : ", tonbalance2);
            console.log("wtonbalance2 : ", wtonbalance2);
            expect(Number(tonbalance2)).to.be.equal(Number(tonuniAmount));
        })
    });
});
