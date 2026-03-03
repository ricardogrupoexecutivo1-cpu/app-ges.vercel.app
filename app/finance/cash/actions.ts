'use server'

import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'ops' | 'operational' | 'finance' | 'member' | string | null | undefined

export type BankAccountRow = {
  id: string
  name: string
  kind: string | null
  opening_balance: number | null
  active: boolean | null
}

export type CashTxRow = {
  id: string
  bank_account_id: string
  tx_type: 'income' | 'expense'
  amount: number
  description: string | null
  occurred_at: string
  created_at?: string
  deleted_at?: string | null
  deleted_by?: string | null
}

export type CashFilters = {
  bank_account_id?: string
  tx_type?: 'income' | 'expense' | ''
  date_from?: string // YYYY-MM-DD
  date_to?: string // YYYY-MM-DD
  q?: string
  include_deleted?: boolean // só admin/finance deve usar
}

async function getCompanyIdOrThrow(supabase: any) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) throw new Error('Usuário não autenticado')

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userRes.user.id)
    .single()

  if (profileErr) throw new Error(profileErr.message)
  if (!profile?.company_id) throw new Error('company_id não encontrado no profile.')

  return { company_id: profile.company_id as string, user_id: userRes.user.id as string, role: profile.role as Role }
}

// ✅ Isso resolve o erro “Export getMyRole doesn't exist”
export async function getMyRole(): Promise<Role> {
  const supabase = await createClient()
  const { role } = await getCompanyIdOrThrow(supabase)
  return role ?? null
}

export async function listBankAccounts(): Promise<BankAccountRow[]> {
  const supabase = await createClient()
  const { company_id } = await getCompanyIdOrThrow(supabase)

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('id, name, kind, opening_balance, active')
    .eq('company_id', company_id)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as BankAccountRow[]
}

export async function listCashTransactions(filters: CashFilters = {}): Promise<CashTxRow[]> {
  const supabase = await createClient()
  const { company_id, role } = await getCompanyIdOrThrow(supabase)

  let q = supabase
    .from('cash_transactions')
    .select('id, bank_account_id, tx_type, amount, description, occurred_at, created_at, deleted_at, deleted_by')
    .eq('company_id', company_id)

  // Só admin/finance podem ver deletados (e mesmo assim, só se pedirem)
  const canSeeDeleted = role === 'admin' || role === 'finance'
  if (!filters.include_deleted || !canSeeDeleted) {
    q = q.is('deleted_at', null)
  }

  if (filters.bank_account_id) q = q.eq('bank_account_id', filters.bank_account_id)
  if (filters.tx_type) q = q.eq('tx_type', filters.tx_type)

  if (filters.date_from) q = q.gte('occurred_at', new Date(filters.date_from).toISOString())
  if (filters.date_to) {
    const end = new Date(filters.date_to)
    end.setHours(23, 59, 59, 999)
    q = q.lte('occurred_at', end.toISOString())
  }

  if (filters.q && filters.q.trim()) {
    q = q.ilike('description', `%${filters.q.trim()}%`)
  }

  const { data, error } = await q.order('occurred_at', { ascending: false }).limit(200)

  if (error) throw new Error(error.message)
  return (data ?? []) as CashTxRow[]
}

export async function createCashTransaction(input: {
  bank_account_id: string
  tx_type: 'income' | 'expense'
  amount: number
  occurred_at: string // YYYY-MM-DD
  description?: string
}) {
  const supabase = await createClient()
  const { company_id, user_id } = await getCompanyIdOrThrow(supabase)

  if (!input.bank_account_id) throw new Error('Selecione uma conta.')
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Valor inválido.')
  if (!input.occurred_at) throw new Error('Data inválida.')

  const payload: any = {
    company_id,
    bank_account_id: input.bank_account_id,
    tx_type: input.tx_type,
    amount: Number(input.amount),
    description: input.description?.trim() ? input.description.trim() : null,
    occurred_at: new Date(input.occurred_at).toISOString(),
    created_by: user_id,
    deleted_at: null,
    deleted_by: null,
  }

  const { error } = await supabase.from('cash_transactions').insert(payload)
  if (error) throw new Error(error.message)
}

// ✅ Soft delete (não apaga), só marca deleted_at/deleted_by
export async function softDeleteCashTransaction(id: string) {
  const supabase = await createClient()
  const { company_id, user_id } = await getCompanyIdOrThrow(supabase)

  const { error } = await supabase
    .from('cash_transactions')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user_id })
    .eq('company_id', company_id)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ✅ Restaurar (volta a aparecer)
export async function restoreCashTransaction(id: string) {
  const supabase = await createClient()
  const { company_id } = await getCompanyIdOrThrow(supabase)

  const { error } = await supabase
    .from('cash_transactions')
    .update({ deleted_at: null, deleted_by: null })
    .eq('company_id', company_id)
    .eq('id', id)

  if (error) throw new Error(error.message)
}