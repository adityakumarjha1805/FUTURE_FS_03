import Razorpay from "razorpay";
import { ObjectId } from "mongodb";
import { getSessionUser } from "../../../../../lib/auth.js";
import { errorResponse, readJson } from "../../../../../lib/api.js";
import { getDb } from "../../../../../lib/mongodb.js";

export const runtime = "nodejs";

function paymentDetails(order, keyId, user) {
    return {
        keyId,
        orderId: order._id.toString(),
        providerOrderId: order.payment.providerOrderId,
        amount: order.payment.amount,
        currency: order.payment.currency,
        prefill: {
            name: order.shippingAddress.name,
            email: user.email,
            contact: order.shippingAddress.phone,
        },
    };
}

export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);

    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;
    const orderId = parsed.data.orderId;
    if (!ObjectId.isValid(orderId)) return errorResponse("Invalid order ID.");

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        return errorResponse("Razorpay test keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local.", 503);
    }

    try {
        const db = await getDb();
        const orders = db.collection("orders");
        const order = await orders.findOne({ _id: new ObjectId(orderId), userId: new ObjectId(user.id) });
        if (!order) return errorResponse("Order not found.", 404);
        if (order.status === "paid") return errorResponse("This order has already been paid.", 409);

        const amount = Math.round(order.total * 100);
        const currency = process.env.RAZORPAY_CURRENCY || "USD";
        if (!Number.isSafeInteger(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) {
            return errorResponse("Order amount or payment currency is invalid.", 400);
        }

        if (order.payment?.providerOrderId && order.payment.amount === amount && order.payment.currency === currency) {
            return Response.json(paymentDetails(order, keyId, user));
        }

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const providerOrder = await razorpay.orders.create({
            amount,
            currency,
            receipt: order._id.toString(),
            notes: { appOrderId: order._id.toString(), customerId: user.id },
        });

        order.payment = {
            provider: "razorpay",
            providerOrderId: providerOrder.id,
            amount,
            currency,
            status: "created",
            createdAt: new Date(),
        };
        await orders.updateOne(
            { _id: order._id, userId: new ObjectId(user.id), status: { $ne: "paid" } },
            { $set: { payment: order.payment, updatedAt: new Date() } },
        );

        return Response.json(paymentDetails(order, keyId, user), { status: 201 });
    } catch (error) {
        console.error("Razorpay order creation failed:", error);
        return errorResponse("Unable to start Razorpay checkout. Please try again.", 502);
    }
}