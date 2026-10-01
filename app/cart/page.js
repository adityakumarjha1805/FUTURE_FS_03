"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { clearCart, getCartSnapshot, getServerCartSnapshot, parseCartSnapshot, removeFromCart, subscribeToCart, updateCartQuantity } from "./cart-storage.js";
import styles from "./cart.module.css";

export default function CartPage() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const storedItems = parseCartSnapshot(snapshot);
  const cartItems = storedItems || [];
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    let isActive = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (isActive) {
          setUser(result?.user || null);
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (isActive) setAuthChecked(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handlePlaceOrder(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setOrderError("");
    setIsOrdering(true);

    try {
      const catalogResponse = await fetch("/api/products?limit=50", { cache: "no-store" });
      const catalog = await catalogResponse.json();
      if (!catalogResponse.ok) throw new Error(catalog.error || "Unable to load products.");

      const productsBySlug = new Map(catalog.products.map((product) => [product.slug, product]));
      const syncedItems = cartItems.map((item) => {
        const product = productsBySlug.get(item.id);
        if (!product) throw new Error(`${item.name} is no longer available.`);
        return { productId: product.id, quantity: item.quantity };
      });

      const clearResponse = await fetch("/api/cart", { method: "DELETE" });
      if (!clearResponse.ok) throw new Error("Unable to prepare your cart for checkout.");

      for (const item of syncedItems) {
        const response = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to prepare your cart for checkout.");
      }

      const shippingAddress = Object.fromEntries(formData.entries());
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingAddress }),
      });
      const result = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(result.error || "Unable to place your order.");

      clearCart();
      router.push(`/payment/${result.order.id}`);
    } catch (error) {
      setOrderError(error.message || "Unable to place your order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Your selection</p>
        <h1 className={styles.title}>Shopping Cart</h1>
        <p className={styles.itemCount}>
          {storedItems ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : "Loading cart"}
        </p>
      </header>

      {!storedItems ? (
        <p className={styles.emptyMessage} role="status">Loading your cart...</p>
      ) : cartItems.length === 0 ? (
        <section className={styles.emptyCart}>
          <p className={styles.emptyMessage}>Your cart is empty.</p>
          <Link className={styles.checkoutLink} href="/collection">Browse collection</Link>
        </section>
      ) : (
        <div className={styles.layout}>
          <section className={styles.items} aria-label="Items in your cart">
            {cartItems.map((item) => (
              <article className={styles.item} key={item.id}>
                <div className={styles.imageFrame}>
                  <Image
                    alt={item.name}
                    className={styles.productImage}
                    height={160}
                    loading="lazy"
                    src={item.image}
                    unoptimized
                    width={132}
                  />
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.category}>{item.category}</p>
                  <h2 className={styles.productName}>{item.name}</h2>
                </div>
                <div className={styles.lineActions}>
                  <p className={styles.price}>${item.price * item.quantity}</p>
                  <div className={styles.quantityControls} aria-label={`Quantity for ${item.name}`}>
                    <button
                      aria-label={`Decrease ${item.name} quantity`}
                      className={styles.stepButton}
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      type="button"
                    >
                      &minus;
                    </button>
                    <span className={styles.quantity}>{item.quantity}</span>
                    <button
                      aria-label={`Increase ${item.name} quantity`}
                      className={styles.stepButton}
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className={styles.removeButton}
                    onClick={() => removeFromCart(item.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            <Link className={styles.continueLink} href="/collection">
              Continue shopping
            </Link>
          </section>

          <aside className={styles.summary} aria-labelledby="summary-title">
            <h2 className={styles.summaryTitle} id="summary-title">Order Summary</h2>
            <div className={styles.summaryLine}>
              <span>Subtotal</span>
              <span>${subtotal}</span>
            </div>
            <div className={styles.summaryLine}>
              <span>Shipping</span>
              <span className={styles.shippingNote}>Calculated at checkout</span>
            </div>
            <div className={styles.totalLine}>
              <span>Total</span>
              <span>${subtotal}</span>
            </div>
            {!authChecked ? (
              <p className={styles.authStatus} role="status">Checking sign-in status...</p>
            ) : user ? (
              <form className={styles.checkoutForm} onSubmit={handlePlaceOrder}>
                <label className={styles.addressField}>
                  Name
                  <input autoComplete="name" defaultValue={user.name} name="name" required />
                </label>
                <label className={styles.addressField}>
                  Phone
                  <input autoComplete="tel" name="phone" required />
                </label>
                <label className={styles.addressField}>
                  Address
                  <input autoComplete="address-line1" name="line1" required />
                </label>
                <div className={styles.addressRow}>
                  <label className={styles.addressField}>
                    City
                    <input autoComplete="address-level2" name="city" required />
                  </label>
                  <label className={styles.addressField}>
                    Postal code
                    <input autoComplete="postal-code" name="postalCode" required />
                  </label>
                </div>
                <label className={styles.addressField}>
                  Country
                  <input autoComplete="country-name" name="country" required />
                </label>
                {orderError && <p className={styles.orderError} role="alert">{orderError}</p>}
                <button className={styles.checkoutLink} disabled={isOrdering} type="submit">
                  {isOrdering ? "Placing order..." : "Place order"}
                </button>
              </form>
            ) : (
              <Link className={styles.checkoutLink} href="/login">
                Sign in to continue
              </Link>
            )}
            <p className={styles.summaryFootnote}>Taxes and shipping are calculated at checkout.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
