const mongo = require('./mongo')

const Web3 = require('web3')
const web3 = new Web3()

const Contract = require('web3-eth-contract');
const abiJson =  require('./abi.json')
Contract.setProvider(process.env.INFURA_ENDPOINT)
const contract = new Contract(abiJson, process.env.CONTRACT_ADDRESS)

// Checks if user who sent the game request also owns the nft
async function doesSignerOwnNft(signature, nftId) {
    try {
        const hash = web3.utils.sha3(nftId.toString())

        const signer = web3.eth.accounts.recover(hash, signature)
        const holder = await contract.methods.ownerOf(nftId).call()
    
        return signer.toLowerCase() === holder.toLowerCase()
    } catch (err) {
        // Fails if signature is not a valid signature
        return false
    }   
}

async function hasAlreadyPlayedToday(nftId) {
    try {
        const nftData = await mongo.getNFTData(nftId)

        const lastPlayedDay = nftData ? nftData.lastPlayed : null
        const currentDay = await mongo.getCurrentDayId()

        const playedToday = lastPlayedDay === currentDay
        return { lastPlayed: lastPlayedDay, playedToday: playedToday }

    } catch (err) {
        throw new Error("Could not fetch data for nftId: " + nftId)
    }
}

module.exports = { doesSignerOwnNft, hasAlreadyPlayedToday }