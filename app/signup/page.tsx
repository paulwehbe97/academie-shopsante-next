// app/signup/page.tsx (server component)
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Chargement…</div>}>
      <SignupClient />
    </Suspense>
  );
}
