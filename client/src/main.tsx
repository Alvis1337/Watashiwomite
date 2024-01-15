import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'react-toastify/dist/ReactToastify.css';
import {Provider} from "react-redux";
import {persistor, store} from "./store/store.ts";
import {PersistGate} from "redux-persist/integration/react";
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import {ToastContainer} from "react-toastify";
import Layout from "./pages/Layout.tsx";
import Home from "./pages/Home.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout/>,
        children: [
            {
                path: "/",
                index: true,
                element: <Home/>,
                loader: async () => {
                    return null
                },
            },
        ],
    },
]);


const theme = createTheme({
    // create my own custom typography variant
    typography: {
        fontFamily: 'Roboto',
        subtitle1: {
            fontSize: '1rem',
            textTransform: 'none'
        },
        subtitle2: {
            fontSize: '.8rem',
            textTransform: 'none'
        },
    },
    palette: {
        mode: 'light',
        primary: {
            main: '#3f51b5',
        },
        secondary: {
            main: '#f50057',
        },
    },
})


ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider store={store}>
            <PersistGate persistor={persistor}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
                    <RouterProvider router={router}/>
                    <ToastContainer/>
                </ThemeProvider>
            </PersistGate>
        </Provider>
    </StrictMode>
)
