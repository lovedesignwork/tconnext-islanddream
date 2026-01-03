import Stripe from 'stripe'

const STRIPE_API_VERSION = '2024-11-20.acacia' as const

/**
 * Create a Stripe instance with a company's secret key
 * Used for processing payments with company-specific credentials
 */
export function createStripeClient(secretKey: string): Stripe {
  if (!secretKey) {
    throw new Error('Stripe secret key is required')
  }
  
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  })
}

/**
 * Validate Stripe key format
 */
export function validateStripeKeyFormat(key: string, type: 'public' | 'secret' | 'webhook'): boolean {
  if (!key) return false
  switch (type) {
    case 'public':
      return key.startsWith('pk_test_') || key.startsWith('pk_live_')
    case 'secret':
      return key.startsWith('sk_test_') || key.startsWith('sk_live_')
    case 'webhook':
      return key.startsWith('whsec_')
    default:
      return false
  }
}

/**
 * Check if a key is a test mode key
 */
export function isTestModeKey(key: string): boolean {
  return key.includes('_test_')
}

/**
 * Validate Stripe keys by making a test API call
 */
export async function validateStripeKeys(secretKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!validateStripeKeyFormat(secretKey, 'secret')) {
      return { valid: false, error: 'Invalid secret key format' }
    }

    const stripe = createStripeClient(secretKey)
    
    // Try to retrieve account info - this validates the key
    await stripe.balance.retrieve()
    
    return { valid: true }
  } catch (error: any) {
    if (error.type === 'StripeAuthenticationError') {
      return { valid: false, error: 'Invalid API key' }
    }
    return { valid: false, error: error.message || 'Failed to validate key' }
  }
}

/**
 * Create a payment intent using company's Stripe credentials
 */
export async function createPaymentIntent(
  secretKey: string,
  amount: number, // Amount in smallest currency unit (satang for THB)
  currency: string,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = createStripeClient(secretKey)
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata,
  })

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  }
}

/**
 * Retrieve a payment intent using company's credentials
 */
export async function retrievePaymentIntent(
  secretKey: string,
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = createStripeClient(secretKey)
  return stripe.paymentIntents.retrieve(paymentIntentId)
}

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(
  secretKey: string,
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = createStripeClient(secretKey)
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Format amount for display (convert from smallest unit to main unit)
 */
export function formatStripeAmount(amount: number, currency: string): string {
  // Most currencies use 2 decimal places
  const divisor = currency.toLowerCase() === 'jpy' ? 1 : 100
  return (amount / divisor).toFixed(2)
}

/**
 * Convert amount to smallest currency unit for Stripe
 */
export function toStripeAmount(amount: number, currency: string): number {
  // Most currencies use 2 decimal places
  const multiplier = currency.toLowerCase() === 'jpy' ? 1 : 100
  return Math.round(amount * multiplier)
}

/**
 * Interface for company Stripe settings
 */
export interface CompanyStripeSettings {
  public_key?: string
  secret_key?: string
  webhook_secret?: string
  test_mode?: boolean
}

/**
 * Check if company has valid Stripe configuration
 */
export function hasValidStripeConfig(settings: CompanyStripeSettings | undefined): boolean {
  if (!settings) return false
  return !!(settings.public_key && settings.secret_key)
}
