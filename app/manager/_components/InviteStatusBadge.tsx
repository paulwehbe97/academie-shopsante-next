// app/manager/_components/InviteStatusBadge.tsx
'use client';

type Props = {
  status: 'pending' | 'accepted' | 'revoked';
  createdAt?: string; // ← ajout ici pour corriger ton erreur
};

export default function InviteStatusBadge({ status, createdAt }: Props) {
  let color = '';
  let label = '';

  switch (status) {
    case 'pending':
      color = 'bg-amber-100 text-amber-700';
      label = 'En attente';
      break;
    case 'accepted':
      color = 'bg-green-100 text-green-700';
      label = 'Acceptée';
      break;
    case 'revoked':
      color = 'bg-red-100 text-red-700';
      label = 'Révoquée';
      break;
    default:
      color = 'bg-gray-100 text-gray-600';
      label = 'Inconnu';
  }

  // Formatage optionnel de la date si fournie
  const date = createdAt ? new Date(createdAt).toLocaleDateString('fr-CA') : null;

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
      {label}
      {date && <span className="ml-1 text-gray-500">({date})</span>}
    </span>
  );
}
