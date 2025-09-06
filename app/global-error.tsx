// app/global-error.tsx
"use client"

export default function GlobalError({
    error,
    reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html>
        <body style={{ padding: 16 }}>
        <h2>Globaler Fehler</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
        <button onClick={() => reset()}>Erneut versuchen</button>
        </body>
        </html>
    )
}
