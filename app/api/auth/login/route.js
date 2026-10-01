import bcrypt from "bcryptjs";
import { getDb } from "../../../../lib/mongodb.js";
import { createSessionToken, publicUser, sessionCookie } from "../../../../lib/auth.js";
import { cleanText, errorResponse, readJson } from "../../../../lib/api.js";

export const runtime = "nodejs";

export async function POST(request) {
    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;

    const email = cleanText(parsed.data.email, 254).toLowerCase();
    const password = parsed.data.password;
    if (!email || typeof password !== "string") return errorResponse("Email and password are required.");

    try {
        const db = await getDb();
        const user = await db.collection("users").findOne({ email });
        const validPassword = user && await bcrypt.compare(password, user.passwordHash);

        if (!validPassword) return errorResponse("Email or password is incorrect.", 401);

        return Response.json(
            { user: publicUser(user) },
            { headers: { "Set-Cookie": sessionCookie(createSessionToken(user)) } },
        );
    } catch (error) {
        console.error("Login failed:", error);
        return errorResponse("Unable to sign in.", 500);
    }
}