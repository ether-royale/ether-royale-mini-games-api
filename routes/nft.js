const express = require('express');
const router = express.Router()

const accessControl = require('../accessControl')

/**
 * @swagger
 * /nft/{nftId}:
 *  get:
 *   tags:
 *     - nft
 *   summary: Used to check if a NFT has already played
 *   parameters:
 *     - in: path
 *       name: nftId
 *       required: true
 *       schema:
 *         type: string
 *   responses:
 *     '200':
 *       description: Game information about nft. "lastPlayed" is null if NFT has never played before.
 *       schema:
 *         type: object
 *         properties:
 *           lastPlayed:
 *             type: string
 *             nullable: true
 *           playedToday:
 *             type: boolean
 *     '400':
 *       description: Bad request
 *     '5XX':
 *       description: Unexpected error
 */
 router.get('/:nftId', async (req, res) => {
    if (!req.params.nftId) {
        return res.sendStatus(400);
    }
    const nftId = req.params.nftId
    const { lastPlayed, playedToday } = await accessControl.hasAlreadyPlayedToday(nftId)

    const response = {
        lastPlayed: lastPlayed,
        playedToday: playedToday
    }
    res.json(response)
})

/**
 * @swagger
 * /nft/{nftId}/validate/{signature}:
 *  get:
 *   tags:
 *     - nft
 *   summary: Validates the signature
 *   parameters:
 *     - in: path
 *       name: nftId
 *       required: true
 *       schema:
 *         type: number
 *     - in: path
 *       name: signature
 *       required: true
 *       schema:
 *         type: string
 *   responses:
 *     '200':
 *       description: Returns whether the signature was signed by the NFT holder
 *       schema:
 *         type: object
 *         properties:
 *           valid:
 *             type: boolean
 *             nullable: true
 *     '400':
 *       description: Bad request
 *     '5XX':
 *       description: Unexpected error
 */
router.get('/:nftId/validate/:signature', async (req, res, next) => {
    if (!Number.isInteger(parseInt(req.params.nftId)) || !req.params.signature) {
        return res.sendStatus(400);
    }
    const nftId = req.params.nftId
    const signature = req.params.signature

    const signerOwnsNft = await accessControl.doesSignerOwnNft(signature, nftId)
    res.json({ valid: signerOwnsNft })
})

module.exports = router