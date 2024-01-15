import {Grid} from "@mui/material";
import Button from "@mui/material/Button";

const Home = () => {

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
                <Button sx={{my: '2rem'}} variant="contained" color="primary"> Sync Sonarr with Mal </Button>
                <Button sx={{my: '2rem'}} variant="contained" color="primary"> Get Sonarr Anime List </Button>
                <Button sx={{my: '2rem'}} variant={"contained"} color={"primary"}> Do OAUTH </Button>
            </Grid>
        </Grid>
    )
}

export default Home
