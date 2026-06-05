"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = searchParams.get("from") ?? "/desk";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error || "Invalid username or password.");
      return;
    }

    router.push(from);
  }

  return (
    <div style={{ width: "100%", maxWidth: 420, border: "1px solid #ddd", borderRadius: 12, padding: 28, boxShadow: "0 18px 50px rgba(0,0,0,.08)" }}>
      <h1 style={{ margin: 0, marginBottom: 14, fontSize: 28 }}>Staff login</h1>
      <p style={{ marginTop: 0, marginBottom: 24, color: "#555" }}>
        Enter your admin username and password to access the Newsletter Factory dashboard.
      </p>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15 }} />
        </label>
        <label style={{ display: "block", marginBottom: 20 }}>
          <span style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15 }} />
        </label>
        {error && <div style={{ marginBottom: 18, color: "#a00", fontSize: 14 }}>{error}</div>}
        <button type="submit" disabled={busy}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "none", background: "#0021A5", color: "#fff", fontSize: 15, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Suspense fallback={<div>Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
