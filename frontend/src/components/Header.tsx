"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "../lib/api";

type HeaderProps = { onLogout?: () => void };
export default function Header({ onLogout }: HeaderProps) {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const name = me.data?.name;
  const email = me.data?.email;
  const avatar = me.data?.avatar;
  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-xl font-semibold">ReachInbox</h1>
      <div className="flex items-center gap-3">
        {avatar && <img src={avatar} alt={name} className="h-8 w-8 rounded-full" />}
        <div className="text-sm"><p className="font-medium">{name}</p><p className="text-gray-500">{email}</p></div>
        {onLogout && <button onClick={onLogout} className="rounded bg-gray-900 px-3 py-1 text-white">Logout</button>}
      </div>
    </header>
  );
}
