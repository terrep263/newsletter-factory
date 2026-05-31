import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter Factory",
  description: "Multi-brand newsletter control panel — powered by Letterman",
};

const today = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="masthead">
          <h1>The Newsletter Factory</h1>
          <span className="dateline">{today()} · Central Florida Bureau</span>
        </header>
        <nav className="sections">
          <a href="/" className="active">Desk</a>
          <a href="/brands">Brands</a>
          <a href="/inbox">Content Inbox</a>
          <a href="/issues">Issues</a>
          <a href="/sources">Sources</a>
        </nav>
        {children}
        <footer>Common Ground Press · ATLV Solutions · One account, every brand</footer>
      </body>
    </html>
  );
}
