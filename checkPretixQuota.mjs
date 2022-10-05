async function request(url, access_token) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!response.ok) {
        throw new Error(`Error on request ${url}\r\n` +
            `Status: ${response.status} ${response.statusText}` +
            `Body: ${await tokenResponse.text()}`
        )
    }
    return await response.json();
}

export async function getRemainingQuotaFor(id, access_token, pretix_path) {
    const quota = await request(`${pretix_path}/quotas/${id}`, access_token);
    let remainingQuota = quota.size ?? 0;
    const orderpositions = await request(`${pretix_path}/orderpositions/?order__status__in=n,p&item__in=${quota.items.join(",")}&variation__in=${quota.variations.join(",")}`, access_token)
    //console.log(orderpositions)
    remainingQuota -= orderpositions.count;
    for (const item of quota.items) {
        for (const variation of quota.variations) {
            const waitingList = await request(`${pretix_path}/waitinglistentries/?item=${item}&variation=${variation}`, access_token)
            remainingQuota -= waitingList.count;
        }
    }
    console.log(`Reminign for ${id}: ${remainingQuota}`);
    return remainingQuota
}