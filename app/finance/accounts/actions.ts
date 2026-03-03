'use server'

import { createClient } from '@/lib/supabase/server'

type AccountInput = {
  id?: string
  name: string
  code: string
  opening_balance: number
  is_active: boolean
}

export async function listCashAccounts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cash_accounts')
    .select('id, name, code, opening_balance, is_active, created_at')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return data ?? []
}

export async function upsertCashAccount(input: AccountInput) {
  const supabase = await createClient()

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
    name: input.name.trim(),
    code: input.code.trim().toLowerCase(),
    opening_balance: input.opening_balance,
    is_active: input.is_active,
    created_by: userRes.user.id,
  }

  if (input.id) payload.id = input.id

  const { error } = await supabase
    .from('cash_accounts')
    .upsert(payload)

  if (error) throw new Error(error.message)
}

export async function deleteCashAccount(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cash_accounts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}