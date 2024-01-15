import {Router} from 'express';
import MalToken from '../../models/MalToken';
import {addAnimeToSonarr, getMALAnimeList, getTvdbIds} from "../../utils/utils";
import AnimeList from "../../models/AnimeList";

const crypto = require('crypto');


const router = Router();

let code_verifier = '';
const clientId = process.env.MAL_CLIENT_ID;
const redirectUri = process.env.MAL_REDIRECT_URI;
const authorizationEndpoint = 'https://myanimelist.net/v1/oauth2/authorize';
const tokenEndpoint = 'https://myanimelist.net/v1/oauth2/token';
const tvdbidApiKey = process.env.TVDBID_API_KEY;

router.get('/list_tokens', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    try {
        const tokenList = await MalToken.find().sort({createdAt: 'desc'});

        res.json({
            tokens: tokenList.map((t) => {
                return t.toJSON();
            }),
        });
    } catch (err) {
        res.status(500).json({message: 'Something went wrong.'});
    }
});


router.get('/step1', async (req, res) => {

// Function to generate a random code verifier
    function generateCodeVerifier(length) {
        return crypto.randomBytes(length || 32).toString('hex');
    }

    const codeVerifier = generateCodeVerifier(64); //
    code_verifier = codeVerifier;

    const authorizationUrl = `${authorizationEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
    res.status(200).json(authorizationUrl + '&code_challenge=' + codeVerifier)

});

router.get('/step2', async (req, res) => {


    try {
        const authorizationCode = req.query.code;
        let reqUsername;

        const tokenRequestBody = new URLSearchParams();
        tokenRequestBody.append('client_id', clientId);
        tokenRequestBody.append('client_secret', process.env.MAL_CLIENT_SECRET);
        tokenRequestBody.append('code', authorizationCode);
        tokenRequestBody.append('redirect_uri', redirectUri);
        tokenRequestBody.append('grant_type', 'authorization_code');
        tokenRequestBody.append('code_verifier', code_verifier);

        const getAccessToken = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenRequestBody,
        })
            .then(response => response.json())
            .then(data => {
                // Now you can use the access token to make authenticated API requests
                return data.access_token
            })
            .catch(error => console.error('Error:', error));

        const accessToken = await getAccessToken

        const response = await fetch('https://api.myanimelist.net/v2/users/@me', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
            },
        })

        const data = await response.json();

        reqUsername = data.name

        // check if the username is already in the database
        const usernameCheck = await MalToken.find({username: reqUsername});

        if (usernameCheck.length > 0) {
            console.log('username already in database')
        //     if it is then we need to update the token
            usernameCheck[0].token = accessToken;
            usernameCheck[0].save().then((savedToken) => {
                res.status(200).json(savedToken.toJSON());
            });
        } else {
            const newToken = new MalToken({
                token: accessToken,
                username: reqUsername
            });

            newToken.save().then((savedToken) => {
                res.status(200).json(savedToken.toJSON());
            });
        }
    } catch (e) {
        console.log(e)
    }
});

router.get('/get-watching', async (req, res) => {

    const username = req.query.username;
    const tokenList = await MalToken.find({username: username});
    const token = tokenList[0]['token']


    const animeListObject = await AnimeList.findOne({username: username});
    console.log(animeListObject)

    if (!animeListObject) {
        const animeList = await getMALAnimeList(token);

        console.log(`did not find ${username}'s anime list object'`)
        const animeListArray = [];
        animeList.forEach((item) => {
            animeListArray.push({title: item});
        });
        const newAnimeList = new AnimeList({
            username: username,
            animeList: animeListArray,
        });
        newAnimeList.save().then((savedAnimeList) => {
            res.status(200).json(savedAnimeList.toJSON());
        });
    } else {

        const animeList = await getMALAnimeList(token);

        console.log(`found ${username}'s anime list object'`)
        // if the list is not empty then we need to check if the list is the same as the one we just got from mal
        const animeListArray = [];

        animeList.forEach((item) => {
            animeListArray.push({title: item});
        });
        animeListObject.animeList = animeListArray;
        animeListObject.save().then((savedAnimeList) => {
            res.status(200).json(savedAnimeList.toJSON());
        });
    }

});

router.get('/sync-sonarr-with-mal', async (req, res) => {
//     get username from the request url and find the list associated with that username
    const username = req.query.username;
    const animeListObject = await AnimeList.findOne({username: username});
    if (!animeListObject) {
        res.status(404).json('No list found for this username');
    } else {
        const animeList = animeListObject.animeList;

//     get the tvdb ids for each anime in the list and store them in an array
        const tvdbIds = await getTvdbIds(animeList, tvdbidApiKey);

//    use for each loop and addAnimeToSonarr function to add each anime to sonarr
        tvdbIds.forEach((item) => {
            console.log('adding anime to sonarr:', item.title, item.tvdbId)
            addAnimeToSonarr(item.title, item.tvdbId);
        });

        res.status(200).json(tvdbIds);
    }

});


export default router;
