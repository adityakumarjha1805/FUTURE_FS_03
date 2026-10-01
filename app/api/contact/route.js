import { getDb } from "../../../lib/mongodb.js";
import { cleanText, errorResponse, readJson } from "../../../lib/api.js";

export const runtime = "nodejs";

export async function POST(request) {
    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;

    const name = cleanText(parsed.data.name, 100);
    const email = cleanText(parsed.data.email, 254).toLowerCase();
    const subject = cleanText(parsed.data.subject, 160);
    const message = cleanText(parsed.data.message, 5000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
        return errorResponse("Name, a valid email address, and message are required.");
    }

    try {
        const result = await (await getDb()).collection("contactMessages").insertOne({
            name,
            email,
            subject,
            message,
            status: "new",
            createdAt: new Date(),
        });
        return Response.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
    } catch (error) {
        console.error("Contact submission failed:", error);
        return errorResponse("Unable to submit your message.", 500);
    }
}