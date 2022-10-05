import { notifyOnError, notifyOnLowQuota } from "./smtp.mjs"
import { getRemainingQuotaFor } from "./checkPretixQuota.mjs";
import { checkAndRefresh } from "./checkAndRefreshToken.mjs"
import * as dotenv from "dotenv";
import * as fs from "fs/promises";
dotenv.config({ path: ".env.generated" })
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const quotaIds = process.env.PRETIX_QUOTA_IDS.split(",").map(s => s.trim())

const mailRecpt = process.env.PRETIX_NOTIFY_EMAIL;
let currentToken = {
    access_token: process.env.PRETIX_ACCESS_TOKEN,
    refresh_token: process.env.PRETIX_REFRESH_TOKEN,
    code: process.env.PRETIX_OAUTH_CODE
};
const pretix_hostname = process.env.PRETIX_HOSTNAME;
const pretix_path = `${pretix_hostname}/api/v1/organizers/${process.env.PRETIX_ORGANIZER_NAME}/events/${process.env.PRETIX_EVENT_NAME}`;
const clientId = process.env.PRETIX_OAUTH_CLIENT_ID;
const clientSecret = process.env.PRETIX_OAUTH_CLIENT_SECRET;
const smtpServer = process.env.PRETIX_SMTP_SERVER;

async function checkAndNotify() {
    console.log(`Starting check at `, new Date().toISOString());
    try {
        currentToken = await checkAndRefresh(pretix_hostname, clientId, clientSecret, currentToken);
        await fs.writeFile("./.env.generated",
            `# This file is generated when the program is run. Modifications will be overwritten.
# You can delete this file to force the app to reretreive credentials
PRETIX_ACCESS_TOKEN=${currentToken.access_token}
PRETIX_REFRESH_TOKEN=${currentToken.refresh_token}`
        );
        for (const id of quotaIds) {
            const remaining = await getRemainingQuotaFor(id, currentToken.access_token, pretix_path);
            if (remaining < 2) {
                await notifyOnLowQuota(mailRecpt, smtpServer, id, remaining, pretix_path).catch((err) => console.error("Error while sending Notification-Mail", err));
            }
        }
    } catch (err) {
        console.error(err);
        await notifyOnError(mailRecpt, smtpServer, err).catch((err) => console.error("Error while sending Error-Mail", err));;
    }
}

await checkAndNotify();
setInterval(checkAndNotify, 1 * 60 * 1000);