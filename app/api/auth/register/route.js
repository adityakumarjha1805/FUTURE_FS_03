import bcrypt from "bcryptjs";
import { getDb } from "../../../../lib/mongodb.js";
import { createSessionToken, publicUser, sessionCookie } from "../../../../lib/auth.js";
import { cleanText, errorResponse, readJson } from "../../../../lib/api.js";

export const runtime = "nodejs";

export async function POST(request) {
    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;

    const name = cleanText(parsed.data.name, 80);
    const email = cleanText(parsed.data.email, 254).toLowerCase();
    const password = parsed.data.password;

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse("Enter a name and valid email address.");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
        return errorResponse("Password must be between 8 and 72 characters.");
    }

    try {
        const db = await getDb();
        const user = {
            name,
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role: "customer",
            createdAt: new Date(),
        };
        const result = await db.collection("users").insertOne(user);
        user._id = result.insertedId;

        return Response.json(
            { user: publicUser(user) },
            { status: 201, headers: { "Set-Cookie": sessionCookie(createSessionToken(user)) } },
        );
    } catch (error) {
        if (error.code === 11000) return errorResponse("An account with this email already exists.", 409);
        console.error("Registration failed:", error);
        return errorResponse("Unable to create account.", 500);
    }
}