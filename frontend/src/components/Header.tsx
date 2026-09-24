"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "../lib/api";

type HeaderProps = { onLogout: () => void };

function UserAvatar({ src, name }: { src: string; name: string }) {
  return (
    <img
      src={src}
      alt={name}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
    />
  );
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
      {initials}
    </div>
  );
}

export default function Header({ onLogout }: HeaderProps) {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight text-primary">ReachInbox</span>
        <span className="hidden text-border sm:inline">·</span>
        <span className="hidden text-sm text-muted sm:inline">Email Scheduler</span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <UserAvatar src={user.avatar} name={user.name} />
            ) : (
              <AvatarFallback name={user.name} />
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-primary">{user.name}</p>
              <p className="text-2xs leading-tight text-muted">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="focus-ring rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary transition-colors hover:bg-page"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
