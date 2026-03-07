'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Producto } from '@/types/database'
import { ImageOff, Upload, Search, GripVertical, Settings2 } from 'lucide-react'
import DeleteModal from '@/components/DeleteModal'
import ImageEditorModal from '@/components/ImageEditorModal'

export default function EditorClient({ initialProducts }: { initialProducts: Producto[] }) {
  const [products, setProducts] = useState<Producto[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null)

  // Extraemos las categorías únicas para el filtro
  const categories = Array.from(new Set(products.map(p => p.categoria))).sort()

  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: (hardDelete: boolean) => void;
  } | null>(null);

  // Editor Transform Modal State
  const [transformModalOpen, setTransformModalOpen] = useState(false)
  const [transformingProduct, setTransformingProduct] = useState<Producto | null>(null)

  const supabase = createClient()

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase())
    
    let matchesCategory = true;
    if (selectedCategory === 'SIN_IMAGEN') {
      matchesCategory = !p.image_url;
    } else if (selectedCategory) {
      matchesCategory = p.categoria === selectedCategory;
    }

    return matchesSearch && matchesCategory;
  })

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

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'ml_default') // Ajusta según tu preset
    formData.append('folder', 'tienda_masiva')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) throw new Error('Error subiendo imagen a Cloudinary')
    const data = await res.json()
    return data.secure_url
  }

  // --- HTML5 Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedProductId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Se requiere un pequeño timeout para no romper el elemento fantasma que arrastra Chrome
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedProductId(null)
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1'
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault() // Necesario para permitir el "drop"
    e.dataTransfer.dropEffect = 'move'

    // Lógica de auto-scroll para cuando arrastras una imagen hacia arriba/abajo
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      const threshold = 100; // píxeles de detección
      const scrollSpeed = 15;
      
      const { clientY } = e;
      const { innerHeight } = window;
      
      if (clientY < threshold) {
        scrollContainer.scrollBy({ top: -scrollSpeed, behavior: 'instant' });
      } else if (innerHeight - clientY < threshold) {
        scrollContainer.scrollBy({ top: scrollSpeed, behavior: 'instant' });
      }
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetProduct: Producto) => {
    e.preventDefault()
    if (!draggedProductId || draggedProductId === targetProduct.id) return

    const sourceProduct = products.find(p => p.id === draggedProductId)
    if (!sourceProduct) return

    if (!confirm(`¿Intercambiar la imagen de "${sourceProduct.nombre}" con "${targetProduct.nombre}"?`)) {
      return
    }

    setLoading(true)

    const newSourceImage = targetProduct.image_url;
    const newTargetImage = sourceProduct.image_url;

    // Actualizamos en BD cruzado
    await supabase.from('productos').update({ image_url: newSourceImage }).eq('id', sourceProduct.id);
    await supabase.from('productos').update({ image_url: newTargetImage }).eq('id', targetProduct.id);

    // Actualizamos UI
    setProducts(prev => prev.map(p => {
      if (p.id === sourceProduct.id) return { ...p, image_url: newSourceImage }
      if (p.id === targetProduct.id) return { ...p, image_url: newTargetImage }
      return p
    }))

    setLoading(false)
  }

  // --- Subida directa de reemplazo ---
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>, product: Producto) => {
    const file = e.target.files?.[0]
    if (!file) return

    const processUpload = async (hardDeleteOld: boolean) => {
      setLoading(true)
      try {
        // 1. Borrar la antigua si existía y el usuario quiso borrarla duro
        if (product.image_url && hardDeleteOld) {
          await deleteCloudinaryImage(product.image_url)
        }

        // 2. Subir la nueva a Cloudinary
        const newUrl = await uploadToCloudinary(file)

        // 3. Atualizar Supabase con la nueva
        const { error } = await supabase.from('productos').update({ image_url: newUrl }).eq('id', product.id)
        if (error) throw new Error(error.message)

        // 4. Reflejar en la UI
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_url: newUrl } : p))
        alert('Imagen actualizada con éxito.')
      } catch (err: any) {
        alert('Error al actualizar: ' + err.message)
      } finally {
        setLoading(false)
        e.target.value = '' // reset input
      }
    }

    // Si había una imagen previa, abrimos el modal
    if (product.image_url) {
      setDeleteModalConfig({
        title: 'Reemplazar Imagen',
        message: `Estás subiendo una nueva foto para "${product.nombre}". ¿Qué hacemos con la imagen actual?`,
        onConfirm: (hardDelete) => processUpload(hardDelete)
      });
      setDeleteModalOpen(true);
    } else {
      // Si no había imagen, procesamos directamente la subida
      await processUpload(false);
    }
  }

  // --- Actualizar URL de Imagen Editada (Cloudinary Transformations) ---
  const handleTransformSave = async (newUrl: string) => {
    if (!transformingProduct) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('productos').update({ image_url: newUrl }).eq('id', transformingProduct.id);
      if (error) throw new Error(error.message);

      setProducts(prev => prev.map(p => p.id === transformingProduct.id ? { ...p, image_url: newUrl } : p));
    } catch (err: any) {
      alert('Error guardando los cambios de edición: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteModalConfig?.onConfirm || (() => { })}
        title={deleteModalConfig?.title || ''}
        message={deleteModalConfig?.message || ''}
      />

      {transformingProduct && (
        <ImageEditorModal
          isOpen={transformModalOpen}
          onClose={() => { setTransformModalOpen(false); setTransformingProduct(null); }}
          onSave={handleTransformSave}
          originalUrl={transformingProduct.image_url || ''}
          productName={transformingProduct.nombre}
        />
      )}

      <div className="w-full bg-white rounded-lg shadow border border-gray-200 p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-40 flex items-center justify-center rounded-lg">
            <span className="text-xl font-bold text-gray-800 animate-pulse">Sincronizando imágenes...</span>
          </div>
        )}

        {/* Filters Header */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-96 flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black sm:text-sm"
              placeholder="Buscar producto para editar imagen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black sm:text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              <option value="SIN_IMAGEN" className="font-bold text-red-600 bg-red-50">🚨 Filtro: Sin Imagen</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              draggable
              onDragStart={(e) => handleDragStart(e, product.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, product)}
              className={`flex flex-col border rounded-xl overflow-hidden hover:shadow-xl transition-all bg-white cursor-grab active:cursor-grabbing ${draggedProductId === product.id ? 'ring-4 ring-black/20' : 'border-gray-200'}`}
            >
              {/* Image Preview Container */}
              <div
                className="w-full aspect-square bg-gray-100 flex items-center justify-center relative group select-none cursor-pointer"
                onClick={() => {
                  if (product.image_url) {
                    setTransformingProduct(product);
                    setTransformModalOpen(true);
                  }
                }}
                title={product.image_url ? "Doble click para editar imagen (Rotar, etc)" : ""}
              >
                {product.image_url ? (
                  <>
                    <img src={product.image_url} alt={product.nombre} className="w-full h-full object-contain p-2 pointer-events-none" />
                    <div className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm pointer-events-none text-black">
                      <Settings2 className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center pointer-events-none">
                    <ImageOff className="w-8 h-8 mb-2" />
                    <span className="text-xs">Sin Imagen</span>
                  </div>
                )}

                {/* Upload Hover Overlay */}
                <label
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/80 hover:bg-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white cursor-pointer z-10 shadow-lg text-xs font-medium"
                  title="Subir Nueva Foto Manualmente"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Upload className="w-3 h-3" />
                  Nueva Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleDirectUpload(e, product)}
                  />
                </label>
              </div>

              {/* Product Info */}
              <div className="p-3 flex-1 flex flex-col justify-between bg-white border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-800 line-clamp-3 leading-snug">
                  <GripVertical className="inline-block w-3 h-3 text-gray-400 mr-1 -ml-1 align-text-bottom" />
                  {product.nombre}
                </p>
                <div className="mt-2 flex justify-between items-end">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {product.categoria}
                  </span>
                  <span className="text-xs font-bold text-black">
                    S/ {Number(product.precio).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-medium">
              No hay productos que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
