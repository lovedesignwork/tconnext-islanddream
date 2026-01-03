import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Admin client to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Upload program thumbnail
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const programId = formData.get('programId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
    }

    // Verify the program belongs to this company
    const { data: program } = await supabaseAdmin
      .from('programs')
      .select('id, company_id')
      .eq('id', programId)
      .eq('company_id', userData.company_id)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or GIF' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Determine file extension
    const ext = file.type === 'image/jpeg' ? 'jpg' : 
                file.type === 'image/png' ? 'png' : 
                file.type === 'image/webp' ? 'webp' : 'gif'

    // Store in bucket: program-thumbnails/{company_id}/{program_id}.{ext}
    const filePath = `program-thumbnails/${userData.company_id}/${programId}.${ext}`

    // Delete old thumbnail if exists (could be different extension)
    const extensions = ['jpg', 'png', 'webp', 'gif']
    for (const oldExt of extensions) {
      if (oldExt !== ext) {
        await supabaseAdmin.storage
          .from('company-assets')
          .remove([`program-thumbnails/${userData.company_id}/${programId}.${oldExt}`])
      }
    }

    // Upload new thumbnail
    const { error: uploadError } = await supabaseAdmin.storage
      .from('company-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('company-assets')
      .getPublicUrl(filePath)

    const thumbnailUrl = urlData.publicUrl

    // Update program with new thumbnail URL
    const { error: updateError } = await supabaseAdmin
      .from('programs')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', programId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      thumbnail_url: thumbnailUrl 
    })

  } catch (error) {
    console.error('Upload thumbnail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove program thumbnail
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
    }

    const { programId } = await request.json()

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
    }

    // Get current thumbnail URL to determine file path
    const { data: program } = await supabaseAdmin
      .from('programs')
      .select('id, thumbnail_url')
      .eq('id', programId)
      .eq('company_id', userData.company_id)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Delete all possible thumbnail files
    const extensions = ['jpg', 'png', 'webp', 'gif']
    for (const ext of extensions) {
      await supabaseAdmin.storage
        .from('company-assets')
        .remove([`program-thumbnails/${userData.company_id}/${programId}.${ext}`])
    }

    // Clear thumbnail URL in program
    const { error: updateError } = await supabaseAdmin
      .from('programs')
      .update({ thumbnail_url: null })
      .eq('id', programId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete thumbnail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

