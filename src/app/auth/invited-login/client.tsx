'use client'

import React from 'react'
import { InvitedUserLoginForm } from '@/components/auth/InvitedUserLoginForm'

interface InvitedLoginClientProps {
  token?: string
  companyId?: string
  isInvite?: boolean
}

export default function InvitedLoginClient({ token, companyId, isInvite }: InvitedLoginClientProps) {
  return (
    <InvitedUserLoginForm 
      inviteToken={token} 
      companyId={companyId}
      isInvite={isInvite}
    />
  )
}
