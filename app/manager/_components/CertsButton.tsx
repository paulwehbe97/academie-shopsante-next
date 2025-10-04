"use client";

export default function CertsButton({ email }: { email?: string | null }) {
  const href = email ? `/manager/certificates?email=${encodeURIComponent(email)}` : "#";
  const disabled = !email;

  return (
    <a
      href={href}
      onClick={(e) => disabled && e.preventDefault()}
      className={[
        "inline-flex items-center rounded-2xl px-3 py-1.5 text-sm font-semibold text-black shadow-md",
        "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal",
        disabled ? "pointer-events-none opacity-50" : "hover:opacity-90",
      ].join(" ")}
      aria-disabled={disabled}
      title={disabled ? "Courriel manquant" : "Voir les certificats de cet employé"}
    >
      Voir certificats
    </a>
  );
}
