import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { CONFIG as C } from "@/lib/siteConfig";
import "./globals.css";

// Plus Jakarta Sans for text, Bricolage Grotesque for headings
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

// Aroha's own Google Tag Manager container, e.g. "GTM-XXXXXXX". Empty = no GTM is loaded.
const GTM_ID = "";

export const metadata = {
  title: C.meta.title,
  description: C.meta.description,
  applicationName: C.clinic.name,
  robots: { index: false, follow: false },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#1A1412" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${bricolage.variable}`}>
      <head>
        {GTM_ID ? (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        ) : null}
      </head>
      <body className="font-body text-ink bg-white leading-[1.6]">
        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {children}
      </body>
    </html>
  );
}
