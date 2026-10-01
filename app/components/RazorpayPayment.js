"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import styles from "./RazorpayPayment.module.css";

export default function RazorpayPayment({ orderId }) {
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScriptReady, setIsScriptReady] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let isActive = true;

        fetch("/api/payments/razorpay/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
        })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Unable to prepare payment.");
                if (isActive) setPaymentOrder(result);
            })
            .catch((requestError) => {
                if (isActive) setError(requestError.message || "Unable to prepare payment.");
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [orderId]);

    async function openCheckout() {
        if (!window.Razorpay || !paymentOrder) return;

        setError("");
        const checkout = new window.Razorpay({
            key: paymentOrder.keyId,
            amount: paymentOrder.amount,
            currency: paymentOrder.currency,
            name: "Forever",
            description: `Order ${orderId}`,
            order_id: paymentOrder.providerOrderId,
            prefill: paymentOrder.prefill,
            theme: { color: "#171717" },
            handler: async (response) => {
                setIsVerifying(true);
                try {
                    const verification = await fetch("/api/payments/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId, ...response }),
                    });
                    const result = await verification.json();
                    if (!verification.ok) throw new Error(result.error || "Payment verification failed.");
                    setIsPaid(true);
                } catch (verificationError) {
                    setError(verificationError.message || "Payment verification failed.");
                } finally {
                    setIsVerifying(false);
                }
            },
            modal: {
                ondismiss: () => setError("Payment was not completed. You can retry checkout."),
            },
        });

        checkout.on("payment.failed", (response) => {
            setError(response.error?.description || "Payment failed. Please try another payment method.");
        });
        checkout.open();
    }

    return (
        <main className={styles.page}>
            {!isPaid && (
                <Script
                    src="https://checkout.razorpay.com/v1/checkout.js"
                    strategy="afterInteractive"
                    onError={() => setError("Razorpay Checkout could not be loaded. Check your connection and retry.")}
                    onReady={() => setIsScriptReady(true)}
                />
            )}
            <p className={styles.eyebrow}>Secure checkout</p>
            <h1 className={styles.title}>{isPaid ? "Payment confirmed" : "Complete your payment"}</h1>
            <p className={styles.orderReference}>Order {orderId}</p>

            {isPaid ? (
                <section className={styles.result}>
                    <p>Your payment was verified and your order is confirmed.</p>
                    <Link className={styles.returnLink} href="/collection">Continue shopping</Link>
                </section>
            ) : (
                <section className={styles.paymentPanel}>
                    <div className={styles.providerRow}>
                        <span>Payment method</span>
                        <strong>Razorpay</strong>
                    </div>
                    <div className={styles.amountRow}>
                        <span>Amount due</span>
                        <strong>
                            {paymentOrder
                                ? `${paymentOrder.currency} ${(paymentOrder.amount / 100).toFixed(2)}`
                                : "—"}
                        </strong>
                    </div>
                    {isLoading ? (
                        <p className={styles.status} role="status">Preparing secure payment...</p>
                    ) : isVerifying ? (
                        <p className={styles.status} role="status">Verifying payment...</p>
                    ) : paymentOrder ? (
                        <button
                            className={styles.payButton}
                            disabled={!isScriptReady}
                            onClick={openCheckout}
                            type="button"
                        >
                            {isScriptReady ? "Pay with Razorpay" : "Loading Razorpay..."}
                        </button>
                    ) : null}
                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <Link className={styles.returnLink} href="/collection">Return to collection</Link>
                </section>
            )}
        </main>
    );
}