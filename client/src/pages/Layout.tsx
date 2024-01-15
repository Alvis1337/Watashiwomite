import {Grid} from "@mui/material";
import {Outlet} from "react-router-dom";
import ResponsiveAppBar from "../components/ResponsiveAppBar";

const Layout = () => {
    return (
            <Grid container sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
            }}>
                <ResponsiveAppBar/>
                <Outlet/>
            </Grid>
    )
}

export default Layout;
