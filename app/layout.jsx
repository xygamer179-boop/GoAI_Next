import "./globals.css";

export const metadata = {
  title: "GoAi v7",
  description: "Multi-AI Collaboration System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme init — runs before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('goai_theme');
                if (t === 'light') document.documentElement.setAttribute('data-theme','light');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
