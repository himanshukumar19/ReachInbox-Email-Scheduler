"use client";
import { useEffect } from "react";

export default function Callback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, "", "/");
      window.location.replace("/");
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm text-muted">Signing you in…</p>
      </div>
    </div>
  );
}
