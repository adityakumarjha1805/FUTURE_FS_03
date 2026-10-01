import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getDb } from "./mongodb.js";

export const SESSION_COOKIE = "forever_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

function getJwtSecret() {
    const secret = process.env.JWT_SECRET ||
        (process.env.NODE_ENV !== "production" ? "development-only-change-this-secret" : "");

    if (!secret) {
        throw new Error("JWT_SECRET must be configured in production.");
    }

    return secret;
}

export function createSessionToken(user) {
    return jwt.sign(
        { sub: user._id.toString(), role: user.role },
        getJwtSecret(),
        { expiresIn: SESSION_AGE_SECONDS },
    );
}

export function sessionCookie(token, maxAge = SESSION_AGE_SECONDS) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function getSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    try {
        const payload = jwt.verify(token, getJwtSecret());
        const { ObjectId } = await import("mongodb");
        if (!ObjectId.isValid(payload.sub)) return null;

        const db = await getDb();
        const user = await db.collection("users").findOne(
            { _id: new ObjectId(payload.sub) },
            { projection: { passwordHash: 0 } },
        );

        if (!user) return null;
        const { _id, ...fields } = user;
        return { id: _id.toString(), ...fields };
    } catch {
        return null;
    }
}

export function publicUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
    };
}