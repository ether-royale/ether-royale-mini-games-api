exports.apiKey = (req, res, next) => {
    if (req.header('x-api-key') !== process.env.X_API_KEY) {
        return res.sendStatus(401)
    }

    next();
}