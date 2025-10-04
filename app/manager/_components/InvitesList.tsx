'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import InviteStatusBadge from "./InviteStatusBadge";


type Invite = {
  email: string
  jti: string
  storeCode: string
  role: string
  invitedAt: string
  acceptedAt: string | null
  revokedAt: string | null
  status: 'pending' | 'accepted' | 'revoked'
  expired: boolean
}

export default function InvitesList() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/manager/invites')
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error('Erreur API')
      setInvites(data.data.invites)
    } catch (err) {
      toast.error("Erreur lors du chargement des invitations")
      setInvites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  // 🔁 Renvoyer une invitation
  const resend = async (jti: string) => {
    try {
      const res = await fetch('/api/invites/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti }),
      })

      if (res.ok) {
        toast.success("Invitation renvoyée avec succès")
        fetchInvites()
      } else {
        toast.error("Erreur lors du renvoi")
      }
    } catch (error) {
      console.error("Erreur JS dans resend:", error)
      toast.error("Erreur lors du renvoi de l’invitation")
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>
  if (!invites || invites.length === 0)
    return <p className="text-sm text-gray-500">Aucune invitation trouvée.</p>

  return (
    <div className="space-y-2">
      {invites.map(inv => (
        <div
          key={inv.jti}
          className="flex items-center justify-between border rounded-xl px-3 py-2 hover:shadow-sm transition-all"
        >
          <div className="text-sm">
            <b>{inv.email}</b> — {inv.storeCode}
          </div>

          <div className="flex items-center gap-3">
            <InviteStatusBadge status={inv.status} createdAt={inv.invitedAt} />

            {inv.status === 'pending' && !inv.expired && (
              <button
                onClick={() => resend(inv.jti)}
                className="text-xs text-blue-700 hover:underline"
              >
                Renvoyer
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
