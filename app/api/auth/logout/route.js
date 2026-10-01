import { sessionCookie } from "../../../../lib/auth.js";

export async function POST() {
    return Response.json(
        { success: true },
        { headers: { "Set-Cookie": sessionCookie("", 0) } },
    );
}