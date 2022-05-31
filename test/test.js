/*
    1) just test the this functions -> account1, account2 before TONamount, WTONamount -> after TONamount, WTONAmount
    2) you fixed decimal calcul -> exact execute!   
    3) you deploy ton, wton that need
*/  
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
    describe('TONSwapper', function () {
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
            await wton.mint(account1.address, ethers.utils.parseUnits("10", 27), {
                from: defaultSender,
            });
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
            console.log(tonSwapper.address);
        })
        
        it("deploy swap contract 2", async () => {
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            tonSwapper2= await tonSwapperFactory.deploy(wton.address, ton.address);
            await tonSwapper2.deployed();
            console.log(tonSwapper2.address);
        })

        it("swap test1 ton to Wton", async () => {
            await ton.approve(tonSwapper.address, tonuniAmount);
            await ton.connect(account1).approve(tonSwapper.address, tonuniAmount);
            // await ton.connect(account1).approve(wton.address, wtonuniAmount);
            
            console.log("Initial Balance of address1 in Ton", Number(await ton.balanceOf(account1.address)));
            console.log("Initial Balance of address1 in WTon", Number(await wton.balanceOf(account1.address)));
            console.log("Initial Balance of tonSwapper1 in Ton", Number(await ton.balanceOf(tonSwapper.address)));
            console.log("Initial Balance of tonSwapper1 in WTon", Number(await wton.balanceOf(tonSwapper.address)));
            
            await tonSwapper.connect(account1).tonToWton(tonuniAmount);
            // await wton.connect(account1).swapFromTON(wtonuniAmount);

            console.log("After Balance of address1 in Ton", Number(await ton.balanceOf(account1.address)));
            console.log("After Balance of address1 in WTon", Number(await wton.balanceOf(account1.address)));
            console.log("After Balance of tonSwapper1 in Ton", Number(await ton.balanceOf(tonSwapper.address)));
            console.log("After Balance of tonSwapper1 in WTon", Number(await wton.balanceOf(tonSwapper.address)));
            console.log("-----------------------------------\n\n");
        })

        
        it("swap test2 Wton to ton", async () => {
            //await wton.approve(tonSwapper2.address, wtonuniAmount);
            await wton.connect(account2).approve(tonSwapper2.address, wtonuniAmount);

            console.log("Transfer Amount is                 ", Number(wtonuniAmount));
            console.log("Initial Balance of address2 in Ton", Number(await ton.balanceOf(account2.address)));
            console.log("Initial Balance of address2 in WTon", Number(await wton.balanceOf(account2.address)));
            console.log("Initial Balance of tonSwapper2 in Ton", Number(await ton.balanceOf(tonSwapper2.address)));
            console.log("Initial Balance of tonSwapper2 in wTon", Number(await wton.balanceOf(tonSwapper2.address)));
            

            await tonSwapper2.connect(account2).wtonToTON(wtonuniAmount);

            console.log("After Balance of address2 in Ton", Number(await ton.balanceOf(account2.address)));
            console.log("After Balance of address2 in WTon", Number(await wton.balanceOf(account2.address)));
            console.log("After Balance of tonSwapper2 in Ton", Number(await ton.balanceOf(tonSwapper2.address)));
            console.log("After Balance of tonSwapper2 in WTon", Number(await wton.balanceOf(tonSwapper2.address)));
            console.log("-----------------------------------\n\n");
        })
      });
});
/*
    beforeEach(async function () {
        //ico20Contracts = new ICO20Contracts();
        const addresses = await getAddresses();
        account1 = await findSigner(addresses[0]);
        account2 = await findSigner(addresses[1]);
        //console.log(account1)
        //console.log(account2)
    });
    it("1 Init  ", async function () {
        console.log(defaultSender);
        console.log(account1);
        console.log(account2);
        
        this.timeout(1000000);
        newContract = await setupContracts(account1.address);
        wtonAddress = newContract.ton;
        console.log(tonAddress);
        console.log(wtonAddress);
    });
});


 /*
    it("1. ico20Contracts init  ", async function () {
        this.timeout(1000000);
        ICOContractsDeployed = await ico20Contracts.initializeICO20Contracts(
            defaultSender
        );
    });

    it("Ton Contract Deploy ", async function() {
    TokamakContractsDeployed =
                    await ico20Contracts.initializePlasmaEvmContracts(defaultSender);
    const cons = await ico20Contracts.getPlasamContracts();        
    ton = cons.ton;
    wton = cons.wton;
    const swapper = await ethers.getContractFactory("Swap")
    stakeContract = await swapper.connect(account1).deploy();
    })

    it("WTon Contract Deploy ", async function() {
        const swapper = await ethers.getContractFactory("Swap")
        stakeContract = await swapper.connect(account1).deploy();
    })

    it(" Test1 ", async function() {
        const swapper = await ethers.getContractFactory("Swap")
        stakeContract = await swapper.connect(account1).deploy();
    })
    
    /*
  describe("# 1. Deploy WTON, TON", async function() {
    it("1. ico20Contracts init  ", async function () {
        this.timeout(1000000);
        ICOContractsDeployed = await ico20Contracts.initializeICO20Contracts(
            defaultSender
        );
    });
    
    //ton, wton deploy
    it("2. tokamakContracts init  ", async function () {
        this.timeout(1000000);
        TokamakContractsDeployed =
          await ico20Contracts.initializePlasmaEvmContracts(defaultSender);
        const cons = await ico20Contracts.getPlasamContracts();
  
        ton = cons.ton;
        wton = cons.wton;
  
        await ton.mint(defaultSender, ethers.utils.parseUnits("1000", 18), {
          from: defaultSender,
        });
        await wton.mint(defaultSender, ethers.utils.parseUnits("1000", 27), {
          from: defaultSender,
        });

        await wton.mint(uniswapAccount.address, wtonuniAmount, {
            from: defaultSender,
        });

        expect(await wton.balanceOf(uniswapAccount.address)).to.be.equal(wtonuniAmount);

    });
  })
*/