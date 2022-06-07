require('dotenv').config();

// Database
const { MongoClient } = require('mongodb')
const mongoClient = new MongoClient(process.env.DB_URI)
const db = mongoClient.db(process.env.DB_NAME);

async function connectDatabase(callback) {
    try {
        await mongoClient.connect()
        await db.command({ ping: 1 })
        console.log("Connected successfully to MongoDB")
        callback()
    } catch (err) {
        console.error(err)
    }
}

function getDatabase() {
    return db
}

function getGamesCollection() {
    return db.collection("games");
}

function getLeaderboardCollection() {
    return db.collection("leaderboard")
}

function getNFTsCollection() {
    return db.collection("nfts")
}

function getConfigCollection() {
    return db.collection("config")
}

async function getCurrentDayId() {
    const config = await getConfigCollection().findOne({ _id: 1 })
    return config ? config.currentDayId : null
}

async function getActiveGameType() {
    const config = await getConfigCollection().findOne({ _id: 1 })
    return config ? config.activeGameType : null
}

async function getNFTData(nftId) {
    const nftData = await getNFTsCollection().findOne({ _id: parseInt(nftId) }) 
    return nftData
}

module.exports = {
    connectDatabase,
    getDatabase,
    getGamesCollection,
    getLeaderboardCollection,
    getNFTsCollection,
    getConfigCollection,
    getCurrentDayId,
    getActiveGameType,
    getNFTData
}