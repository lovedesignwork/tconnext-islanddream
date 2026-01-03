import { NextRequest, NextResponse } from 'next/server'
import { validateStripeKeys, validateStripeKeyFormat } from '@/lib/stripe'

interface ValidateKeysRequest {
  secret_key: string
}

/**
 * POST /api/stripe/keys/validate
 * Validates a Stripe secret key by making a test API call
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidateKeysRequest = await request.json()
    const { secret_key } = body

    if (!secret_key) {
      return NextResponse.json(
        { valid: false, error: 'Secret key is required' },
        { status: 400 }
      )
    }

    // Validate format first
    if (!validateStripeKeyFormat(secret_key, 'secret')) {
      return NextResponse.json(
        { valid: false, error: 'Invalid secret key format. Must start with sk_test_ or sk_live_' },
        { status: 400 }
      )
    }

    // Validate by making a test API call
    const result = await validateStripeKeys(secret_key)

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        message: 'Stripe key is valid and working',
        isTestMode: secret_key.includes('_test_'),
      })
    } else {
      return NextResponse.json(
        { valid: false, error: result.error || 'Invalid Stripe key' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Stripe key validation error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to validate key' },
      { status: 500 }
    )
  }
}
