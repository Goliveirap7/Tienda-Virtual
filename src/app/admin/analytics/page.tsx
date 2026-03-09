import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Busqueda = {
  termino: string
  cantidad: number
  ultima_busqueda: string
  resultados: number
}

export default async function AnalyticsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch top searches ordered by count
  const { data: busquedas } = await supabase
    .from('busquedas')
    .select('termino, cantidad, ultima_busqueda, resultados')
    .order('cantidad', { ascending: false })
    .limit(50)

  const rows = (busquedas ?? []) as Busqueda[]
  const total = rows.reduce((sum: number, b: Busqueda) => sum + b.cantidad, 0)
  const sinResultados = rows.filter((b: Busqueda) => b.resultados === 0)
  const conResultados = rows.filter((b: Busqueda) => b.resultados > 0)
  const top10 = rows.slice(0, 10)
  const maxCantidad = top10[0]?.cantidad ?? 1

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analíticas de búsquedas</h1>
        <p className="text-gray-500 mt-1">Lo que los clientes buscan en la tienda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total búsquedas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Términos únicos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Con resultados</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{conResultados.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-l-4 border-l-red-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sin resultados ⚠️</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{sinResultados.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">Productos a considerar importar</p>
        </div>
      </div>

      {/* Bar chart — top 10 */}
      {top10.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-5">Top 10 más buscados</h2>
          <div className="space-y-3">
            {top10.map((b) => (
              <div key={b.termino} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 font-medium w-36 shrink-0 truncate capitalize">{b.termino}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all ${b.resultados === 0 ? 'bg-red-400' : 'bg-black'}`}
                    style={{ width: `${Math.max(8, (b.cantidad / maxCantidad) * 100)}%` }}
                  >
                    {b.cantidad}
                  </div>
                </div>
                {b.resultados === 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full shrink-0">Sin stock</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Todas las búsquedas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">#</th>
                <th className="text-left px-6 py-3">Término</th>
                <th className="text-center px-6 py-3">Búsquedas</th>
                <th className="text-center px-6 py-3">Resultados</th>
                <th className="text-left px-6 py-3">Última búsqueda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length > 0 ? rows.map((b: Busqueda, i: number) => (
                <tr key={b.termino} className={`hover:bg-gray-50 transition-colors ${b.resultados === 0 ? 'bg-red-50/40' : ''}`}>
                  <td className="px-6 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-6 py-3 font-semibold text-gray-800 capitalize">{b.termino}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="bg-black text-white text-xs font-bold px-2.5 py-1 rounded-full">{b.cantidad}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {b.resultados === 0
                      ? <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">0 — Sin stock</span>
                      : <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{b.resultados}</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">
                    {new Date(b.ultima_busqueda).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Aún no hay búsquedas registradas. Los datos aparecerán cuando los clientes usen el buscador.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* No-result section */}
      {sinResultados.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-bold text-red-700 mb-1">⚠️ Productos que los clientes buscan pero no están en stock</h2>
          <p className="text-sm text-gray-500 mb-4">Considera importar estos productos — hay demanda real.</p>
          <div className="flex flex-wrap gap-2">
            {sinResultados.map(b => (
              <span key={b.termino} className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-3 py-1.5 rounded-full capitalize">
                {b.termino} <span className="text-red-400 font-normal">×{b.cantidad}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
