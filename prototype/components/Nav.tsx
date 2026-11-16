"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ME } from "@/lib/data";
import Avatar from "./Avatar";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/browse", label: "Browse" },
  { href: "/create", label: "Create" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <Link href="/" className="logo">
        <span className="logo-grid" aria-hidden>
          {[0, 1, 0, 0].map((b, i) => (
            <i key={i} className={b ? "blk" : ""} />
          ))}
        </span>
        skymini
      </Link>
      <nav>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
      <Link href={`/profile/${ME.handle}`} className="nav-me" title="Signed in with Bluesky (mock)">
        <Avatar handle={ME.handle} size={32} />
        <span className="hide-sm">@{ME.handle}</span>
      </Link>
    </header>
  );
}
