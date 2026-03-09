import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  console.log('[track-search] Route hit!')
  try {
    const { termino, resultados } = await req.json()
    console.log('[track-search] Received:', { termino, resultados })
    if (!termino || termino.trim().length < 2) {
      return NextResponse.json({ ok: true }) // ignore very short queries
    }

    const term = termino.trim().toLowerCase()
    console.log('[track-search] Processing term:', term)

    // maybeSingle() returns null (not an error) when no row is found
    const { data: existing, error: selectError } = await supabase
      .from('busquedas')
      .select('cantidad')
      .eq('termino', term)
      .maybeSingle()

    if (selectError) {
      console.error('track-search select error:', selectError)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    if (existing) {
      // Term exists → increment count
      const { error: updateError } = await supabase
        .from('busquedas')
        .update({
          cantidad: existing.cantidad + 1,
          ultima_busqueda: new Date().toISOString(),
          resultados: resultados ?? 0,
        })
        .eq('termino', term)
      if (updateError) console.error('track-search update error:', updateError)
    } else {
      // New term → insert
      const { error: insertError } = await supabase
        .from('busquedas')
        .insert({
          termino: term,
          cantidad: 1,
          ultima_busqueda: new Date().toISOString(),
          resultados: resultados ?? 0,
        })
      if (insertError) console.error('track-search insert error:', insertError)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('track-search exception:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
