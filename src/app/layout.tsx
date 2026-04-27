import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Outfit, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Continuum",
  description:
    "A timeline-based workstream organizer. Organize personal and professional workflows using streams and immutable card history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${outfit.variable} ${dmSans.variable}`}
        suppressHydrationWarning
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("continuum:theme");if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`,
            }}
          />
        </head>
        <body className="antialiased">
          {children}
          <Toaster position="bottom-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
