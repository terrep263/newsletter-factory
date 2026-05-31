"use client";
import { usePathname } from "next/navigation";

const today = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  // The public landing page renders with no admin chrome.
  if (pathname === "/") return <>{children}</>;

  const nav = [
    ["/desk", "Desk"],
    ["/brands", "Brands"],
    ["/inbox", "Content Inbox"],
    ["/issues", "Issues"],
    ["/sources", "Sources"],
  ];
  return (
    <>
      <header className="masthead">
        <h1>The Newsletter Factory</h1>
        <span className="dateline">{today()} · Central Florida Bureau</span>
      </header>
      <nav className="sections">
        {nav.map(([href, label]) => (
          <a key={href} href={href} className={pathname === href ? "active" : ""}>{label}</a>
        ))}
      </nav>
      {children}
      <footer>Common Ground Press · ATLV Solutions · One account, every brand</footer>
    </>
  );
}
