"use client";
import { useEffect } from "react";
export default function Callback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      localStorage.setItem("token", t);
      window.history.replaceState({}, "", "/");
      window.location.replace("/");
    }
  }, []);
  return <p className="p-8">Signing you in...</p>;
}
