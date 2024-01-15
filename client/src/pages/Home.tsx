import {Grid} from "@mui/material";
import Button from "@mui/material/Button";
import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {syncSonarrWithMal} from "../components/utils.ts";

const Home = () => {
    const [link, setLink] = useState("")
    useEffect(() => {
        fetch("https://localhost:5001/api/mal/step1", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
       } )
            .then(res => res.json())
            .then(data => {
                console.log(data)
                setLink(data)
            })
    }, [])

    // open links in new tabs

    return (
        <Grid container sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center',
            alignSelf: 'center',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            p: '0px',
            m: '0px',
        }}>
            <Grid item xs={12} sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
                alignSelf: 'center',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                p: '0px',
                m: '0px',
            }}>
                <Link target={'_blank'} to={link}>
                    <Button sx={{my: '2rem'}} variant={"contained"} color={"primary"}> Do OAUTH </Button>
                </Link>
                <Link  target={'_blank'} to={'https://localhost:5001/api/mal/get-watching?username=alvisleet'}>
                <Button sx={{my: '2rem'}} variant="contained" color="primary"> Sync watch list </Button>
                </Link>
                <Button onClick={() => {
                    syncSonarrWithMal('alvisleet');
                }} sx={{my: '2rem'}} variant="contained" color="primary"> Sync Sonarr with Mal </Button>
            </Grid>
        </Grid>
    )
}

export default Home
