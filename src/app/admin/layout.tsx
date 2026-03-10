import Link from 'next/link'
import { Package, Image as ImageIcon, BarChart2, Store } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-black">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
            <Link href="/admin">
              <img 
                src="https://res.cloudinary.com/dvaeqzm95/image/upload/v1741327122/productos_tienda/logo_fyg.png" 
                alt="F&G Admin Logo" 
                className="h-10 w-auto object-contain hover:scale-105 transition-transform" 
              />
            </Link>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            <Link href="/admin" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 font-medium rounded-md transition-colors">
              <Package className="w-5 h-5 mr-3" />
              Inventario CSV
            </Link>
            <Link href="/admin/editar-imagenes" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 font-medium rounded-md transition-colors">
              <ImageIcon className="w-5 h-5 mr-3" />
              Editar Imágenes
            </Link>
            <Link href="/admin/analytics" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 font-medium rounded-md transition-colors">
              <BarChart2 className="w-5 h-5 mr-3" />
              Analíticas
            </Link>
          </nav>
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link
              href="/"
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors gap-2"
            >
              <Store className="w-4 h-4" />
              Vista de cliente
            </Link>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 p-8 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
