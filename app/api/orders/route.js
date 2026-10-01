import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb.js";
import { getSessionUser } from "../../../lib/auth.js";
import { cleanText, errorResponse, readJson } from "../../../lib/api.js";

export const runtime = "nodejs";

export async function GET() {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);

    try {
        const orders = await (await getDb()).collection("orders")
            .find({ userId: new ObjectId(user.id) })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
        return Response.json({ orders: orders.map(({ _id, ...order }) => ({ id: _id.toString(), ...order })) });
    } catch (error) {
        console.error("Order listing failed:", error);
        return errorResponse("Unable to load orders.", 500);
    }
}

export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);
    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;

    const address = parsed.data.shippingAddress || {};
    const shippingAddress = {
        name: cleanText(address.name, 100),
        phone: cleanText(address.phone, 40),
        line1: cleanText(address.line1, 180),
        line2: cleanText(address.line2, 180),
        city: cleanText(address.city, 100),
        region: cleanText(address.region, 100),
        postalCode: cleanText(address.postalCode, 30),
        country: cleanText(address.country, 100),
    };
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.line1 ||
        !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
        return errorResponse("Complete the required shipping address fields.");
    }

    try {
        const db = await getDb();
        const userId = new ObjectId(user.id);
        const carts = db.collection("carts");
        const cart = await carts.findOne({ userId });
        if (!cart?.items?.length) return errorResponse("Your cart is empty.", 409);

        const products = await db.collection("products")
            .find({ _id: { $in: cart.items.map((item) => item.productId) }, active: { $ne: false } })
            .toArray();
        const productById = new Map(products.map((product) => [product._id.toString(), product]));
        const orderItems = [];
        for (const item of cart.items) {
            const product = productById.get(item.productId.toString());
            if (!product) return errorResponse("A product in your cart is no longer available.", 409);
            if (item.quantity > product.stock) return errorResponse(`${product.name} no longer has enough stock.`, 409);
            orderItems.push({
                productId: product._id,
                name: product.name,
                image: product.image,
                unitPrice: product.price,
                quantity: item.quantity,
            });
        }

        const order = {
            userId,
            items: orderItems,
            total: orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
            shippingAddress,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const inserted = await db.collection("orders").insertOne(order);
        const changedStock = [];

        try {
            for (const item of orderItems) {
                const result = await db.collection("products").updateOne(
                    { _id: item.productId, stock: { $gte: item.quantity }, active: { $ne: false } },
                    { $inc: { stock: -item.quantity }, $set: { updatedAt: new Date() } },
                );
                if (!result.modifiedCount) throw new Error("STOCK_UNAVAILABLE");
                changedStock.push(item);
            }
        } catch (error) {
            await Promise.all(changedStock.map((item) => db.collection("products").updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } },
            )));
            await db.collection("orders").deleteOne({ _id: inserted.insertedId });
            if (error.message === "STOCK_UNAVAILABLE") return errorResponse("Stock changed while placing the order. Please try again.", 409);
            throw error;
        }

        await carts.deleteOne({ userId });
        return Response.json({ order: { id: inserted.insertedId.toString(), ...order } }, { status: 201 });
    } catch (error) {
        console.error("Order creation failed:", error);
        return errorResponse("Unable to place order.", 500);
    }
}