export async function refreshToken(pretix_hostname, clientId, clientSecret, tokenOrCode, isInitialCode) {
    let auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64url");
    const tokenResponse = await fetch(`${pretix_hostname}/api/v1/oauth/token`, {
        method: "POST",
        body: isInitialCode
            ? `grant_type=authorization_code&code=${tokenOrCode}&redirect_uri=https://localhost:8080/redirect`
            : `grant_type=refresh_token&refresh_token=${tokenOrCode}`,
        headers: {
            Accept: "application/json",
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });
    if (!tokenResponse.ok) {
        throw new Error(`Error on refereshing access token\r\n` +
            `Status: ${tokenResponse.status} ${tokenResponse.statusText}`
        )
    }
    return await tokenResponse.json();
}

export async function checkAndRefresh(pretix_hostname, clientId, clientSecret, currentToken) {
    const meResponse = await fetch(`${pretix_hostname}/api/v1/me`, {
        headers: { Authorization: `Bearer ${currentToken.access_token}` }
    });
    if (!meResponse.ok) {
        console.log("Accesss token invalid. Likely expired. Trying to refresh");
        if (currentToken.code) {

            return await refreshToken(pretix_hostname, clientId, clientSecret, currentToken.code, true);
        } else {
            return await refreshToken(pretix_hostname, clientId, clientSecret, currentToken.refresh_token);
        }
    }
    return currentToken;
}