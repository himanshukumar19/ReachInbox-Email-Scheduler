"use client";
import { useEffect } from "react";
export default function Callback() {
  useEffect(()=>{ const t=new URLSearchParams(window.location.search).get("token"); if(t){localStorage.setItem("token",t); window.location.href="/";}},[]);
  return <p className="p-8">Signing you in...</p>;
}
