import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
        // If successful, AuthContext detects the session automatically
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-white/10 glass-card p-10 shadow-2xl">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Rasvia Partner</h2>
                    <p className="mt-2 text-sm text-zinc-400">Sign in to manage your restaurant</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="email"
                                required
                                className="relative block w-full rounded-md border border-white/10 bg-zinc-900/50 py-3 px-4 text-white placeholder:text-zinc-500 focus:z-10 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:text-sm sm:leading-6 transition-all"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="relative block w-full rounded-md border border-white/10 bg-zinc-900/50 py-3 px-4 text-white placeholder:text-zinc-500 focus:z-10 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:text-sm sm:leading-6 transition-all"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-400 text-sm text-center font-medium">{error}</div>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md bg-amber-500 py-3 px-4 text-sm font-semibold text-zinc-900 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-50 transition-all shadow-md"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
