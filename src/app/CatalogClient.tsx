'use client'

import { useState, useMemo, useEffect } from 'react'
import { Producto, CategoriaProducto } from '@/types/database'
import { Search, ShoppingBag, SlidersHorizontal, ChevronLeft, ChevronRight, Menu, X, Info, MapPin, MessageCircleQuestion, Lock, Heart, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react'
import Link from 'next/link'

// Replace this with your actual WhatsApp Number (with country code e.g. 51 for Peru)
const WHATSAPP_NUMBER = '51945899214'

const categorias_base: CategoriaProducto[] = ['UTILES', 'HOGAR', 'TECNOLOGIA', 'DAMAS', 'NIÑOS', 'HOMBRES', 'NAVIDAD']

const FAVORITES_KEY = 'fyg_favorites'
const CART_KEY = 'fyg_cart'

type CartItem = {
  id: string
  nombre: string
  precio: number
  cantidad: number
}

export default function CatalogClient({ initialProducts }: { initialProducts: Producto[] }) {
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<CategoriaProducto | 'TODO' | 'FAVORITOS'>('TODO')
  const [sortBy, setSortBy] = useState<'posicion' | 'nombre' | 'precio_asc' | 'precio_desc' | 'reciente' | 'antiguo'>('reciente')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Load persisted state from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const savedFavs: string[] = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
      const savedCart: CartItem[] = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
      setFavorites(savedFavs)
      setCart(savedCart)
    } catch { /* ignore corrupt data */ }
  }, [])

  const saveCart = (items: CartItem[]) => {
    setCart(items)
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }

  const addToCart = (e: React.MouseEvent, product: { id: string; nombre: string; precio: number }) => {
    e.stopPropagation()
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      const updated = existing
        ? prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { id: product.id, nombre: product.nombre, precio: product.precio, cantidad: 1 }]
      localStorage.setItem(CART_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => { const updated = prev.filter(i => i.id !== id); localStorage.setItem(CART_KEY, JSON.stringify(updated)); return updated })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i)
      localStorage.setItem(CART_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.cantidad, 0)

  const handleCartCheckout = () => {
    if (cart.length === 0) return
    const lines = cart.map(i => `• ${i.nombre} x${i.cantidad} - S/ ${(i.precio * i.cantidad).toFixed(2)}`).join('%0A')
    const total = `TOTAL: S/ ${cartTotal.toFixed(2)}`
    const msg = `Hola, deseo adquirir estos productos:%0A%0A${lines}%0A%0A${total}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
  }

  const toggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    setFavorites(prev => {
      const updated = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
      // If last favorite removed, switch to TODO
      if (updated.length === 0 && activeCategory === 'FAVORITOS') {
        setActiveCategory('TODO')
      }
      return updated
    })
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, search, sortBy])

  // Debounce: wait 500ms after user stops typing, then track the search
  useEffect(() => {
    if (search.trim().length < 2) return
    const timer = setTimeout(() => {
      const count = initialProducts.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase())
      ).length
      console.log('[debounce] Sending search:', search.trim(), '| resultados:', count)
      fetch('/api/track-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termino: search.trim(), resultados: count }),
      })
        .then(r => console.log('[debounce] Response status:', r.status))
        .catch(err => console.error('[debounce] Fetch error:', err))
    }, 500)
    return () => clearTimeout(timer)
  }, [search, initialProducts])


  // Derive categories with priority sorting and filter empty ones
  const sortedCategories = useMemo(() => {
    // Find highest priority and count per category
    const priorities: Record<string, number> = {}
    const counts: Record<string, number> = {}
    
    categorias_base.forEach(cat => {
      priorities[cat] = 0
      counts[cat] = 0
    })

    initialProducts.forEach(p => {
      counts[p.categoria] = (counts[p.categoria] || 0) + 1
      if (p.orden_prioridad > priorities[p.categoria]) {
        priorities[p.categoria] = p.orden_prioridad
      }
    })

    return [...categorias_base]
      .filter(cat => counts[cat] > 0)
      .sort((a, b) => priorities[b] - priorities[a])
  }, [initialProducts])

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = initialProducts.filter(p => {
      const matchCategory = activeCategory === 'TODO' || activeCategory === 'FAVORITOS'
        ? activeCategory === 'FAVORITOS' ? favorites.includes(p.id) : true
        : p.categoria === activeCategory
      const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase())
      return matchCategory && matchSearch
    })

    result.sort((a, b) => {
      if (sortBy === 'posicion') {
        const prioA = a.orden_prioridad > 0 ? a.orden_prioridad : 999999
        const prioB = b.orden_prioridad > 0 ? b.orden_prioridad : 999999
        if (prioA !== prioB) return prioA - prioB
        return a.nombre.localeCompare(b.nombre)
      }
      if (sortBy === 'nombre') {
        return a.nombre.localeCompare(b.nombre)
      }
      if (sortBy === 'precio_asc') {
        return a.precio - b.precio
      }
      if (sortBy === 'precio_desc') {
        return b.precio - a.precio
      }
      if (sortBy === 'reciente') {
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      }
      if (sortBy === 'antiguo') {
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      }
      return 0
    })

    return result
  }, [initialProducts, activeCategory, search, sortBy])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleBuy = (productName: string, productImageUrl: string | null) => {
    const text = `Hola, estoy interesado en el producto: *${productName}*. ¿Me podría brindar más información?`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Hero Section */}
      <section className="bg-black text-white pt-2 pb-8 sm:pt-3 sm:pb-12 px-6 sm:px-12 text-center relative overflow-hidden" id="inicio">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-neutral-800 opacity-90 z-0"></div>
        
        {/* Hamburger Menu Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 p-2 text-white/80 hover:text-white transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-8 h-8 sm:w-10 sm:h-10" />
        </button>

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <img
            src="https://res.cloudinary.com/dvaeqzm95/image/upload/v1741327122/productos_tienda/logo_fyg.png"
            alt="F&G Importaciones Logo"
            className="w-48 sm:w-64 md:w-80 h-auto object-contain mb-4 drop-shadow-2xl"
          />
          <p className="text-sm sm:text-base text-neutral-300 mb-6 max-w-2xl font-medium tracking-wide leading-snug">
            Los mejores productos, a los mejores precios y en un solo lugar
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-lg relative mt-0">
            <input
              type="text"
              placeholder="¿Qué estás buscando?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-4 pl-12 pr-4 rounded-full bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 shadow-xl transition-all border border-white/20"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5" />
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Categories Section */}
        <div className="flex overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide space-x-3 items-center justify-start sm:justify-center" id="categorias">
          {/* FAVORITOS tab — only visible when user has at least 1 favorite */}
          {favorites.length > 0 && (
            <button
              onClick={() => setActiveCategory('FAVORITOS')}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                activeCategory === 'FAVORITOS'
                  ? 'bg-rose-500 text-white shadow-md scale-105'
                  : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              }`}
            >
              <Heart className="w-3.5 h-3.5" fill={activeCategory === 'FAVORITOS' ? 'white' : 'currentColor'} />
              FAVORITOS
            </button>
          )}

          <button
            onClick={() => setActiveCategory('TODO')}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-medium transition-all shadow-sm ${activeCategory === 'TODO'
              ? 'bg-black text-white shadow-md scale-105'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
              }`}
          >
            TODOS
          </button>

          {sortedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-medium transition-all shadow-sm ${activeCategory === cat
                ? 'bg-black text-white shadow-md scale-105'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-4 sm:px-0 gap-4">
          <div className="text-sm text-neutral-500 font-medium">
            Mostrando {filteredProducts.length} productos
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
            <select
              className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-lg focus:ring-black focus:border-black block w-full sm:w-auto p-2 outline-none shadow-sm cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="posicion">Ordenar por: Posición</option>
              <option value="nombre">Ordenar por: Nombre (A-Z)</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
              <option value="reciente">Más reciente primero</option>
              <option value="antiguo">Más antiguo primero</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="w-24 h-24 mb-6 text-neutral-200">
              <Search className="w-full h-full" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-800">No se encontraron resultados</h3>
            <p className="text-neutral-500 mt-2">Intenta buscar con otros términos o cambia de categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {paginatedProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-100 cursor-pointer"
              >
                <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.nombre}
                      decoding="async"
                      className="object-cover w-full h-full absolute inset-0 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <ShoppingBag className="w-12 h-12" />
                    </div>
                  )}
                  {/* Stock Indicator */}
                  {product.stock > 0 ? (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                      Disponible
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                      Agotado
                    </div>
                  )}
                  {/* Favorite Heart Button */}
                  <button
                    onClick={(e) => toggleFavorite(e, product.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow transition-transform hover:scale-110 active:scale-95"
                    aria-label={favorites.includes(product.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Heart
                      className="w-4 h-4 transition-colors"
                      fill={favorites.includes(product.id) ? '#f43f5e' : 'none'}
                      stroke={favorites.includes(product.id) ? '#f43f5e' : '#9ca3af'}
                    />
                  </button>
                  {/* Add to Cart Button — bottom-right of image */}
                  <button
                    onClick={(e) => addToCart(e, product)}
                    className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 text-white backdrop-blur-sm shadow hover:bg-black transition-all hover:scale-110 active:scale-95"
                    aria-label="Añadir al carrito"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col flex-1 p-4">
                  <span className="text-xs font-semibold text-neutral-400 mb-1">{product.categoria}</span>
                  <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 leading-tight flex-1 mb-2">
                    {product.nombre}
                  </h3>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-lg font-bold text-black">
                      S/ {product.precio.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBuy(product.nombre, product.image_url); }}
                    className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-xl transition-colors shadow-sm shadow-green-200"
                  >
                    Comprar ahora
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-12 space-x-4">
            <button
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="flex items-center justify-center p-3 rounded-xl border border-neutral-200 bg-white text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium mr-1 hidden sm:inline">Anterior</span>
            </button>

            <div className="px-6 py-3 bg-white border border-neutral-200 rounded-xl shadow-sm text-sm font-medium text-neutral-700">
              Página {currentPage} de {totalPages}
            </div>

            <button
              onClick={() => {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center p-3 rounded-xl border border-neutral-200 bg-white text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <span className="text-sm font-medium ml-1 hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        )}
      </main>

      {/* Location Map Section */}
      <section className="bg-white border-t border-neutral-200 mt-20 py-16" id="visitanos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-800">Visítanos</h2>
            <p className="text-neutral-500 mt-2 max-w-2xl mx-auto">
              Encuentra nuestra tienda principal en Mz. H1 Lt 11 Sec E2 PPN Pachacutec Ventanilla - Callao 
              <br className="hidden sm:block" />
              <span className="font-medium text-neutral-700">(Frente a la puerta N° 05 del Mercado Unificados)</span>
            </p>
          </div>
          <div className="w-full h-[400px] rounded-2xl overflow-hidden shadow-lg border border-neutral-100 flex items-center justify-center bg-neutral-50 relative group">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d488.126132979982!2d-77.16198908462103!3d-11.834638846496595!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105d5caa71400d7%3A0xf48ad246fd9240!2sF%26G%20Importaciones%20Unificados-Pachacutec!5e0!3m2!1ses-419!2spe!4v1772865854444!5m2!1ses-419!2spe"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 z-10"
            ></iframe>
            {/* Fallback Overlay / Clickable Area */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-20 flex items-center justify-center pointer-events-none">
              <a
                href="https://maps.app.goo.gl/5HvqNds6mkPv8FLt8"
                target="_blank"
                rel="noreferrer"
                className="bg-black text-white px-6 py-3 rounded-full font-medium shadow-xl opacity-0 hover:scale-105 group-hover:opacity-100 transition-all pointer-events-auto"
              >
                Abrir en Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Information Section (About Us & FAQ) */}
      <section className="bg-white border-t border-neutral-100 py-20" id="informacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* About Us */}
            <div className="flex flex-col justify-center">
              <div className="mb-8 w-full">
                 <img 
                   src="https://res.cloudinary.com/dvaeqzm95/image/upload/v1741327122/productos_tienda/logo_fyg.png" 
                   alt="F&G Logo" 
                   className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm h-28 sm:h-32 md:h-40 object-contain object-left saturate-150 drop-shadow-lg" 
                 />
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight mb-6">
                Sobre Nosotros
              </h2>
              <div className="prose prose-lg text-neutral-600 space-y-4 leading-relaxed">
                <p>
                  En F&amp;G Importaciones creemos que acceder a productos de calidad no debería costar de más. Por eso, nos dedicamos a importar y traer a tus manos una gran variedad de artículos a los precios más cómodos del mercado.
                </p>
                <p>
                  Ya sea que busques ese detalle perfecto para tu hogar, o quieras comprar a buen precio para iniciar y hacer crecer tu propio negocio, aquí estamos para ser tu mejor aliado.
                </p>
                <p className="font-semibold text-neutral-900 border-l-4 border-black pl-4">
                  Nuestro catálogo nunca se detiene: ¡todas las semanas recibimos novedades para que siempre encuentres las mejores oportunidades!
                </p>
              </div>
            </div>

            {/* FAQ Area */}
            <div className="bg-neutral-50 rounded-3xl p-8 sm:p-10 border border-neutral-200 shadow-sm">
              <h3 className="text-2xl font-bold text-neutral-900 mb-8 flex items-center gap-3">
                <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preguntas Frecuentes
              </h3>
              
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
                  <h4 className="font-bold text-neutral-900 flex gap-2 items-start mb-2">
                    <span className="text-green-500">Q.</span> ¿Tienen envío a provincia?
                  </h4>
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium pl-6">
                    Sí, tenemos envios a todas partes del Perú.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
                  <h4 className="font-bold text-neutral-900 flex gap-2 items-start mb-2">
                    <span className="text-blue-500">Q.</span> ¿Cómo funcionan los métodos de pago?
                  </h4>
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium pl-6">
                    Al comprar en tienda puede pagar con efectivo, Yape, Plin o tarjeta.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
                  <h4 className="font-bold text-neutral-900 flex gap-2 items-start mb-2">
                    <span className="text-amber-500">Q.</span> ¿Cómo funcionan los métodos de pago para compras en provincia?
                  </h4>
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium pl-6">
                    El metodo es pagar primero, recibir después.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
                  <h4 className="font-bold text-neutral-900 flex gap-2 items-start mb-2">
                    <span className="text-purple-500">Q.</span> ¿Hay delivery para Lima?
                  </h4>
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium pl-6">
                    No, unicamente hacemos envios fuera de Lima, recordarles que nuestra tienda se encuentra en Pachacutec.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 text-neutral-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-4 rounded-full overflow-hidden border-2 border-neutral-700 bg-white flex items-center justify-center">
            <img src="https://res.cloudinary.com/dvaeqzm95/image/upload/v1741327122/productos_tienda/logo_fyg.png" alt="F&G Importaciones Logo Footer" className="w-full h-full object-contain p-1" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">F&G Importaciones</h3>
          <p className="text-sm mb-8 text-center max-w-sm">
            Tu tienda de confianza con los mejores productos al mejor precio del mercado.
          </p>
          <div className="h-px w-24 bg-neutral-800 mb-8"></div>
          <p className="text-sm font-medium mb-1">
             F&G Importaciones &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs font-medium text-neutral-500">
            Developed by <a href="https://github.com/Goliveirap7" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-green-400 transition-colors underline decoration-neutral-700 underline-offset-4">Shio</a>
          </p>
        </div>
      </footer>

      {/* Product Lightbox Modal */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/5] bg-neutral-100">
               {selectedProduct.image_url ? (
                 <img
                   src={selectedProduct.image_url}
                   alt={selectedProduct.nombre}
                   decoding="async"
                   className="object-cover w-full h-full"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-neutral-300">
                   <ShoppingBag className="w-16 h-16" />
                 </div>
               )}
               {/* Stock Indicator */}
               {selectedProduct.stock > 0 ? (
                 <div className="absolute top-4 left-4 bg-green-500 text-white text-sm font-bold px-3 py-1.5 rounded-md shadow-md">
                   Disponible
                 </div>
               ) : (
                 <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-md shadow-md">
                   Agotado
                 </div>
               )}
            </div>
            <div className="p-6">
              <span className="text-sm font-semibold text-neutral-400 mb-2 block">{selectedProduct.categoria}</span>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 leading-tight mb-4">
                {selectedProduct.nombre}
              </h2>
              <div className="flex items-center justify-between mb-6">
                <span className="text-3xl font-bold text-black">
                  S/ {selectedProduct.precio.toFixed(2)}
                </span>
                <div className="flex items-center gap-2">
                  {/* Favorite button in modal */}
                  <button
                    onClick={(e) => toggleFavorite(e, selectedProduct.id)}
                    className="p-2.5 rounded-full border border-neutral-200 hover:border-rose-300 transition-colors"
                    aria-label="Añadir a favoritos"
                  >
                    <Heart
                      className="w-5 h-5 transition-colors"
                      fill={favorites.includes(selectedProduct.id) ? '#f43f5e' : 'none'}
                      stroke={favorites.includes(selectedProduct.id) ? '#f43f5e' : '#9ca3af'}
                    />
                  </button>
                  {/* Add to cart button in modal */}
                  <button
                    onClick={(e) => { addToCart(e, selectedProduct); setSelectedProduct(null); setIsCartOpen(true) }}
                    className="p-2.5 rounded-full border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors"
                    aria-label="Añadir al carrito"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleBuy(selectedProduct.nombre, selectedProduct.image_url)}
                className="w-full bg-[#25D366] hover:bg-green-500 text-white font-bold text-lg py-4 rounded-2xl transition-colors shadow-lg shadow-green-200/50 flex items-center justify-center gap-2"
              >
                Comprar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fullscreen Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[150] bg-black text-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex justify-end p-6">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-10 h-10" />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1 space-y-8 p-6 text-xl sm:text-2xl font-medium tracking-wide">
            <a 
              href="#inicio" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-amber-400 transition-colors"
            >
              Inicio
            </a>
            <a 
              href="#categorias" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-amber-400 transition-colors"
            >
              Catálogo
            </a>
            <a 
              href="#visitanos" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-amber-400 transition-colors flex items-center gap-2"
            >
              <MapPin className="w-6 h-6" />
              Visítanos
            </a>
            <a 
              href="#informacion" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-amber-400 transition-colors flex items-center gap-2"
            >
              <Info className="w-6 h-6" />
              Sobre Nosotros
            </a>
            <a 
              href="#informacion" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-amber-400 transition-colors flex items-center gap-2"
            >
              <MessageCircleQuestion className="w-6 h-6" />
              Soporte
            </a>
          </div>

          <div className="p-8 border-t border-white/10 flex flex-col items-center gap-4">
             {/* Discreet Admin Link */}
             <Link 
               href="/admin" 
               className="text-white/30 hover:text-white/70 text-sm flex items-center gap-2 transition-colors mb-4"
             >
               <Lock className="w-4 h-4" />
               Administración
             </Link>
             <p className="text-white/50 text-xs">F&G Importaciones © {new Date().getFullYear()}</p>
          </div>
        </div>
      )}

      {/* Floating Cart Button — bottom left */}
      {!selectedProduct && !isMobileMenuOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-6 bg-black text-white p-4 rounded-full shadow-2xl hover:bg-neutral-800 hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center"
          title="Ver carrito"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      )}

      {/* Floating WhatsApp Button — bottom right (always visible) */}
      {!isMobileMenuOpen && (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, me gustaría recibir más información sobre sus productos.')}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-green-600 hover:scale-110 transition-transform duration-300 z-50 flex items-center justify-center"
          title="Contáctanos por WhatsApp"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.066.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z" />
          </svg>
        </a>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="text-lg font-bold">Mi Carrito</h2>
                {cartCount > 0 && (
                  <span className="bg-neutral-100 text-neutral-600 text-xs font-semibold px-2 py-0.5 rounded-full">{cartCount} items</span>
                )}
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-neutral-400">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">Tu carrito está vacío</p>
                <p className="text-sm mt-1">Agrega productos usando el ícono 🛒</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 line-clamp-2 leading-tight">{item.nombre}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">S/ {item.precio.toFixed(2)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.cantidad}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-black w-16 text-right shrink-0">
                        S/ {(item.precio * item.cantidad).toFixed(2)}
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-1 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-neutral-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-neutral-700">Total</span>
                    <span className="text-2xl font-bold text-black">S/ {cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCartCheckout}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.066.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z" /></svg>
                    Enviar pedido por WhatsApp
                  </button>
                  <button
                    onClick={() => { setCart([]); localStorage.removeItem(CART_KEY) }}
                    className="w-full text-sm text-neutral-400 hover:text-red-500 transition-colors py-1"
                  >
                    Vaciar carrito
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

