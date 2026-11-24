/* =====================================================================
   CONFIG — Aroha Clinic review funnel (/review → Google or /client-feedback)
   Brand details taken from the Aroha logo ("AROHA — Skin | Hair | Wellness Clinic").
   Colours live in app/globals.css (@theme and .review).
   No clinic phone number is shown anywhere on this site (by request).
   ===================================================================== */
export const CONFIG = {
  meta: {
    title: "Share Your Experience | Aroha Clinic",
    description: "Tell us about your experience with Aroha — Skin, Hair & Wellness Clinic.",
  },
  clinic: {
    name: "Aroha Clinic",
    tagline: "Skin | Hair | Wellness Clinic",
    logo: "/aroha-logo.png", // transparent PNG made from the black-background logo in /public
    logoWidth: 1147,
    logoHeight: 386,
    // Fill these in when confirmed; empty values are simply left out of the page footer and TeleCRM.
    address: "",
    city: "",
    state: "",
    // Google Maps listing of the same Business Profile (place ID behind the review link below).
    // Used as the fallback for 4–5 star ratings if googleReviewUrl is emptied.
    mapLink: "https://www.google.com/maps/place/?q=place_id:ChIJ4fKCAT-DBjsRHt5wrQz2Brk",
    homeUrl: "", // where the logo on the review pages goes; empty = logo is not a link
  },

  // /review: ratings >= positiveMin open Google reviews; lower ones go to /client-feedback → "Aroha Feedback" sheet tab
  review: {
    // Google Business Profile "Ask for reviews" link. If emptied, happy customers go to clinic.mapLink instead.
    googleReviewUrl: "https://g.page/r/CR7ecK0M9ga5EBM/review",
    positiveMin: 4,
  },
};
