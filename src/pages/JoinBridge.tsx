import { useEffect, useState } from "react";

export default function JoinBridge() {
    const [status, setStatus] = useState("Launching Rasvia...");
    const [schemeUrl, setSchemeUrl] = useState<string>("");

    useEffect(() => {
        // 1. Get Session ID from URL
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("id");

        if (!sessionId) {
            setStatus("Error: No Party ID found.");
            return;
        }

        // 2. Determine the correct link based on Environment
        const isProduction = import.meta.env.PROD;

        let appScheme;
        if (isProduction) {
            // PRODUCTION (App Store / Real World)
            appScheme = `rasvia://join/${sessionId}`;
        } else {
            // DEVELOPMENT (Testing on your phone via Expo Go)
            // Replace with the specific LAN IP that Expo Go displays when running your mobile app
            appScheme = `exp://172.20.10.5:8081/--/join/${sessionId}`;
        }

        setSchemeUrl(appScheme);

        // 3. Attempt Redirect
        window.location.href = appScheme;

        // 4. Fallback
        setTimeout(() => {
            setStatus("App didn't open? Click below.");
        }, 2000);

    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#09090b] text-zinc-200 p-4 text-center">
            <h1 className="text-xl font-bold tracking-tight mb-6">{status}</h1>

            {/* Manual Trigger for Testing */}
            {schemeUrl && (
                <a
                    href={schemeUrl}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-full font-semibold transition-colors shadow-lg shadow-amber-500/20"
                >
                    Open App Manually
                </a>
            )}
        </div>
    );
}
