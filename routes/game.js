const express = require('express')
const router = express.Router()
const requestIP = require('request-ip')
const axios = require('axios')

const mongo = require('../mongo')
const auth = require('../auth')
const accessControl = require('../accessControl')

async function saveGame(gameType, nftId, signature, score, ip, userAgent) {
    try {
        const currentDayId = await mongo.getCurrentDayId()
        
        let document = {}

        document.gameType = gameType
        document.dayId = currentDayId
        document.nftId = nftId
        document.signature = signature
        document.score = score

        document.origin = {}
        document.origin.ip = ip
        document.origin.userAgent = userAgent

        await mongo.getGamesCollection().insertOne(document)
        await mongo.getNFTsCollection().updateOne({ _id: nftId }, { $set: { lastPlayed: currentDayId } }, { upsert: true })
        console.log('Saved ' + gameType + ' score: ' + score)
    } catch (err) {
        console.error(err)
    }
}

async function markNftAsPlayed(nftId) {
    await axios.patch(process.env.MAIN_API_URL + "/nfts/" + nftId + "/mark-as-played", {}, { headers: { "x-api-key": process.env.MAIN_X_API_KEY } })
}

/**
 * @swagger
 * 
 * components:
 *   schemas:
 *      Game:
 *       type: object
 *       required:
 *          - gameType
 *          - score
 *          - nftId
 *          - signature
 *       properties:
 *         gameType:
 *           type: string
 *           enum: [wanted, brickbreaker]
 *         score:
 *           type: integer
 *         nftId:
 *           type: integer
 *         signature:
 *           type: string
 *       example:
 *         gameType: "wanted"
 *         score: 100
 *         nftId: 22
 *         signature: "0x2b68b2b4b4058a2636fcfd4e15223e54af989f8a680405f2f3c16a4e1674bb9a7cfe8dee1c110e33c1b6f96c588ddd9526ab73cecb95c6ca8260c1b7c3890ceb1c"
 * /game:
 *  post:
 *   tags:
 *     - game
 *   summary: Saves a game
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Game'
 *   responses:
 *     '200':
 *       description: OK
 *     '400':
 *       description: Bad request / Missing paremeters
 *     '403':
 *       description: Forbidden (Signer does not own the NFT / Wrong network or contract ?)
 *     '5XX':
 *       description: Unexpected error
 */
router.post('/', async (req, res, next) => {
    if (!req.body.gameType || !Number.isInteger(req.body.score) || !req.body.nftId || !req.body.signature) {
        return res.sendStatus(400);
    }

    const gameType = req.body.gameType
    const score = req.body.score
    const nftId = parseInt(req.body.nftId)
    const signature = req.body.signature
    const ip = requestIP.getClientIp(req)
    const userAgent = req.headers['user-agent']

    // Check if signer owns this nft
    const signerOwnsNft = await accessControl.doesSignerOwnNft(signature, nftId)
    if (!signerOwnsNft) {
        return res.status(403).send(`Signer does not own nft`)
    }

    // Check if nft has already played this day
    const nftGameData = await accessControl.hasAlreadyPlayedToday(nftId)
    if (nftGameData.playedToday) {
        return res.status(403).send(`This nft already played today`)
    }

    await saveGame(gameType, nftId, signature, score, ip, userAgent)

    try {
        await markNftAsPlayed(nftId)
    } catch(err) {
        console.error(err)
    }

    return res.sendStatus(200)
})

/**
 * @swagger
 * /game:
 *  get:
 *   tags:
 *     - game
 *   summary: Gets currently active game type
 *   responses:
 *     '200':
 *       description: OK
 *     '5XX':
 *       description: Unexpected error
 */
router.get('/', async (req, res) => {
    const activeGameType = await mongo.getActiveGameType()
    if (!activeGameType) {
        return res.status(500).send("Active game is not set")
    }
    return res.json({ gameType: activeGameType })
})

/**
 * @swagger
 * /game/config:
 *  post:
 *   tags:
 *     - game
 *   summary: Sets the active game type
 *   security:
 *     - ApiKey: []
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             newGameType:
 *               type: string
 *               enum: [wanted, brickbreaker]
 *               example: wanted
 *   responses:
 *     '200':
 *       description: OK
 *     '400':
 *       description: Bad request / Missing paremeters
 *     '401':
 *       description: Unauthorized
 *     '5XX':
 *       description: Unexpected error
 */
 router.post('/config', auth.apiKey, async (req, res) => {
    if (!req.body.newGameType) {
        return res.sendStatus(400);
    }

    const newGameType = req.body.newGameType
    await mongo.getConfigCollection().updateOne({ _id: 1 }, { $set: { activeGameType: newGameType } }, { upsert: true })
    return res.sendStatus(200)
})

module.exports = router