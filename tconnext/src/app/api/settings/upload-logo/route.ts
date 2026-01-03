import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Admin client to bypass RLS for storage operations
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BUCKET_NAME = 'company-assets'
const LOGO_FOLDER = 'company-logos'

// Logo filenames for each variant
const LOGO_FILENAMES = {
  light: 'logo.png',      // Light theme logo (default, used everywhere)
  dark: 'logo-dark.png',  // Dark theme logo (sidebar only)
}

// Settings keys for each variant
const SETTINGS_KEYS = {
  light: 'logo_url',
  dark: 'logo_url_dark',
}

type LogoVariant = 'light' | 'dark'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to get user profile
    const supabaseAdmin = getAdminClient()
    
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const variant = (formData.get('variant') as LogoVariant) || 'light'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate variant
    if (!['light', 'dark'].includes(variant)) {
      return NextResponse.json({ error: 'Invalid variant. Must be "light" or "dark"' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max size: 5MB' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get image metadata and validate dimensions
    let metadata
    try {
      metadata = await sharp(buffer).metadata()
    } catch (err) {
      return NextResponse.json({ error: 'Invalid image file' }, { status: 400 })
    }

    if (!metadata.width || metadata.width < 500) {
      return NextResponse.json({ 
        error: `Image width must be at least 500px. Your image is ${metadata.width || 0}px wide.` 
      }, { status: 400 })
    }

    // Convert to PNG for consistency
    const pngBuffer = await sharp(buffer)
      .png({ quality: 90 })
      .toBuffer()

    // Get the appropriate filename for the variant
    const logoFilename = LOGO_FILENAMES[variant]
    const logoPath = `${LOGO_FOLDER}/${profile.company_id}/${logoFilename}`

    // Upload to storage (upsert - replace if exists)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(logoPath, pngBuffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload logo: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(logoPath)

    // Add cache buster to URL to ensure new logo is displayed
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

    // Update company settings with logo URL
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('settings')
      .eq('id', profile.company_id)
      .single()

    const currentSettings = (company?.settings as Record<string, any>) || {}
    const settingsKey = SETTINGS_KEYS[variant]
    const updatedSettings = {
      ...currentSettings,
      [settingsKey]: publicUrl,
    }

    await supabaseAdmin
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', profile.company_id)

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      variant,
      width: metadata.width,
      height: metadata.height,
    })

  } catch (error) {
    console.error('Error processing logo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process logo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()
    
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 })
    }

    // Get variant from query params
    const { searchParams } = new URL(request.url)
    const variant = (searchParams.get('variant') as LogoVariant) || 'light'

    if (!['light', 'dark'].includes(variant)) {
      return NextResponse.json({ error: 'Invalid variant. Must be "light" or "dark"' }, { status: 400 })
    }

    // Delete logo from storage
    const logoFilename = LOGO_FILENAMES[variant]
    const logoPath = `${LOGO_FOLDER}/${profile.company_id}/${logoFilename}`
    
    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([logoPath])

    if (deleteError) {
      console.error('Storage delete error:', deleteError)
      // Continue even if delete fails - file might not exist
    }

    // Remove logo URL from company settings
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('settings')
      .eq('id', profile.company_id)
      .single()

    const currentSettings = (company?.settings as Record<string, any>) || {}
    const settingsKey = SETTINGS_KEYS[variant]
    const { [settingsKey]: removed, ...restSettings } = currentSettings
    
    await supabaseAdmin
      .from('companies')
      .update({ settings: restSettings })
      .eq('id', profile.company_id)

    return NextResponse.json({ success: true, variant })

  } catch (error) {
    console.error('Error deleting logo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete logo' },
      { status: 500 }
    )
  }
}
