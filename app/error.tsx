// app/error.tsx
"use client"

export default function Error({
    error,
    reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div style={{ padding: 16 }}>
        <h2>Fehler</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
        <button onClick={() => reset()}>Erneut versuchen</button>
        </div>
    )
}
