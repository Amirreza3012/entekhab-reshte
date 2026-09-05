import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const vazirmatn = localFont({
  src: "../fonts/Vazirmatn-Variable.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "سامانه انتخاب رشته | باورنو",
    template: "%s | باورنو",
  },
  description: "مدیریت انتخاب رشته دانش‌آموزان",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full w-full`}>
      <body className="min-h-full w-full max-w-full overflow-x-hidden antialiased text-slate-800">
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
