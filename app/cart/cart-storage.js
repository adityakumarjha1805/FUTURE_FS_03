const CART_STORAGE_KEY = "forever-cart";
const CART_UPDATED_EVENT = "forever-cart-updated";

export function readCart() {
    if (typeof window === "undefined") return [];

    try {
        const savedCart = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
        return Array.isArray(savedCart)
            ? savedCart.filter((item) => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0)
            : [];
    } catch {
        return [];
    }
}

export function subscribeToCart(onStoreChange) {
    window.addEventListener(CART_UPDATED_EVENT, onStoreChange);
    window.addEventListener("storage", onStoreChange);

    return () => {
        window.removeEventListener(CART_UPDATED_EVENT, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
    };
}

export function getCartSnapshot() {
    return window.localStorage.getItem(CART_STORAGE_KEY) || "[]";
}

export function getServerCartSnapshot() {
    return null;
}

export function parseCartSnapshot(snapshot) {
    if (snapshot === null) return null;

    try {
        const items = JSON.parse(snapshot);
        return Array.isArray(items)
            ? items.filter((item) => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0)
            : [];
    } catch {
        return [];
    }
}

function saveCart(items) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addToCart(product) {
    const items = readCart();
    const existingItem = items.find((item) => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        items.push({ ...product, quantity: 1 });
    }

    saveCart(items);
}

export function updateCartQuantity(productId, quantity) {
    const items = readCart();
    const updatedItems = quantity > 0
        ? items.map((item) => item.id === productId ? { ...item, quantity } : item)
        : items.filter((item) => item.id !== productId);

    saveCart(updatedItems);
}

export function removeFromCart(productId) {
    saveCart(readCart().filter((item) => item.id !== productId));
}

export function clearCart() {
    saveCart([]);
}

export function cartUpdatedEventName() {
    return CART_UPDATED_EVENT;
}