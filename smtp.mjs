import * as net from "net"
import { randomUUID } from "crypto";

function formatSmtpDate(date) {
    //Thu, 26 Oct 2006 13:10:50 +0200
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${date.toTimeString().replace(/GMT| *\(.*\)/g, "")}`
}

export async function notifyOnLowQuota(rcpt, server, id, count, pretix_path) {
    await sendMail(
        rcpt,
        server,
        `The Quota with ID ${id} has less than 2 remaining places.`,
        `Remaining places: ${count}`,
        `Link: ${pretix_path}/quotas/${id}/`
    )
}

export async function notifyOnError(rcpt, server, error) {
    await sendMail(
        rcpt,
        server,
        `Error in Qouta checking Bot:`,
        error?.message || error
    )
}

export async function sendMail(rcpt, server, ...text) {
    return new Promise((resolve, reject) => {
        const smtpLines = [
            "HELO example.com",
            "MAIL FROM:pretix-notify@example.com",
            `RCPT TO:${rcpt}`,
            "DATA",
            `From: Pretix-Notification<pretix-notify@example.com>`,
            `To: <${rcpt}>`,
            `Subject: Pretix Quota Notification`,
            `Date: ${formatSmtpDate(new Date())}Thu, 26 Oct 2006 13:10:50 +0200`,
            `Message-ID: <${randomUUID()}@example.com>`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Reply-To: ${rcpt}`,
            "",
            ...text,
            ".",
            "QUIT",
            ""
        ];
        const socket = new net.Socket();
        setTimeout(() => {
            socket.destroy();
            reject("Mail timeout reached");
        }, 1 * 60 * 1000)
        //socket.on("data", (data) => console.log("TCP Data", data.toString("utf-8")));
        socket.on("close", (error) => {
            if (error) {
                reject("Error on closing")
            } else {
                resolve();
            }
        })
        socket.connect(25, server, () => {
            console.log(`Connected to ${server}`)
            socket.write(smtpLines.join("\r\n"), (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log("Written successfully")
                }
            });
        });
    });
}