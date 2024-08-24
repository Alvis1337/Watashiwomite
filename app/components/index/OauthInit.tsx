"use client";

import { useState } from "react";
import { Button, TextField, Grid } from "@mui/material";

const OauthInit = () => {
    const [username, setUsername] = useState("");
    const [link, setLink] = useState<string | null>(null);

    const handleAuthorize = async () => {
        try {
            const response = await fetch(`/api/oauth/step1?username=${encodeURIComponent(username)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (data.authorizationUrl) {
                setLink(data.authorizationUrl);
            } else {
                console.error('Authorization URL not found');
            }
        } catch (error) {
            console.error('Failed to fetch authorization URL', error);
        }
    };

    return (
        <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12}>
                <TextField
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item xs={12} sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignContent: 'center',
                    marginTop: 2,
                }}>                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAuthorize}
                    disabled={!username}
                >
                    Authorize
                </Button>
            </Grid>
            {link && (
                <Grid item xs={12} sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignContent: 'center',
                    marginTop: 2,
                }}>                    <Button variant="contained" color="primary" component="a" href={link}>
                        Continue to Authorization
                    </Button>
                </Grid>
            )}
        </Grid>
    );
};

export default OauthInit;
