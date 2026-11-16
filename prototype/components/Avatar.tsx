import { getUser } from "@/lib/data";

export default function Avatar({ handle, size = 36 }: { handle: string; size?: number }) {
  const u = getUser(handle);
  return (
    <span
      className="avatar"
      title={u ? `${u.displayName} (@${u.handle})` : handle}
      style={{ width: size, height: size, fontSize: size * 0.55, background: u?.color ?? "#94a3b8" }}
    >
      {u?.emoji ?? "?"}
    </span>
  );
}
