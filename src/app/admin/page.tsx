import { createClient } from '@/utils/supabase/server'
import InventoryTable from './InventoryTable'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  // Fetch initial products
  const { data: products, error } = await supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inventario de Productos</h1>
      <InventoryTable initialProducts={products || []} />
    </div>
  )
}
