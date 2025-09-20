import { supabase } from '@/lib/supabase'

// Fetch all organizations
export async function fetchOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, title')

  if (error) throw error
  return data || []
}

// Organization stats (count)
export async function fetchOrganizationStats() {
  const { count: orgCount, error } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return orgCount || 0
}
