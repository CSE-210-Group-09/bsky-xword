import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AppStateProvider } from "@/components/AppState";
import Nav from "@/components/Nav";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "700", "800"] });

export const metadata: Metadata = {
  title: "skymini: daily mini crosswords on Bluesky",
  description: "Solve a daily 5x5 mini and compare times with people you follow on Bluesky.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <AppStateProvider>
          <Nav />
          <main className="page">{children}</main>
          <footer className="footer muted small">
            UI prototype · all users, follows, and results are mock data · built for AT Protocol
          </footer>
        </AppStateProvider>
      </body>
    </html>
  );
}
