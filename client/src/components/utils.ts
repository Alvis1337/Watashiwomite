export const syncSonarrWithMal = async (username: string) => {
    const response = await fetch('https://localhost:5001/api/mal/sync-sonarr-with-mal?username=' + username)
    const data = await response.json()
    console.log(data)
    return data
}