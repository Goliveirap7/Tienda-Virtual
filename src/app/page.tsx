import { createClient } from '@/utils/supabase/server'
import CatalogClient from './CatalogClient'

// Ensures the catalog is dynamically rendered from Supabase on every request
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  // Fetch all products
  const { data: products, error } = await supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <CatalogClient initialProducts={products || []} />
  )
}
