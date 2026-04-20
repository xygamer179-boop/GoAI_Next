import "./globals.css";

export const metadata = {
  title: "GoAI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
      </link>
      </head>
      <body>
        <div id="root">{children}</div> {/* 🔥 IMPORTANT */}
      </body>
    </html>
  );
}