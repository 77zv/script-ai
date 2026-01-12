"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignIn() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignUp) {
                await signUp.email({
                    email,
                    password,
                    name,
                });
            } else {
                await signIn.email({
                    email,
                    password,
                });
            }
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full py-12 sm:py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-8 lg:gap-16">
                {/* Form Section */}
                <div className="w-full max-w-md lg:shrink-0">
                    <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl mb-8">
                        {isSignUp ? "Sign Up" : "Sign In"}
                    </h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium mb-2">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={isSignUp}
                                    className="w-full p-3 border border-gray-300 rounded-full text-black"
                                    placeholder="Your name"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-full text-black"
                                placeholder="your@email.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-full text-black"
                                placeholder="••••••••"
                            />
                        </div>
                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-black text-white rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-gray-500 hover:text-black transition-colors"
                        >
                            {isSignUp
                                ? "Already have an account? Sign In"
                                : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </div>
                
                {/* Image Section */}
                <div className="w-full lg:flex-1 flex items-center justify-center">
                    <Image
                        src="/bob-halftone-2.png"
                        alt="Bob halftone"
                        width={1200}
                        height={1200}
                        className="w-full max-w-xl lg:max-w-2xl h-auto rounded-4xl"
                        priority
                    />
                </div>
            </div>
        </div>
    );
}
