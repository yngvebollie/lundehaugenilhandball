import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Lundehaugen IL | Performance Platform",
  manifest: "/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Lundehaugen IL",statusBarStyle:"default"},
  icons:{apple:[{url:"/app-icon/180",sizes:"180x180",type:"image/png"}]},
  description: "Training, athlete management, and performance operations for elite handball teams."
};

export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#111c38"};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
