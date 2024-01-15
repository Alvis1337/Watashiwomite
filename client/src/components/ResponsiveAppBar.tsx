import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import {Link} from "react-router-dom";

const pagesLeft = [ 'FLOOR PLANS', 'QUICK MOVE-INS'];
const pagesRight = ['VIRTUAL TOURS', 'ABOUT'];
const linksLeft = ['/floor-plans', '/quick-move-ins'];
const linksRight = ['/virtual-tours', '/about'];

function ResponsiveAppBar() {
    const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
    const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };


    return (
        <AppBar sx={{backgroundColor: '#303845'}} position="static">
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                        <IconButton
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleOpenNavMenu}
                            color="inherit"
                        >
                            <MenuIcon />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorElNav}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            open={Boolean(anchorElNav)}
                            onClose={handleCloseNavMenu}
                            sx={{
                                display: { xs: 'block', md: 'none' },
                            }}
                        >
                            {pagesLeft.map((page, index) => (
                                <MenuItem key={page} onClick={handleCloseNavMenu}>
                                    <Link key={page} to={linksLeft[index]}>
                                    <Typography key={page} textAlign="center">{page}</Typography>
                                    </Link>
                                </MenuItem>
                            ))}
                            {pagesRight.map((page, index) => (
                                <MenuItem key={page} onClick={handleCloseNavMenu}>
                                    <Link key={page} to={linksRight[index]}>
                                    <Typography key={page} textAlign="center">{page}</Typography>
                                    </Link>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                    <Box sx={{
                        flexGrow: 1,
                        display: {xs: 'none', md: 'flex'},
                        justifyContent: 'center',
                        justifyItems: 'center',
                        alignItems: 'center',
                        alignContent: 'center',
                        alignSelf: 'center',
                        flexDirection: 'row',
                    }}>
                    <Box sx={{display: { xs: 'none', md: 'flex' } }}>
                        {pagesLeft.map((page, index) => (
                            <Link key={page} to={linksLeft[index]}>
                            <Button
                                key={page}
                                onClick={handleCloseNavMenu}
                                sx={{ my: 2, color: 'white', display: 'block', width: '150px'  }}
                            >
                                {page}
                            </Button>
                            </Link>
                        ))}
                    </Box>
                    <Box sx={{display: { xs: 'none', md: 'flex' } }}>
                        {pagesRight.map((page, index) => (
                            <Link key={page} to={linksRight[index]}>
                            <Button
                                key={page}
                                onClick={handleCloseNavMenu}
                                sx={{ my: 2, color: 'white', display: 'block', width: '150px'  }}
                            >
                                {page}
                            </Button>
                            </Link>
                        ))}
                    </Box>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
export default ResponsiveAppBar;