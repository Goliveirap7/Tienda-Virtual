import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const products = await request.json();

    if (!products) {
      return NextResponse.json({ error: 'Faltan datos de producto' }, { status: 400 });
    }

    // This creates a server-side Supabase client that reads the HttpOnly session cookie
    // Since the user is logged in, this request will be authenticated
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('productos')
      .insert(Array.isArray(products) ? products : [products])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
