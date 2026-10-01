"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./AuthForm.module.css";

export default function AuthForm({ mode }) {
    const isLogin = mode === "login";
    const router = useRouter();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const body = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body),
            });
            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Unable to sign in. Please try again.");
                return;
            }

            router.replace("/collection");
            router.refresh();
        } catch {
            setError("Unable to reach the server. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className={isLogin ? "login-hero" : "signin-hero"}>
            <h1 className={isLogin ? "login-heading" : "signin-heading"}>
                {isLogin ? "Login───" : "Sign Up───"}
            </h1>
            <form className={isLogin ? "login-input" : "signin-input"} onSubmit={handleSubmit}>
                {!isLogin && (
                    <input
                        aria-label="Name"
                        autoComplete="name"
                        className="input"
                        name="name"
                        placeholder="Name"
                        required
                        type="text"
                    />
                )}
                <input
                    aria-label="Email"
                    autoComplete="email"
                    className="input"
                    name="email"
                    placeholder="Email"
                    required
                    type="email"
                />
                <input
                    aria-label="Password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="input"
                    name="password"
                    placeholder="Password"
                    required
                    type="password"
                    minLength={isLogin ? undefined : 8}
                />
                {isLogin ? (
                    <div className="signin">
                        <Link className="signin-link" href="/signin">Create Account</Link>
                    </div>
                ) : (
                    <div className="login">
                        <Link className="login-link" href="/login">Login Here</Link>
                    </div>
                )}
                {error && <p className={styles.error} role="alert">{error}</p>}
                <div className={isLogin ? "login-button" : "signin-button"}>
                    <button
                        className={isLogin ? "login2-button" : "signup-button"}
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
                    </button>
                </div>
            </form>
        </main>
    );
}