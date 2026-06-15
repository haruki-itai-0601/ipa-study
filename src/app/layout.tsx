import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

// Google Analytics 4 測定ID（公開値）
const GA_ID = "G-J2L35PS892";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "過去問演習道場";
const SITE_DESC =
  "ITパスポート・基本情報技術者・応用情報技術者試験の過去問を、図つき・独自解説つきで演習。スキマ時間に効率よく対策できる無料の過去問演習道場。応用情報の午後問題はAI採点にも対応。";

export const metadata: Metadata = {
  metadataBase: new URL("https://kakomon-dojo.com"),
  title: {
    default: "ITパスポート・基本情報・応用情報 過去問演習道場",
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "ITパスポート", "基本情報技術者", "応用情報技術者", "過去問", "過去問道場",
    "IPA", "情報処理技術者試験", "午後問題", "AI採点", "無料",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    url: "https://kakomon-dojo.com",
    title: "ITパスポート・基本情報・応用情報 過去問演習道場",
    description: SITE_DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート・基本情報・応用情報 過去問演習道場",
    description: SITE_DESC,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 構造化データ（検索エンジン向け：サイト情報＋サイト内検索） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              alternateName: "ITパスポート・基本情報・応用情報 過去問演習道場",
              url: "https://kakomon-dojo.com",
              description: SITE_DESC,
              inLanguage: "ja",
            }),
          }}
        />
        <AuthProvider>
          {children}
          <SiteFooter />
        </AuthProvider>
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
