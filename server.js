const port = process.env.PORT || 80

const express = require('express')
const app = express()
app.disable('x-powered-by')

const cors = require('cors')
const morgan = require('morgan')
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

Sentry.init({
    dsn: "", // TODO: @Don insert your sentry url here
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
  
    tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

const day = require('./routes/day.js')
const game = require('./routes/game.js')
const nft = require('./routes/nft.js')

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/day', day)
app.use('/game', game)
app.use('/nft', nft)

// Swagger UI
const swaggerUi = require('swagger-ui-express')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: "EtherRoyale Games Backend",
        },
        servers: [
            { 
                url: "http://localhost:80",
                description: "Local server"
            },
            { 
                url: "https://dev_app", // TODO
                description: "Development server"
            },
            { 
                url: "https://minigames.api.etherroyale.io/",
                description: "Production server"
            }
        ],
        components: {
            securitySchemes: {
                ApiKey: {
                    type: "apiKey",
                    name: "x-api-key",
                    in: "header"
                }
            }
        }
    },
    apis: ['./routes/*.js']
}
const swaggerDocs = swaggerJsDoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Error Handling
app.use((req, res, next) => {
    const error = new Error('Not found')
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    res.status(error.status || 500)
    res.json({
        error: {
            message: error.message
        }
    })
    if (error.status != 404) {
        console.error(error)
    }
})

// Database
const mongo = require('./mongo')

async function run() {
    try {
        console.log('Starting server...')
        mongo.connectDatabase(() => {
            app.listen(port, () => console.log('Listening on port ' + port))
        })
    } catch (err) {
        console.error(err)
    }
}
run()