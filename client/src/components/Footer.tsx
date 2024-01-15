import {Grid} from "@mui/material";

const Footer = () => {

    return (
        <Grid container sx={{
            display: 'flex',
            flexDirection: {xs: 'column', md: 'row'},
            backgroundColor: '#303845',
            justifyContent: 'center',
            alignItems: 'center',
            px: '4rem',
            py: '4rem',
        }}>

        </Grid>
    )
}

export default Footer;