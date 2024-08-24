'use client';
import { Roboto } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
    palette: {
        mode: 'dark',
      },
  typography: {
    fontFamily: roboto.style.fontFamily,
    h1: {
        fontSize: '6rem'
    },
    h2: {
        fontSize: '3rem'
    },
    h3: {
        fontsize: '2rem'
    },
    h4: {
        fontsize: '1rem'
    }
  },
});

export default theme;
