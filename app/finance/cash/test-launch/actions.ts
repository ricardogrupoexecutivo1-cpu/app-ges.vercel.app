'use server'

import { createClient } from '@/lib/supabase/server'

type LaunchInput = {
  bank_account_id: string
  tx_type: 'income' | 'expense'
  amount: number
  description: string
  occurred_at: string // YYYY-MM-DD
}

export async function listBankAccountsForSelect() {
  const supabase = await createClient()

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) throw new Error('Usuário não autenticado')

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userRes.user.id)
    .single()

  if (profileErr) throw new Error(profileErr.message)

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('id, name, kind')
    .eq('company_id', profile.company_id)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCashTransaction(input: LaunchInput) {
  const supabase = await createClient()

  if (!input.bank_account_id || input.bank_account_id.trim().length < 10) {
    throw new Error('bank_account_id inválido/vazio.')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('amount inválido.')
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) throw new Error('Usuário não autenticado')

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userRes.user.id)
    .single()

  if (profileErr) throw new Error(profileErr.message)

  const payload: any = {
    company_id: profile.company_id,
    bank_account_id: input.bank_account_id,
    tx_type: input.tx_type,
    amount: input.amount,
    description: input.description?.trim() || null,
    occurred_at: new Date(input.occurred_at).toISOString(),
    created_by: userRes.user.id,
  }

  const { error } = await supabase.from('cash_transactions').insert(payload)
  if (error) throw new Error(error.message)
}