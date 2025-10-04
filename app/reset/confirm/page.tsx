import ResetConfirmClient from "./ResetConfirmClient";

// Empêche tout rendu statique / cache à la build
export const dynamic = "force-dynamic";
export const revalidate = 0;           // évite l'erreur de valeur invalide

export default function Page() {
  return <ResetConfirmClient />;
}