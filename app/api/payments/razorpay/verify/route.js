import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { ObjectId } from "mongodb";
import { getSessionUser } from "../../../../../lib/auth.js";
import { errorResponse, readJson } from "../../../../../lib/api.js";
import { getDb } from "../../../../../lib/mongodb.js";

export const runtime = "nodejs";

export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return errorResponse("Authentication required.", 401);

    const parsed = await readJson(request);
    if (parsed.response) return parsed.response;
    const { orderId, razorpay_order_id: providerOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;
    if (!ObjectId.isValid(orderId) || typeof providerOrderId !== "string" ||
        typeof paymentId !== "string" || typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
        return errorResponse("Invalid Razorpay payment response.");
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return errorResponse("Razorpay keys are not configured.", 503);

    try {
        const db = await getDb();
        const orders = db.collection("orders");
        const userId = new ObjectId(user.id);
        const order = await orders.findOne({ _id: new ObjectId(orderId), userId });
        if (!order) return errorResponse("Order not found.", 404);
        if (order.status === "paid" && order.payment?.paymentId === paymentId) {
            return Response.json({ success: true, orderId });
        }
        if (order.payment?.providerOrderId !== providerOrderId) {
            return errorResponse("Payment does not match this order.", 409);
        }

        const expected = createHmac("sha256", keySecret)
            .update(`${providerOrderId}|${paymentId}`)
            .digest();
        const received = Buffer.from(signature, "hex");
        if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
            return errorResponse("Razorpay payment signature is invalid.", 400);
        }

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const payment = await razorpay.payments.fetch(paymentId);
        if (payment.order_id !== providerOrderId || payment.status !== "captured") {
            return errorResponse("Payment has not been captured. Do not fulfill this order yet.", 409);
        }

        const update = await orders.updateOne(
            {
                _id: order._id,
                userId,
                "payment.providerOrderId": providerOrderId,
                status: { $ne: "paid" },
            },
            {
                $set: {
                    status: "paid",
                    "payment.status": "paid",
                    "payment.paymentId": paymentId,
                    "payment.paidAt": new Date(),
                    updatedAt: new Date(),
                },
            },
        );
        if (!update.modifiedCount) return errorResponse("Order payment could not be updated.", 409);

        return Response.json({ success: true, orderId });
    } catch (error) {
        console.error("Razorpay payment verification failed:", error);
        return errorResponse("Unable to verify Razorpay payment.", 502);
    }
}