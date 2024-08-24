import { Grid, Typography } from "@mui/material";

const Hero = () => {
    return (
        <Grid
            container
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: 4,
            }}
        >
            <Grid item xs={12}>
                <Typography
                    variant="h1"
                    sx={{
                        fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' }, // Responsive font size
                        fontWeight: 'bold',
                        marginBottom: 2,
                    }}
                >
                    Mal2Sonarr
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <Typography
                    variant="h2"
                    sx={{
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }, // Responsive font size
                        marginTop: 0,
                        marginBottom: 4,
                        lineHeight: 1.4,
                    }}
                >
                    Just follow the flow and we will get your MAL watching list synced with your Sonarr!
                </Typography>
            </Grid>
        </Grid>
    );
}

export default Hero;
