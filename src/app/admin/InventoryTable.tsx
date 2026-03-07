'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Producto, CategoriaProducto } from '@/types/database'
import Papa from 'papaparse'
import { Search, Upload, Trash2, Edit2, Check, X, Image as ImageIcon, ImageOff, Plus } from 'lucide-react'
import DeleteModal from '@/components/DeleteModal'

export default function InventoryTable({ initialProducts }: { initialProducts: Producto[] }) {
  const [products, setProducts] = useState<Producto[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: (hardDelete: boolean) => void;
  } | null>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Producto>>({
    nombre: '',
    precio: 0,
    stock: 0,
    categoria: 'UTILES',
    orden_prioridad: 0
  });

  const supabase = createClient()

  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        const newProducts = rows.map(row => ({
          nombre: String(row.PRODUCTOS || row.productos || row.PRODUCTO || row.producto || 'Sin nombre')
             .replace(/NI\uFFFD/g, 'NIÑ')
             .replace(/DISE\uFFFD/g, 'DISEÑ')
             .replace(/U\uFFFD/g, 'UÑ')
             .replace(/NAVIDE\uFFFD/g, 'NAVIDEÑ')
             .replace(/PEQUE\uFFFD/g, 'PEQUEÑ')
             .replace(/A\uFFFDO/g, 'AÑO')
             .replace(/PA\uFFFDAL/g, 'PAÑAL')
             .replace(/BA\uFFFDO/g, 'BAÑO')
             .replace(/MU\uFFFD/g, 'MUÑ')
             .replace(/\uFFFD/g, '°'), // Asume grados por defecto para N°24 o 360°
          precio: (() => {
            const raw = Object.keys(row).find(k => k.toUpperCase().includes('PRECIO')) ? row[Object.keys(row).find(k => k.toUpperCase().includes('PRECIO'))!] : '0';
            return parseFloat(String(raw).replace(/[^0-9.]/g, '') || '0');
          })(),
          categoria: ((row.CATEGORIA || row.Categoria || row.categoria || 'UTILES')
             .toUpperCase()
             .replace(/N.*OS/g, 'NIÑOS') 
             .replace(/NINOS/g, 'NIÑOS')) as CategoriaProducto,
          image_url: row.IMAGEN || row.imagen || row.IMAGE_URL || row.image_url || null,
          stock: 1,
          orden_prioridad: 0,
        }))

        if (newProducts.length === 0) {
          alert("El CSV está vacío o no tiene las columnas correctas.")
          setLoading(false)
          return
        }

        try {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProducts)
          });
          
          const result = await res.json();

          if (!res.ok) {
            alert('Error al importar: ' + (result.error || 'Error desconocido'))
          } else if (result.success && result.data) {
            setProducts(prev => [...result.data, ...prev])
            alert(`¡${result.data.length} productos importados con éxito!`)
          }
        } catch (err: any) {
          alert('Error en conexión: ' + err.message);
        }
        setLoading(false)
        e.target.value = '' // reset
      }
    })
  }

  const deleteCloudinaryImage = async (imageUrl: string) => {
      const parts = imageUrl.split('/');
      const uploadIndex = parts.findIndex(p => p === 'upload');
      if (uploadIndex !== -1) {
        let idParts = parts.slice(uploadIndex + 1);
        if (idParts[0].startsWith('v') && !isNaN(Number(idParts[0].substring(1)))) {
          idParts.shift();
        }
        const idWithExtension = idParts.join('/');
        const publicId = idWithExtension.includes('.') ? idWithExtension.substring(0, idWithExtension.lastIndexOf('.')) : idWithExtension;
        
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId })
        });
      }
  };

  const handleDelete = (product: Producto) => {
    setDeleteModalConfig({
      title: 'Eliminar Producto',
      message: `¿Seguro que deseas eliminar el producto "${product.nombre}"?`,
      onConfirm: async (hardDelete: boolean) => {
        setLoading(true);
        if (product.image_url && hardDelete) {
           await deleteCloudinaryImage(product.image_url);
        }

        const { error } = await supabase.from('productos').delete().eq('id', product.id)
        if (!error) {
           setProducts(prev => prev.filter(p => p.id !== product.id))
           setSelectedIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(product.id);
              return newSet;
           });
        } else {
           alert('Error al eliminar: ' + error.message)
        }
        setLoading(false);
      }
    });
    setDeleteModalOpen(true);
  }

  const handleBulkDelete = () => {
     if (selectedIds.size === 0) return;
     
     setDeleteModalConfig({
      title: 'Eliminar Productos Masivamente',
      message: `¿Seguro que deseas eliminar ${selectedIds.size} productos seleccionados?`,
      onConfirm: async (hardDelete: boolean) => {
        setLoading(true);
        const productsToDelete = products.filter(p => selectedIds.has(p.id));
        
        if (hardDelete) {
          const imageDeletionPromises = productsToDelete
            .filter(p => p.image_url)
            .map(p => deleteCloudinaryImage(p.image_url!));
          await Promise.all(imageDeletionPromises);
        }

        const { error } = await supabase.from('productos').delete().in('id', Array.from(selectedIds));
        
        if (!error) {
          setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
          setSelectedIds(new Set());
          alert(`¡${productsToDelete.length} productos eliminados correctamente!`);
        } else {
          alert('Error eliminando productos: ' + error.message);
        }
        setLoading(false);
      }
    });
    setDeleteModalOpen(true);
  }

  const handleUpdate = async (id: string, updates: Partial<Producto>) => {
    const { error } = await supabase.from('productos').update(updates).eq('id', id)
    if (!error) {
       setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
       setEditingId(null)
    } else {
       alert('Error actualizando: ' + error.message)
    }
  }

  const handleDeleteImage = (product: Producto) => {
    if (!product.image_url) return;
    
    setDeleteModalConfig({
      title: 'Eliminar Imagen del Producto',
      message: `¿Seguro que deseas desenlazar la imagen del producto "${product.nombre}"?`,
      onConfirm: async (hardDelete: boolean) => {
        setLoading(true);
        try {
          if (hardDelete) {
            await deleteCloudinaryImage(product.image_url!);
          }
    
          const { error } = await supabase.from('productos').update({ image_url: null }).eq('id', product.id);
          if (!error) {
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_url: null } : p));
            alert('Imagen removida correctamente.');
          } else {
            alert('Error al actualizar la base de datos: ' + error.message);
          }
        } catch (e) {
          alert('Ocurrió un error al procesar la imagen.');
        }
        setLoading(false);
      }
    });
    setDeleteModalOpen(true);
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.nombre) {
      alert("El nombre del producto es obligatorio.");
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      
      const result = await res.json();
      
      if (res.ok && result.success && result.data) {
        setProducts(prev => [result.data[0], ...prev]);
        setIsAddModalOpen(false);
        setNewProduct({
          nombre: '',
          precio: 0,
          stock: 0,
          categoria: 'UTILES',
          orden_prioridad: 0
        });
        alert('Producto añadido correctamente.');
      } else {
        alert('Error al añadir producto: ' + (result.error || 'Error desconocido'));
      }
    } catch (err: any) {
      alert('Error en conexión: ' + err.message);
    }
    
    setLoading(false);
  }

  return (
    <>
      <DeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteModalConfig?.onConfirm || (() => {})}
        title={deleteModalConfig?.title || ''}
        message={deleteModalConfig?.message || ''}
      />
      <div className="bg-white rounded-lg shadow border border-gray-200 text-black">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
           {selectedIds.size > 0 && (
             <button 
                onClick={handleBulkDelete}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
             >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar seleccionados ({selectedIds.size})
             </button>
           )}
           <button 
             onClick={() => setIsAddModalOpen(true)}
             disabled={loading}
             className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
           >
             <Plus className="w-4 h-4 mr-2" />
             Añadir manualmente
           </button>
           <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800">
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Procesando...' : 'Importar CSV'}
              <input type="file" accept=".csv" className="hidden" disabled={loading} onChange={handleFileUpload} />
           </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left w-8">
                 <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-black focus:ring-black"
                    checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    onChange={(e) => {
                       if (e.target.checked) {
                          setSelectedIds(new Set(filteredProducts.map(p => p.id)));
                       } else {
                          setSelectedIds(new Set());
                       }
                    }}
                 />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio (S/)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Subida</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Img</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map(product => (
              <EditableRow 
                key={product.id} 
                product={product} 
                onDelete={() => handleDelete(product)}
                onUpdate={(updates) => handleUpdate(product.id, updates)}
                onDeleteImage={() => handleDeleteImage(product)}
                isEditing={editingId === product.id}
                setEditing={() => setEditingId(product.id)}
                cancelEditing={() => setEditingId(null)}
                isSelected={selectedIds.has(product.id)}
                toggleSelection={() => {
                   setSelectedIds(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(product.id)) newSet.delete(product.id);
                      else newSet.add(product.id);
                      return newSet;
                   });
                }}
              />
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No se encontraron productos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Add Product Modal */}
    {isAddModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">Añadir Nuevo Producto</h3>
            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
              <input 
                type="text" 
                required
                value={newProduct.nombre} 
                onChange={e => setNewProduct({...newProduct, nombre: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:ring-black focus:border-black"
                placeholder="Ej. Cuaderno rayado A4"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select 
                  value={newProduct.categoria} 
                  onChange={e => setNewProduct({...newProduct, categoria: e.target.value as CategoriaProducto})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:ring-black focus:border-black"
                >
                  <option value="UTILES">ÚTILES</option>
                  <option value="HOGAR">HOGAR</option>
                  <option value="TECNOLOGIA">TECNOLOGIA</option>
                  <option value="DAMAS">DAMAS</option>
                  <option value="NIÑOS">NIÑOS</option>
                  <option value="HOMBRES">HOMBRES</option>
                  <option value="NAVIDAD">NAVIDAD</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (S/)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  value={newProduct.precio} 
                  onChange={e => setNewProduct({...newProduct, precio: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:ring-black focus:border-black"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={newProduct.stock} 
                  onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:ring-black focus:border-black"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad (Orden)</label>
                <input 
                  type="number" 
                  value={newProduct.orden_prioridad} 
                  onChange={e => setNewProduct({...newProduct, orden_prioridad: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:ring-black focus:border-black"
                />
              </div>
            </div>
            
            <div className="pt-4 flex gap-3">
               <button 
                 type="button"
                 onClick={() => setIsAddModalOpen(false)}
                 className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 type="submit"
                 disabled={loading}
                 className="flex-1 bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex justify-center items-center"
               >
                 {loading ? 'Guardando...' : 'Crear producto'}
               </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

function EditableRow({ 
  product, onDelete, onUpdate, onDeleteImage, isEditing, setEditing, cancelEditing, isSelected, toggleSelection
}: { 
  product: Producto; 
  onDelete: () => void; 
  onUpdate: (u: Partial<Producto>) => void;
  onDeleteImage: () => void;
  isEditing: boolean;
  setEditing: () => void;
  cancelEditing: () => void;
  isSelected: boolean;
  toggleSelection: () => void;
}) {
  const [nombre, setNombre] = useState(product.nombre)
  const [precio, setPrecio] = useState(product.precio)
  const [stock, setStock] = useState(product.stock)
  const [prioridad, setPrioridad] = useState(product.orden_prioridad)
  const [categoria, setCategoria] = useState(product.categoria)

  if (isEditing) {
    return (
      <tr className="bg-yellow-50">
        <td className="px-6 py-4"></td>
        <td className="px-6 py-4 text-sm font-medium text-gray-900">
          <input 
            type="text" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            className="w-full min-w-[150px] border border-gray-300 rounded px-2 py-1"
          />
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
           <select 
             value={categoria} 
             onChange={e => setCategoria(e.target.value as CategoriaProducto)}
             className="border border-gray-300 rounded px-2 py-1 max-w-[120px]"
           >
             <option value="UTILES">UTILES</option>
             <option value="HOGAR">HOGAR</option>
             <option value="TECNOLOGIA">TECNOLOGIA</option>
             <option value="DAMAS">DAMAS</option>
             <option value="NIÑOS">NIÑOS</option>
             <option value="HOMBRES">HOMBRES</option>
             <option value="NAVIDAD">NAVIDAD</option>
           </select>
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          <div className="flex items-center">
            <span className="mr-1">S/</span>
            <input 
              type="number"
              step="0.01" 
              value={precio} 
              onChange={e => setPrecio(Number(e.target.value))} 
              className="w-20 border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          <input 
            type="number" 
            value={stock} 
            onChange={e => setStock(Number(e.target.value))} 
            className="w-20 border border-gray-300 rounded px-2 py-1"
          />
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          {product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
           <input 
            type="number" 
            value={prioridad} 
            onChange={e => setPrioridad(Number(e.target.value))} 
            className="w-20 border border-gray-300 rounded px-2 py-1"
          />
        </td>
        <td className="px-6 py-4 text-center">
           {product.image_url ? <ImageIcon className="w-5 h-5 text-green-500 mx-auto" /> : <ImageOff className="w-5 h-5 text-gray-300 mx-auto" />}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          <button onClick={() => onUpdate({ nombre, precio, stock, orden_prioridad: prioridad, categoria })} className="text-green-600 hover:text-green-900">
            <Check className="w-5 h-5 inline" />
          </button>
          <button onClick={cancelEditing} className="text-gray-600 hover:text-gray-900">
            <X className="w-5 h-5 inline" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
         <input 
            type="checkbox" 
            checked={isSelected}
            onChange={toggleSelection}
            className="rounded border-gray-300 text-black focus:ring-black"
         />
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.nombre}</td>
      <td className="px-6 py-4 text-sm text-gray-500">{product.categoria}</td>
      <td className="px-6 py-4 text-sm text-gray-500">S/ {Number(product.precio).toFixed(2)}</td>
      <td className="px-6 py-4 text-sm text-gray-500">
         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {product.stock > 0 ? 'Disponible' : 'Agotado'}
         </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">{product.orden_prioridad}</td>
      <td className="px-6 py-4 text-center">
        {product.image_url ? (
          <div className="flex items-center justify-center space-x-2">
            <ImageIcon className="w-5 h-5 text-green-500" />
            <button onClick={onDeleteImage} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded" title="Eliminar imagen">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <ImageOff className="w-5 h-5 text-gray-300 mx-auto" />
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
        <button onClick={setEditing} className="text-indigo-600 hover:text-indigo-900">
          <Edit2 className="w-4 h-4 inline" />
        </button>
        <button onClick={onDelete} className="text-red-600 hover:text-red-900">
          <Trash2 className="w-4 h-4 inline" />
        </button>
      </td>
    </tr>
  )
}
