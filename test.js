const { WS_RPC } = require('@vite/vitejs-ws');
const { ViteAPI, wallet, utils, abi, accountBlock, keystore } =require('@vite/vitejs');
const { CONTRACT } = require('./contract_testnet')

// test account
//const seed = "turtle siren orchard alpha indoor indicate wasp such waste hurt patient correct true firm goose elegant thunder torch hurt shield taste under basket burger";
const seed = "cherry filter distance bonus tent enjoy play upper gallery soda quarter insane decrease gas input victory cannon brief top march luxury end crumble conduct"


// connect to node
const connection = new WS_RPC(CONTRACT.network);
const provider = new ViteAPI(connection, () => {
    console.log("client connected");
});
 
// derive account from seed phrase
const accountA = wallet.getWallet(seed).deriveAddress(0);
//const accountB = wallet.getWallet(seed).deriveAddress(1);

async function receiveTransaction(account) {
    // get the first unreceived tx
    const data = await provider.request('ledger_getUnreceivedBlocksByAddress', account.address, 0, 1);
    if (!data || !data.length) {
        console.log('[LOG] No Unreceived Blocks');
        return;
    }
    // create a receive tx
    const ab = accountBlock.createAccountBlock('receive', {
        address: account.address,
        sendBlockHash: data[0].hash
    }).setProvider(provider).setPrivateKey(account.privateKey);

    await ab.autoSetPreviousAccountBlock();
    const result = await ab.sign().send();
    console.log('receive success', result);
}

async function callContract(account, methodName, params, tokenId, amount) {
    try{
    const block = accountBlock.createAccountBlock('callContract', {
        address: account.address,
        abi: CONTRACT.abi,
        methodName,
        tokenId,
        amount,
        toAddress: CONTRACT.address,
        params
    }).setProvider(provider).setPrivateKey(account.privateKey);
    await block.autoSetPreviousAccountBlock();
    const result = await block.sign().send();
    console.log('call success', result);
    } catch(err) {
        console.log(err)
    }
}

// this function needs a bit of cleanup
async function callOffChain(methodName, params){
    
    const ehex = abi.encodeFunctionCall(CONTRACT.abi,params,methodName);
    const ebase64 = Buffer.from(ehex, 'hex').toString('base64');
    const code = Buffer.from(CONTRACT.offChain, 'hex').toString('base64');

    const res = await provider.request('contract_callOffChainMethod', {
        address: CONTRACT.address,
        code,
        data: ebase64
    }).then((result) => {
        return result;
    }).catch((err) => {
        console.warn(err);
    });

    const hexbuf = Buffer.from(res, 'base64').toString('hex');
    const outputabi = CONTRACT.abi.find(x=>x.name===methodName).outputs
    const out = abi.decodeParameters(outputabi, hexbuf);
    
    console.log(out)
}



async function createStakingPool(account, rewardTokenId, rewardAmount, startBlock, endBlock, stakingTokenId){
    const params = [startBlock, endBlock, stakingTokenId]
    callContract(account, "createStakingPool", params, rewardTokenId, rewardAmount)
}

async function deposit(account, pid, stakingTokenId, amount) {
    callContract(account, "deposit", [pid], stakingTokenId, amount);
}

async function withdraw(account, pid, amount) {
    callContract(account, "withdraw", [pid, amount], 'tti_5649544520544f4b454e6e40', '0');
}

async function getRewards(account, pid, amount) {
    callContract(account, "withdraw", [pid, '0'], 'tti_5649544520544f4b454e6e40', '0');
}

async function getPoolInfo(pid){
    callOffChain("getPoolInfo", [pid]);
}

async function getUserInfo(pid, address){
    callOffChain("getUserInfo", [pid, address]);
}

async function main() {
    // VITE tokenId    
    token = 'tti_5649544520544f4b454e6e40';

    // create a staking pool to distribute 10 Vite in rewards over the given block heights
    //createStakingPool(accountA, token, '10000000000000000000', '7922500', '7930500', token)
    
    // deposit 1 VITE into pool
    //deposit(accountA, '0', token, '1000000000000000000');

    // withdraw 1 VITE from pool
    //withdraw(accountA, '0', '1000000000000000000');

    // get pool state    
    //getPoolInfo('0');

    // get account state within a given pool
    //getUserInfo('0', accountA.address)

}

main().then(res => {}).catch(err => console.error(err));
