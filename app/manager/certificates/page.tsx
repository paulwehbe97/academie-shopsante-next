// app/manager/certificates/page.tsx (server component)
import { Suspense } from "react";
import CertificatesClient from "./CertificatesClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Chargement…</div>}>
      <CertificatesClient />
    </Suspense>
  );
}
