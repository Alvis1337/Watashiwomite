import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import https from 'https';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

import routes from './routes';

const app = express();

// Bodyparser Middleware
var cors = require('cors')
app.use(cors());
app.options('*',cors());
var allowCrossDomain = function(req,res,next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}
app.use(allowCrossDomain);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProduction = process.env.NODE_ENV === 'production';

// DB Config
const dbConnection = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;

// Connect to Mongo
mongoose
    .connect(dbConnection, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then(() => {
        console.log('MongoDB Connected...');
    })
    .catch((err) => console.log(err));

// Use Routes
app.use('/', routes);
app.use('/public/images', express.static(join(__dirname, '../public/images')));

// Serve static assets if in production
if (isProduction) {
    // Set static folder
    // nginx will handle this
    // app.use(express.static(join(__dirname, '../../client/build')));

    // app.get('*', (req, res) => {
    //   // index is in /server/src so 2 folders up
    //   res.sendFile(resolve(__dirname, '../..', 'client', 'build', 'index.html'));
    // });

    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server started on port ${port}`));
} else {
    const port = process.env.PORT || 5000;

    const httpsOptions = {
        key: readFileSync(resolve(__dirname, '../security/cert.key')),
        cert: readFileSync(resolve(__dirname, '../security/cert.pem')),
    };

    const server = https.createServer(httpsOptions, app).listen(port, () => {
        console.log('https server running at ' + port);
        // console.log(all_routes(app));
    });
}
