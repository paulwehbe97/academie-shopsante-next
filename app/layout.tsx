// app/layout.tsx
import "../styles/globals.css";
import Providers from "./providers";
import TopBar from "../components/TopBar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          {/* TopBar global, dispo partout et sous SessionProvider */}
          <TopBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
