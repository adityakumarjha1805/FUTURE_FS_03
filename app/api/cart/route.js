import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb.js";
import { getSessionUser } from "../../../lib/auth.js";
import { errorResponse, readJson } from "../../../lib/api.js";

export const runtime = "nodejs";

async function authenticatedUser() {
    return getSessionUser();
}

export async function GET() {
    const user = await authenticatedUser();
    if (!user) return errorResponse("Authentication required.", 401);

    try {
        const db = await getDb();
        const cart = await db.collection("carts").findOne({ userId: new ObjectId(user.id) });
        const items = cart?.items || [];
        const products = items.length
            ? await db.collection("products").find({ _id: { $in: items.map((item) => item.productId) } }).toArray()
            : [];
        const productById = new Map(products.map((product) => [product._id.toString(), product]));

        return Response.json({
            items: items.flatMap((item) => {
                const product = productById.get(item.productId.toString());
                return product?.active === false ? [] : [{
                    product: product ? {
                        id: product._id.toString(),
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        stock: product.stock,
                    } : null,
                    productId: item.productId.toString(),
                    quantity: item.quantity,
                }].filter((entry) => entry.product);
            }),
        });
    } catch (error) {
        console.error("Cart lookup failed:", error);
        return errorResponse("Unable to load cart.", 500);
    }
}

export async function PUT(request) {
    const user = await authenticatedUser();
    if (!user) return errorResponse("Authentication required.", 401);
    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;

    const { productId, quantity } = parsed.data;
    if (!ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
        return errorResponse("Provide a valid productId and quantity from 0 to 99.");
    }

    try {
        const db = await getDb();
        const products = db.collection("products");
        const product = await products.findOne({ _id: new ObjectId(productId), active: { $ne: false } });
        if (!product) return errorResponse("Product not found.", 404);
        if (quantity > product.stock) return errorResponse("Requested quantity exceeds available stock.", 409);

        const carts = db.collection("carts");
        const userId = new ObjectId(user.id);
        const cart = await carts.findOne({ userId });
        const items = cart?.items || [];
        const existingIndex = items.findIndex((item) => item.productId.toString() === productId);
        if (quantity === 0) {
            if (existingIndex >= 0) items.splice(existingIndex, 1);
        } else if (existingIndex >= 0) {
            items[existingIndex] = { productId: new ObjectId(productId), quantity };
        } else {
            items.push({ productId: new ObjectId(productId), quantity });
        }

        await carts.updateOne(
            { userId },
            { $set: { items, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true },
        );
        return Response.json({ success: true, itemCount: items.reduce((total, item) => total + item.quantity, 0) });
    } catch (error) {
        console.error("Cart update failed:", error);
        return errorResponse("Unable to update cart.", 500);
    }
}

export async function DELETE(request) {
    const user = await authenticatedUser();
    if (!user) return errorResponse("Authentication required.", 401);

    try {
        const db = await getDb();
        const userId = new ObjectId(user.id);
        const productId = new URL(request.url).searchParams.get("productId");
        if (!productId) {
            await db.collection("carts").deleteOne({ userId });
            return Response.json({ success: true });
        }
        if (!ObjectId.isValid(productId)) return errorResponse("Invalid productId.");

        await db.collection("carts").updateOne(
            { userId },
            { $pull: { items: { productId: new ObjectId(productId) } }, $set: { updatedAt: new Date() } },
        );
        return Response.json({ success: true });
    } catch (error) {
        console.error("Cart removal failed:", error);
        return errorResponse("Unable to update cart.", 500);
    }
}