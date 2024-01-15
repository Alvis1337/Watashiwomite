import {createSlice} from "@reduxjs/toolkit";

export interface AuthState {
    authenticated: boolean,
    idToken: never,
    refreshToken: never,
    accessToken: never,
    expiresIn: never,
    refreshExpiresIn: never,
    tokenType: never,
    tokenLifetime: never,
    sessionState: never,
    scope: never,
    idTokenParsed: never,
    tokenParsed: never,
    refreshTokenParsed: never,
    isStaff: never,
    userType: never,
    userId: never,
    userEmail: never,

}

const initialState = {
    authenticated: false,
    idToken: '',
    refreshToken: '',
    accessToken: '',
    expiresIn: '',
    refreshExpiresIn: '',
    tokenType: '',
    tokenLifetime: '',
    sessionState: '',
    scope: '',
    idTokenParsed: {},
    tokenParsed: {},
    refreshTokenParsed: {},
    userType: '',
    userId: '',
    userEmail: '',
}

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (state, action) => {
            console.log(state)
            return state = action.payload
        }
    }
})

export const {setAuth} = authSlice.actions

export default authSlice.reducer
