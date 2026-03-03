'use server'

import { createClient } from '@/lib/supabase/server'

export async function getCashBalances() {
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
    .from('v_cash_account_balances')
    .select(
      'bank_account_id, account_code, account_name, opening_balance, income_total, expense_total, current_balance'
    )
    .eq('company_id', profile.company_id)
    .order('account_name', { ascending: true })

  if (error) throw new Error(error.message)

  return data ?? []
}