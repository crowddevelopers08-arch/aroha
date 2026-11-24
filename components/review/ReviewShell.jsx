import { CONFIG as C } from "@/lib/siteConfig";

// Charcoal full-screen backdrop + centred cream card shared by /review and /client-feedback (colours: .review in globals.css)
export default function ReviewShell({ wide = false, children }) {
  const alt = `${C.clinic.name} — ${C.clinic.tagline}`;
  const logo = (
    <img
      src={C.clinic.logo}
      alt={alt}
      width={C.clinic.logoWidth}
      height={C.clinic.logoHeight}
      className={`h-auto max-w-full ${wide ? "w-[210px] sm:w-[250px]" : "w-[240px] sm:w-[280px]"}`}
    />
  );

  return (
    <div
      className="review flex min-h-screen flex-col items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--r-backdrop)" }}
    >
      <div
        className={`mx-auto w-full rounded-[28px] bg-[var(--r-paper)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.85)] ${
          wide ? "my-6 max-w-[560px] p-5 sm:p-8" : "max-w-[460px] px-5 py-8 sm:px-9 sm:py-10"
        }`}
      >
        <div className={`flex justify-center ${wide ? "mb-5 sm:mb-7" : ""}`}>
          {C.clinic.homeUrl ? (
            <a href={C.clinic.homeUrl} aria-label={alt} className="block">
              {logo}
            </a>
          ) : (
            logo
          )}
        </div>
        {children}
      </div>
      <p className="mt-5 text-center text-[0.75rem] text-white/60">
        © {new Date().getFullYear()} {C.clinic.name}
        {C.clinic.address ? ` · ${C.clinic.address}` : ""}
      </p>
    </div>
  );
}
