import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { BrowserWarning } from "@/components/browser-warning";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocalCut - Your Local Media Converter / Editor",
  description:
    "LocalCut is a free and open-source web application that allows you to convert and edit videos and audios directly in your browser without uploading them to any server. It leverages the power of WebCodecs API to provide fast and efficient video processing on the client side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head> */}
      <body className={`${archivo.variable} antialiased`}>
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <BrowserWarning />
          <Header />
          {children}
          {/* Footer */}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
