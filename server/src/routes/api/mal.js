import {Router} from 'express';
import MalToken from '../../models/MalToken';
import {addAnimeToSonarr, getUsernameFromToken, tvdbLogin} from "../../utils/utils";
import AnimeList from "../../models/AnimeList";

const crypto = require('crypto');


const router = Router();

let code_verifier = '';
const clientId = '6bd928870efbe9f4b1afeac249777df8';
const redirectUri = 'https://localhost:5001/api/mal/step2';
const authorizationEndpoint = 'https://myanimelist.net/v1/oauth2/authorize';
const tokenEndpoint = 'https://myanimelist.net/v1/oauth2/token';
const tvdbidApiKey = 'baa9c9bf-c0c3-45e1-9487-6692be938529'

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
        //     generate PKCE code verifier
        return crypto.randomBytes(length || 32).toString('hex');
    }

// Example usage
    const codeVerifier = generateCodeVerifier(64); //
    code_verifier = codeVerifier;
    console.log('Code Verifier:', codeVerifier);


// Step 1: Redirect user to authorization endpoint
    const authorizationUrl = `${authorizationEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
    res.status(200).json(authorizationUrl + '&code_challenge=' + codeVerifier)

});

router.get('/step2', async (req, res) => {

    const authorizationCode = req.query.code;
    console.log('Authorization Code:', authorizationCode);


    const tokenRequestBody = new URLSearchParams();
    tokenRequestBody.append('client_id', clientId);
    tokenRequestBody.append('client_secret', '1c6ace9445c9b395602866c9001682cbeebaa89ee12a08e615f323c0d1e1d464');
    tokenRequestBody.append('code', authorizationCode);
    tokenRequestBody.append('redirect_uri', redirectUri);
    tokenRequestBody.append('grant_type', 'authorization_code');
    tokenRequestBody.append('code_verifier', code_verifier);

    fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenRequestBody,
    })
        .then(response => response.json())
        .then(data => {
            // Now you can use the access token to make authenticated API requests
            console.log('got access token')
            const newToken = new MalToken({
                text: data.access_token,
            });

            newToken.save().then((savedToken) => {
                res.status(200).json(savedToken.toJSON());
            });

        })
        .catch(error => console.error('Error:', error));
});

//TODO: have it save the list to the database and associate it with the username. then make a tvdbid account to get an api call and use this code


router.get('/get-watching', async (req, res) => {

    let animeList = [];

    const tokenList = await MalToken.find().sort({createdAt: 'desc'});
    const token = tokenList[0].text;
    console.log('token:', token)
    const watchingUrl = 'https://api.myanimelist.net/v2/users/@me/animelist?status=watching&fields=list_status&limit=1000'
    fetch(watchingUrl, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
        .then(response => response.json())
        .then(data => {
            // [{"node":{"id":12115,"title":"Berserk: Ougon Jidai-hen III - Kourin","main_picture":{"medium":"https://cdn.myanimelist.net/images/anime/12/41305.jpg","large":"https://cdn.myanimelist.net/images/anime/12/41305l.jpg"}},"list_status":{"status":"watching","score":0,"num_episodes_watched":0,"is_rewatching":false,"updated_at":"2023-12-07T01:05:56+00:00"}}
            // for each node in the data, add the title to the animeList array
            data.data.forEach((item) => {
                animeList.push(item.node.title);
            })
        })
        .catch(error => console.error('Error:', error));

    const username = await getUsernameFromToken(token);

//     store the list and username in the database and associate them, if the username already exists then update the list
    const animeListObject = await AnimeList.findOne({username: username});
    if (animeListObject && animeListObject.animeList.length === 0) {
            console.log('found anime list object')
            console.log('animeList', animeList)
            //     the model exists, update the list. it looks like animeList: [ { title: 'Berserk: Ougon Jidai-hen III - Kourin' }, { title: 'Berserk: Ougon Jidai-hen II - Doldrey Kouryaku' } ]
            //     need to convert the animeList array to the same format as the model
            const animeListArray = [];
            animeList.forEach((item) => {
                animeListArray.push({title: item});
            });
            animeListObject.animeList = animeListArray;
            //     when the list is updated, return 200
            animeListObject.save().then((savedAnimeList) => {
                res.status(200).json(savedAnimeList.toJSON());
            });
    } else {
        console.log('did not find anime list object')
        console.log('animeList:', animeList)
        console.log('adding the above to the animeListArray and pushoing it to the db')
        // format the animeList array to the same format as the model
        if (animeList.length === 0) {
            console.log('why is the animeList empty?')
            fetch(watchingUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
                .then(response => response.json())
                .then(data => {
                    // [{"node":{"id":12115,"title":"Berserk: Ougon Jidai-hen III - Kourin","main_picture":{"medium":"https://cdn.myanimelist.net/images/anime/12/41305.jpg","large":"https://cdn.myanimelist.net/images/anime/12/41305l.jpg"}},"list_status":{"status":"watching","score":0,"num_episodes_watched":0,"is_rewatching":false,"updated_at":"2023-12-07T01:05:56+00:00"}}
                    // for each node in the data, add the title to the animeList array
                    let animeListArray = [];
                    data.forEach((item) => {
                        animeListArray.push({title: item});
                    })
                    console.log('animeListArray:', animeListArray)
                    const newAnimeList = new AnimeList({
                        username: username,
                        animeList: animeListArray,
                    });
                    //     when the list is created, return 201
                    newAnimeList.save().then((savedAnimeList) => {
                        res.status(201).json(savedAnimeList.toJSON());
                    });
                })
                .catch(error => console.error('Error:', error));

        } else {
            console.log('why is the animeList empty?')
            //     the model does not exist, create the list
            const animeListArray = [];
            console.log('animeList:', animeList)
            console.log('adding the above to the animeListArray and pushoing it to the db')
            animeList.forEach((item) => {
                animeListArray.push({title: item});
            });
            const newAnimeList = new AnimeList({
                username: username,
                animeList: animeListArray,
            });
            //     when the list is created, return 201
            newAnimeList.save().then((savedAnimeList) => {
                res.status(201).json(savedAnimeList.toJSON());
            });
        }
    }
});

router.get('/sync-sonarr-with-mal', async (req, res) => {
    async function getTvdbIds(animeList) {
        const tvdbIds = [];

        console.log('tvdbidApiKey:', tvdbidApiKey)
        for (const animeTitle of animeList) {
            try {
                const tvdbToken = await tvdbLogin(tvdbidApiKey);
                const searchUrl = 'https://api4.thetvdb.com/v4/search?query=' + animeTitle.title + '&type=series&limit=1'
                const response = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + tvdbToken,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                const data = await response.json();
                // currently it looks like series-18294 we need to remove series-
                let tvdbId = data.data[0].id;
                tvdbId = tvdbId.replace('series-', '');
                tvdbIds.push({title: animeTitle.title, tvdbId: tvdbId});
            } catch (error) {
                console.error(`Error fetching TVDB ID for ${animeTitle.title}: ${error.message}`);
            }
        }

        return tvdbIds;
    }

//     get username from the request url and find the list associated with that username
    const username = req.query.username;
    const animeListObject = await AnimeList.findOne({username: username});
    if (!animeListObject) {
        res.status(404).json('No list found for this username');
    } else {
        const animeList = animeListObject.animeList;

//     get the tvdb ids for each anime in the list and store them in an array
        const tvdbIds = await getTvdbIds(animeList);

//    use for each loop and addAnimeToSonarr function to add each anime to sonarr
        tvdbIds.forEach((item) => {
            console.log('adding anime to sonarr:', item.title, item.tvdbId)
            addAnimeToSonarr(item.title, item.tvdbId);
        });

        res.status(200).json(tvdbIds);


    }

});


export default router;
