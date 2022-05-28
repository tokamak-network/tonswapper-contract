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

describe("swap", function () {

    beforeEach(async function () {
        const addresses = await getAddresses();
        ico20Contracts = new ICO20Contracts();
        defaultSender = addresses[0];
        account1 = await findSigner(addresses[4]);
        account2 = await findSigner(addresses[5]);
    }); 
    describe('TONSwapper', function () {
        it("1. ico20Contracts init ", async function () {
            TokamakContractsDeployed = await ico20Contracts.initializePlasmaEvmContracts(defaultSender);
            //console.log("TokamanContractsDeployed");
            const cons = await ico20Contracts.getPlasamContracts();
            //console.log(cons.ton);

            ton = cons.ton;
            wton = cons.wton;
            const wtonuniAmount = ethers.utils.parseUnits("10", 18);

            await ton.mint(account1.address, ethers.utils.parseUnits("1000", 18), {
                from: defaultSender,
            });
            await wton.mint(account1.address, ethers.utils.parseUnits("1000", 27), {
                from: defaultSender,
            });
            
            console.log("Account1 address", account1.address);
            //console.log("Initial Balance of address in wTon", await wton.balanceOf(defaultSender));
            //console.log("Initial Balance of address in Ton", await ton.balanceOf(defaultSender));
            
            console.log("Initial Balance of address in wTon", await wton.balanceOf(account1.address));
            console.log("Initial Balance of address in Ton", await ton.balanceOf(account1.address));
            
            const tonSwapperFactory = await ethers.getContractFactory("Swap");
            const tonSwapper = await tonSwapperFactory.deploy(wton.address, ton.address);
            await tonSwapper.deployed();

            await ton.approve(tonSwapper.address, wtonuniAmount);
            await wton.approve(tonSwapper.address, ethers.utils.parseUnits("1000", 27));
            await ton.connect(account1).approve(tonSwapper.address, wtonuniAmount);
            await wton.connect(account1).approve(tonSwapper.address, ethers.utils.parseUnits("1000", 27));
            
            await tonSwapper.connect(account1).tonToWton(wtonuniAmount);

            //console.log("After Balance of address in wTon", await wton.balanceOf(defaultSender));
            //console.log("After Balance of address in Ton", await ton.balanceOf(defaultSender));

            console.log("After Balance of address in wTon", await wton.balanceOf(account1.address));
            console.log("After Balance of address in Ton", await ton.balanceOf(account1.address));

            //expect(await wton.balanceOf(uniswapAccount.address)).to.be.equal(wtonuniAmount);
        });
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