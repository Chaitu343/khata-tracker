// apps/frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext"; // Adjust path if needed
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/ui/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DueMate",
  description: "Your personal khata book",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-full">
            {" "}
            {/* Ensure full height */}
            <Navbar /> {/* Persistent Navbar */}
            <main>
              {/* Children (your pages) will be rendered here */}
              {children}
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
