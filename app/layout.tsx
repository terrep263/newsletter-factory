import "./globals.css";
import type { Metadata } from "next";
import Chrome from "./chrome";

export const metadata: Metadata = {
  title: "The Newsletter Factory — A Common Ground Press project",
  description:
    "Hyperlocal newsletters that give communities the real news of where they live — plainly, reliably, without the noise.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
