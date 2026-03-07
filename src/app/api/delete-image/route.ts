import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json({ error: 'Public ID is required' }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    // Some cases it returns "not found" if already deleted but we still want to clear our DB
    if (result.result === 'ok' || result.result === 'not found') {
      return NextResponse.json({ success: true });
    } else {
      console.error("Cloudinary destruction result:", result);
      return NextResponse.json({ error: 'Error deleting from Cloudinary' }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Cloudinary error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
