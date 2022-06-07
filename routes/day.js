const express = require('express')
const router = express.Router()

const mongo = require('../mongo')
const auth = require('../auth')

/**
 * @swagger
 * /day:
 *  get:
 *   tags:
 *     - day
 *   summary: Gets current dayId
 *   security:
 *     - ApiKey: []
 *   responses:
 *     '200':
 *       description: OK
 *     '401':
 *       description: Unauthorized
 *     '5XX':
 *       description: Unexpected error
 */
 router.get('/', auth.apiKey, async (req, res) => {
    const currentDayId = await mongo.getCurrentDayId()
    if (!currentDayId) {
        return res.status(500).send("Day id is not set")
    }

    return res.json({ dayId: currentDayId })
})

/**
 * @swagger
 * /day/new:
 *  post:
 *   tags:
 *     - day
 *   summary: Sets new dayId (starts new day)
 *   security:
 *     - ApiKey: []
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             dayId:
 *               type: string
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
router.post('/new', auth.apiKey, async (req, res) => {
    if (!req.body.dayId) {
        return res.sendStatus(400);
    }

    const dayId = req.body.dayId
    await mongo.getConfigCollection().updateOne({ _id: 1 }, { $set: { currentDayId: dayId } }, { upsert: true })
    return res.sendStatus(200)
})

/**
 * @swagger
 * /day/{dayId}/leaderboard:
 *  get:
 *   tags:
 *     - day
 *   summary: Gets the leaderboard of a specific dayId
 *   description: Gets the leaderboard of a specific dayId. Returns only scores of the current active game type. (expensive request)
 *   security:
 *     - ApiKey: []
 *   parameters:
 *   - in: path
 *     name: dayId
 *     required: true
 *     schema:
 *       type: string
 *   responses:
 *     '200':
 *       description: Leaderboard for the day {dayId}
 *       schema:
 *         type: array
 *         items:
 *           type: object
 *           properties:
 *             nftId:
 *               type: string
 *             score:
 *               type: integer
 *     '400':
 *       description: Bad request / Missing paremeters
 *     '401':
 *       description: Unauthorized
 *     '5XX':
 *       description: Unexpected error
 */
router.get('/:dayId/leaderboard', auth.apiKey, async (req, res) => {
    if (!req.params.dayId) {
        return res.sendStatus(400)
    }
    
    const dayId = req.params.dayId

    const activeGameType = await mongo.getActiveGameType()
    if (!activeGameType) {
        return res.status(500).send("Active game is not set")
    }

    const agg = [
        {
            '$match': {
                'dayId': dayId,
                'gameType': activeGameType
            }
        },
        { 
            '$group': {
                '_id': '$nftId',
                'score': { '$max': '$score' }
            }
        },
        {
            '$sort': {
                'score': -1
            }
        }
    ]

    mongo.getGamesCollection().aggregate(agg).toArray((err, result) => {
        if (err) return res.status(500).send('Error fetching leaderboard!')
        
        const filteredResult = []
        result.forEach(game => {
            filteredResult.push({ nftId: game._id, score: game.score })
        })
        
        res.json(filteredResult)
    })
})

module.exports = router