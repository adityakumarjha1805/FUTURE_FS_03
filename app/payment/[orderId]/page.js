import RazorpayPayment from "../../components/RazorpayPayment.js";

export default async function PaymentPage({ params }) {
    const { orderId } = await params;
    return <RazorpayPayment orderId={orderId} />;
}