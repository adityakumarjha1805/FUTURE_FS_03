import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb.js";
import { getSessionUser } from "../../../../lib/auth.js";
import { cleanText, errorResponse, publicProduct, readJson } from "../../../../lib/api.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return errorResponse("Product not found.", 404);

    try {
        const product = await (await getDb()).collection("products").findOne({
            _id: new ObjectId(id),
            active: { $ne: false },
        });
        return product ? Response.json({ product: publicProduct(product) }) : errorResponse("Product not found.", 404);
    } catch (error) {
        console.error("Product lookup failed:", error);
        return errorResponse("Unable to load product.", 500);
    }
}

export async function PATCH(request, { params }) {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);
    if (user.role !== "admin") return errorResponse("Admin access required.", 403);

    const { id } = await params;
    if (!ObjectId.isValid(id)) return errorResponse("Product not found.", 404);
    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;

    const updates = {};
    for (const field of ["name", "image", "category", "description"]) {
        if (field in parsed.data) updates[field] = cleanText(parsed.data[field], field === "description" ? 1000 : 120);
    }
    if ("price" in parsed.data) {
        const price = Number(parsed.data.price);
        if (!Number.isFinite(price) || price < 0) return errorResponse("Price must be a non-negative number.");
        updates.price = price;
    }
    if ("stock" in parsed.data) {
        const stock = Number(parsed.data.stock);
        if (!Number.isInteger(stock) || stock < 0) return errorResponse("Stock must be a non-negative whole number.");
        updates.stock = stock;
    }
    if ("active" in parsed.data) {
        if (typeof parsed.data.active !== "boolean") return errorResponse("Active must be a boolean.");
        updates.active = parsed.data.active;
    }
    if (!Object.keys(updates).length) return errorResponse("No supported product fields were provided.");
    updates.updatedAt = new Date();

    try {
        const result = await (await getDb()).collection("products").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: "after" },
        );
        return result ? Response.json({ product: publicProduct(result) }) : errorResponse("Product not found.", 404);
    } catch (error) {
        console.error("Product update failed:", error);
        return errorResponse("Unable to update product.", 500);
    }
}

export async function DELETE(_request, { params }) {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);
    if (user.role !== "admin") return errorResponse("Admin access required.", 403);

    const { id } = await params;
    if (!ObjectId.isValid(id)) return errorResponse("Product not found.", 404);

    try {
        const result = await (await getDb()).collection("products").updateOne(
            { _id: new ObjectId(id) },
            { $set: { active: false, updatedAt: new Date() } },
        );
        return result.matchedCount ? Response.json({ success: true }) : errorResponse("Product not found.", 404);
    } catch (error) {
        console.error("Product deletion failed:", error);
        return errorResponse("Unable to delete product.", 500);
    }
}