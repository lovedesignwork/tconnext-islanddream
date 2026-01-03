import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Admin client to bypass RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const programId = formData.get('programId') as string

    if (!file || !programId) {
      return NextResponse.json(
        { error: 'File and program ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminClient()

    // Get program to check current brochure count
    const { data: program, error: programError } = await supabaseAdmin
      .from('programs')
      .select('brochure_images, company_id')
      .eq('id', programId)
      .single()

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const currentImages = program.brochure_images || []
    if (currentImages.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 brochure images allowed' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const fileName = `program-brochures/${program.company_id}/${programId}/${timestamp}-${randomId}.${ext}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage (using company-assets bucket)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('company-assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('company-assets')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    // Update program with new brochure image
    const updatedImages = [...currentImages, imageUrl]
    const { error: updateError } = await supabaseAdmin
      .from('programs')
      .update({ brochure_images: updatedImages })
      .eq('id', programId)

    if (updateError) {
      // Try to delete uploaded file if update fails
      await supabaseAdmin.storage.from('company-assets').remove([fileName])
      return NextResponse.json(
        { error: 'Failed to update program' },
        { status: 500 }
      )
    }

    return NextResponse.json({ imageUrl, brochure_images: updatedImages })
  } catch (error: any) {
    console.error('Brochure upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload brochure' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { programId, imageUrl } = await request.json()

    if (!programId || !imageUrl) {
      return NextResponse.json(
        { error: 'Program ID and image URL are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminClient()

    // Get program
    const { data: program, error: programError } = await supabaseAdmin
      .from('programs')
      .select('brochure_images')
      .eq('id', programId)
      .single()

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const currentImages = program.brochure_images || []
    const updatedImages = currentImages.filter((url: string) => url !== imageUrl)

    // Update program
    const { error: updateError } = await supabaseAdmin
      .from('programs')
      .update({ brochure_images: updatedImages.length > 0 ? updatedImages : null })
      .eq('id', programId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update program' },
        { status: 500 }
      )
    }

    // Try to delete file from storage (extract path from URL)
    try {
      const urlParts = imageUrl.split('/company-assets/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabaseAdmin.storage.from('company-assets').remove([filePath])
      }
    } catch (e) {
      console.error('Failed to delete file from storage:', e)
      // Continue anyway - file may not exist
    }

    return NextResponse.json({ brochure_images: updatedImages })
  } catch (error: any) {
    console.error('Brochure delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete brochure' },
      { status: 500 }
    )
  }
}

