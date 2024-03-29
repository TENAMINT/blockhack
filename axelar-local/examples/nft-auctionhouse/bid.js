'use strict';

const { getDefaultProvider, Contract, constants: { AddressZero }, utils: { keccak256, defaultAbiCoder }, Wallet } = require('ethers');
const { utils: { deployContract }} = require('@axelar-network/axelar-local-dev');

const ERC721 = require('../../build/ERC721Demo.json');
const NftAuctionhouse = require('../../build/NftAuctionhouse.json');
const IERC20 = require('../../build/IERC20.json');
const IAxelarGateway = require('../../build/IAxelarGateway.json');

const env = process.argv[2];
if(env == null || (env != 'testnet' && env != 'local')) throw new Error('Need to specify tesntet or local as an argument to this script.');
let temp;
if(env == 'local') {
    temp = require(`../../info/local.json`);
} else {
    try {
        temp = require(`../../info/testnet.json`);
    } catch {
        temp = testnetInfo;
    }
}
const chains = temp;
const args = process.argv.slice(3);

const chainName = args[0];
const private_key = args[1];
const tokenId = BigInt(args[2]);
let amount = BigInt(args[3] || 0);
(async () => {
    const chain = chains.find(chain => chain.name == chainName);
    const provider = getDefaultProvider(chain.rpc);
    const wallet = new Wallet(private_key, provider);
    const erc721 = new Contract(chain.erc721, ERC721.abi, wallet);
    const gateway = new Contract(chain.gateway, IAxelarGateway.abi, wallet);
    const usdc = new Contract(await gateway.tokenAddresses('aUSDC'), IERC20.abi, wallet);
    const auctionhouse = new Contract(chain.nftAuctionhouse, NftAuctionhouse.abi, wallet);
    if(amount == 0) {
        const bid = await auctionhouse.bids(erc721.address, tokenId);
        const minAmount = await auctionhouse.minAmounts(erc721.address, tokenId);
        if(bid == 0) {
            amount = minAmount == BigInt(await auctionhouse.NO_MIN()) ? 100 : minAmount;
        } else {
            amount = Math.floor(bid * 4 / 3 + 1);
        }
    }
    console.log(amount);
    await (await usdc.approve(auctionhouse.address, amount));
    await (await auctionhouse.bid(erc721.address, tokenId, amount));
    console.log(await auctionhouse.bidders(erc721.address, tokenId));
    console.log(await auctionhouse.bids(erc721.address, tokenId));
    console.log(Number(await auctionhouse.deadlines(erc721.address, tokenId))<(new Date().getTime()));
})();