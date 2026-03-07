import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function EditarImagenesPage() {
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from('productos')
    .select('*')
    .order('orden_prioridad', { ascending: false })
    .order('nombre', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500 font-medium">Error cargando productos: {error.message}</div>
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Imágenes</h1>
        <p className="text-gray-500 mt-2">Arrastra y suelta imágenes entre productos para intercambiarlas, o sube una nueva imagen para reemplazo directo.</p>
      </div>
      
      <EditorClient initialProducts={products || []} />
    </div>
  )
}
