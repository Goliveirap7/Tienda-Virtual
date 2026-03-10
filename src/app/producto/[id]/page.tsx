import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { optimizeCloudinaryUrl } from '@/utils/cloudinary'

const WHATSAPP_NUMBER = '51945899214'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://incomparable-frangipane-01298a.netlify.app'

interface Props {
    params: Promise<{ id: string }>
}

// Generate Open Graph meta tags for WhatsApp / social previews
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    const supabase = await createClient()
    const { data: product } = await supabase
        .from('productos')
        .select('nombre, precio, image_url, categoria')
        .eq('id', id)
        .single()

    if (!product) return { title: 'Producto no encontrado' }

    const imageUrl = optimizeCloudinaryUrl(product.image_url) || `${SITE_URL}/og-default.png`

    return {
        title: `${product.nombre} — F&G Importaciones`,
        description: `${product.categoria} | S/ ${product.precio.toFixed(2)} — Disponible en F&G Importaciones`,
        openGraph: {
            title: product.nombre,
            description: `S/ ${product.precio.toFixed(2)} — F&G Importaciones`,
            images: [{ url: imageUrl, width: 800, height: 1000, alt: product.nombre }],
            url: `${SITE_URL}/producto/${id}`,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: product.nombre,
            description: `S/ ${product.precio.toFixed(2)} — F&G Importaciones`,
            images: [imageUrl],
        },
    }
}

export default async function ProductoPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const { data: product } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single()

    if (!product) notFound()

    const whatsappMsg = encodeURIComponent(
        `Hola, estoy interesado en el producto: *${product.nombre}* (S/ ${product.precio.toFixed(2)}). ¿Me podría brindar más información?\n\n${SITE_URL}/producto/${id}`
    )

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
            <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden">
                {/* Product Image */}
                {product.image_url ? (
                    <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
                        <img
                            src={optimizeCloudinaryUrl(product.image_url)}
                            alt={product.nombre}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="aspect-[4/5] bg-neutral-100 flex items-center justify-center text-neutral-300">
                        <span className="text-6xl">📦</span>
                    </div>
                )}

                {/* Product Info */}
                <div className="p-6">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        {product.categoria}
                    </span>
                    <h1 className="text-xl font-bold text-neutral-800 mt-1 mb-3 leading-tight">
                        {product.nombre}
                    </h1>
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-3xl font-bold text-black">
                            S/ {product.precio.toFixed(2)}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {product.stock > 0 ? 'Disponible' : 'Agotado'}
                        </span>
                    </div>

                    {/* WhatsApp Buy Button */}
                    <a
                        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-[#25D366] hover:bg-green-500 text-white font-bold text-center text-lg py-4 rounded-2xl transition-colors shadow-lg shadow-green-200/50"
                    >
                        💬 Comprar por WhatsApp
                    </a>

                    {/* Back to store */}
                    <a
                        href="/"
                        className="block w-full text-center text-sm text-neutral-400 hover:text-neutral-600 mt-4 transition-colors"
                    >
                        ← Ver más productos
                    </a>
                </div>
            </div>
        </div>
    )
}
