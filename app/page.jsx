import { redirect } from "next/navigation";

// No landing page for Aroha Clinic — the root URL goes straight to the review page.
// (next.config.mjs also redirects "/" so this only runs if that redirect is removed.)
export default function Page() {
  redirect("/review");
}
