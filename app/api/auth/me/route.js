import { getSessionUser } from "../../../../lib/auth.js";
import { errorResponse } from "../../../../lib/api.js";

export const runtime = "nodejs";

export async function GET() {
    try {
        const user = await getSessionUser();
        return user ? Response.json({ user }) : errorResponse("Authentication required.", 401);
    } catch (error) {
        console.error("Session lookup failed:", error);
        return errorResponse("Unable to read session.", 500);
    }
}