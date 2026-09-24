type HeaderProps = { name?: string; email?: string; avatar?: string; onLogout?: () => void };
export default function Header({ name, email, avatar, onLogout }: HeaderProps) {
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
