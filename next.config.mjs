/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aroha Clinic only uses /review and /client-feedback. Every other page of the template is hidden
  // by sending it to /review (temporary redirects, so they can be switched back on later).
  async redirects() {
    const hidden = [
      "/",
      "/with-map",
      "/without-map",
      "/thank-you",
      "/privacy-policy",
      "/terms-and-conditions",
      "/cancellation-and-refund-policy",
    ];
    return hidden.map((source) => ({ source, destination: "/review", permanent: false }));
  },
};

export default nextConfig;
