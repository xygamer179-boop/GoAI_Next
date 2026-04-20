// Set BACKEND_URL in Vercel environment variables to your Render backend URL
// e.g. BACKEND_URL=https://goai-backend.onrender.com
const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};