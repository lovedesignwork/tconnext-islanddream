import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Admin client to bypass RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

/**
 * GET /api/debug/test-booking
 * Test creating a booking to see what errors occur
 */
export async function GET(request: NextRequest) {
  console.log('[Debug] ========== TEST BOOKING ==========')
  
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {}
  }
  
  try {
    const supabase = getAdminClient()
    
    // Test 1: Get columns in bookings table
    console.log('[Debug] Test 1: Getting bookings table columns...')
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'bookings' })
    
    if (colError) {
      // RPC might not exist, try a different approach
      const { data: sampleBooking, error: sampleError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1)
        .maybeSingle()
        
      if (sampleError) {
        results.tests.columns = { error: sampleError.message }
      } else if (sampleBooking) {
        results.tests.columns = { 
          success: true, 
          columns: Object.keys(sampleBooking) 
        }
      } else {
        results.tests.columns = { note: 'No bookings found to inspect' }
      }
    } else {
      results.tests.columns = { success: true, columns }
    }
    
    // Test 2: Get a company
    console.log('[Debug] Test 2: Getting company...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, initials, booking_sequence')
      .limit(1)
      .single()
      
    if (companyError) {
      results.tests.company = { error: companyError.message }
    } else {
      results.tests.company = { success: true, company }
    }
    
    // Test 3: Get a program
    console.log('[Debug] Test 3: Getting program...')
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, name, status')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      
    if (programError) {
      results.tests.program = { error: programError.message }
    } else if (program) {
      results.tests.program = { success: true, program }
    } else {
      results.tests.program = { note: 'No active programs found' }
    }
    
    // Test 4: Try to create a test booking
    if (company && program) {
      console.log('[Debug] Test 4: Testing booking insert...')
      
      const testBookingData: Record<string, any> = {
        company_id: company.id,
        booking_number: `TEST-${Date.now()}`,
        activity_date: '2025-12-30',
        program_id: program.id,
        customer_name: 'Debug Test',
        customer_email: 'debug@test.com',
        adults: 1,
        children: 0,
        infants: 0,
        status: 'confirmed',
        payment_type: 'regular', // valid values: regular, foc, insp
        is_direct_booking: true,
        is_come_direct: false,
        collect_money: 0,
      }
      
      // Try with stripe_payment_intent_id
      testBookingData.stripe_payment_intent_id = `pi_test_${Date.now()}`
      
      console.log('[Debug] Attempting insert with data:', JSON.stringify(testBookingData, null, 2))
      
      const { data: testBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(testBookingData)
        .select('id, booking_number')
        .single()
        
      if (insertError) {
        console.log('[Debug] Insert failed:', insertError)
        results.tests.insert = { 
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        }
        
        // Try without stripe_payment_intent_id
        delete testBookingData.stripe_payment_intent_id
        
        const { data: retryBooking, error: retryError } = await supabase
          .from('bookings')
          .insert(testBookingData)
          .select('id, booking_number')
          .single()
          
        if (retryError) {
          results.tests.insertWithoutStripeId = { 
            error: retryError.message,
            code: retryError.code,
            details: retryError.details,
            hint: retryError.hint
          }
        } else {
          results.tests.insertWithoutStripeId = { 
            success: true, 
            booking_id: retryBooking.id,
            note: 'Insert succeeded WITHOUT stripe_payment_intent_id'
          }
          
          // Clean up
          await supabase.from('bookings').delete().eq('id', retryBooking.id)
        }
      } else {
        results.tests.insert = { 
          success: true, 
          booking_id: testBooking.id,
          booking_number: testBooking.booking_number
        }
        
        // Clean up
        await supabase.from('bookings').delete().eq('id', testBooking.id)
        results.tests.cleanup = { success: true }
      }
    }
    
    // Test 5: Check stripe_payment_intent_id column
    console.log('[Debug] Test 5: Checking stripe_payment_intent_id column...')
    const { data: stripeColCheck, error: stripeColError } = await supabase
      .from('bookings')
      .select('stripe_payment_intent_id')
      .limit(1)
      .maybeSingle()
      
    if (stripeColError) {
      results.tests.stripeColumn = { 
        error: stripeColError.message,
        exists: false 
      }
    } else {
      results.tests.stripeColumn = { exists: true }
    }
    
    console.log('[Debug] ========== TEST COMPLETE ==========')
    console.log('[Debug] Results:', JSON.stringify(results, null, 2))
    
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('[Debug] Unhandled error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

