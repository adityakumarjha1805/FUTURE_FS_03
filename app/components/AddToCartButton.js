"use client";

import { useState } from "react";
import { addToCart } from "../cart/cart-storage.js";

export default function AddToCartButton({ product }) {
    const [added, setAdded] = useState(false);

    function handleAdd() {
        addToCart(product);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1000);
    }

    return (
        <button className="cart-button" onClick={handleAdd} type="button">
            {added ? "Added" : "Add to Cart"}
        </button>
    );
}