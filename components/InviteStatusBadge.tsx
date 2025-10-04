// app/manager/_components/InviteStatusBadge.tsx
'use client'

import { ClockIcon, BanIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  status: 'pending' | 'revoked',
  createdAt: string
}

export default function InviteStatusBadge({ status, createdAt }: Props) {
  const created = new Date(createdAt)
  const now = new Date()
  const expired = now.getTime() - created.getTime() > 24 * 60 * 60 * 1000

  let text = ''
  let color = ''
  let icon = null

  if (status === 'revoked') {
    text = 'Révoquée'
    color = 'bg-red-100 text-red-700'
    icon = <BanIcon className="w-3.5 h-3.5 mr-1" />
  } else if (expired) {
    text = 'Expirée'
    color = 'bg-gray-200 text-gray-600'
    icon = <ClockIcon className="w-3.5 h-3.5 mr-1" />
  } else {
    text = 'En attente'
    color = 'bg-amber-100 text-amber-700'
    icon = <ClockIcon className="w-3.5 h-3.5 mr-1" />
  }

  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", color)}
      title={`Envoyée le ${created.toLocaleString()} — ${
        status === 'revoked' ? 'révoquée' : expired ? 'expirée' : 'valide'
      }`}
    >
      {icon}
      {text}
    </span>
  )
}
