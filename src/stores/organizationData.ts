import { supabase } from '@/lib/supabase'

// Organization types
export type Organization = {
  id: string
  title: string
}

export type OrganizationStats = {
  count: number
}

// Fetch all organizations
export async function fetchOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, title')

  if (error) throw error
  return data || []
}

// Organization stats (count)
export async function fetchOrganizationStats(): Promise<number> {
  const { count: orgCount, error } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return orgCount || 0
}
