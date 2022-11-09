
# Mainnet Address

SwapperLogic : 0x57bd88f20003185cb136f859e7724dd75910fd75

SwapperProxy : 0x580d3159adE0e95558d10A0Dc9d55A9Ee84F3E27

# Goerli Address

SwapperLogic : 0x5f569d4C9cce980D2fcc953d1FE684Ace28e96C7

SwapperProxy : 0xb99300e6650f2b40a5359D00396a6Ae17Bf1bc97


# How to test

Try running some of the following tasks:

make the fork mainnet node

```shell
npx hardhat test test/5.swapperv2.gasFee.js --network local 
```

# How to deploy

Try running some of the following tasks:

```shell
npx hardhat run scripts/mainnet_deploy.js --network mainnet
```
