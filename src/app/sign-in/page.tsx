"use client";

import { useState, useEffect } from "react";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignIn() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (!isPending && session?.user) {
            router.push("/dashboard");
        }
    }, [session, isPending, router]);

    const extractErrorMessage = (error: unknown): string => {
        if (error instanceof Error) {
            const message = error.message;
            
            // BetterAuth error messages
            if (message.includes("password")) {
                if (message.includes("short") || message.includes("minimum") || message.includes("length")) {
                    return "Password must be at least 8 characters long";
                }
                if (message.includes("weak") || message.includes("strength")) {
                    return "Password is too weak. Please use a stronger password";
                }
                if (message.includes("invalid") || message.includes("incorrect")) {
                    return "Invalid password";
                }
            }
            
            if (message.includes("email")) {
                if (message.includes("invalid") || message.includes("format")) {
                    return "Please enter a valid email address";
                }
                if (message.includes("exists") || message.includes("already")) {
                    return "An account with this email already exists";
                }
                if (message.includes("not found") || message.includes("doesn't exist")) {
                    return "No account found with this email address";
                }
            }
            
            if (message.includes("name") || message.includes("username")) {
                if (message.includes("required")) {
                    return "Name is required";
                }
            }
            
            // Return the original message if it's user-friendly, otherwise provide a generic one
            if (message.length > 0 && message.length < 200) {
                return message;
            }
        }
        
        return "An error occurred. Please try again.";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        // Client-side validation
        if (isSignUp && !name.trim()) {
            setError("Name is required");
            return;
        }
        
        if (!email.trim()) {
            setError("Email is required");
            return;
        }
        
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please enter a valid email address");
            return;
        }
        
        if (!password) {
            setError("Password is required");
            return;
        }
        
        if (isSignUp && password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }
        
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
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    // Show loading state while checking authentication
    if (isPending || session?.user) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-15vh)]">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

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
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
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
