import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExchangeRateResponse {
  result: string
  time_last_update_utc: string
  time_next_update_utc: string
  base_code: string
  conversion_rates: {
    USD: number
    EUR: number
    GBP: number
    CAD: number
    BRL: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const exchangeRateApiKey = Deno.env.get('EXCHANGE_RATE_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking for cached exchange rates...')

    // Check if we have cached rates less than 1 hour old
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: cachedRates, error: cacheError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', 'USD')
      .gte('fetched_at', oneHourAgo)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cacheError) {
      console.error('Cache error:', cacheError)
    }

    // Return cached rates if available and fresh
    if (cachedRates && !cacheError) {
      console.log('Returning cached rates from:', cachedRates.fetched_at)
      return new Response(
        JSON.stringify({
          success: true,
          rates: cachedRates.rates,
          cached: true,
          fetched_at: cachedRates.fetched_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching fresh rates from ExchangeRate-API...')

    // Fetch fresh rates from ExchangeRate-API
    const apiUrl = `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/USD`
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`ExchangeRate-API returned ${response.status}`)
    }

    const data: ExchangeRateResponse = await response.json()

    if (data.result !== 'success') {
      throw new Error('ExchangeRate-API returned unsuccessful result')
    }

    // Extract only the currencies we need
    const rates = {
      USD: 1.0,
      EUR: data.conversion_rates.EUR,
      GBP: data.conversion_rates.GBP,
      CAD: data.conversion_rates.CAD,
      BRL: data.conversion_rates.BRL,
    }

    console.log('Fetched rates:', rates)

    // Store in database cache
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .insert({
        base_currency: 'USD',
        rates: rates,
        success: true,
        fetched_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to cache rates:', insertError)
    } else {
      console.log('Successfully cached new rates')
    }

    return new Response(
      JSON.stringify({
        success: true,
        rates: rates,
        cached: false,
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching exchange rates:', error)

    // Try to return last known rates from cache as fallback
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: fallbackRates } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('base_currency', 'USD')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackRates) {
        console.log('Returning fallback cached rates')
        return new Response(
          JSON.stringify({
            success: true,
            rates: fallbackRates.rates,
            cached: true,
            fallback: true,
            fetched_at: fallbackRates.fetched_at,
            warning: 'Using cached rates due to API error',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }

    // Last resort: return hardcoded fallback rates
    return new Response(
      JSON.stringify({
        success: false,
        rates: {
          USD: 1.0,
          EUR: 0.85,
          GBP: 0.73,
          CAD: 1.35,
          BRL: 4.95,
        },
        cached: false,
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        warning: 'Using hardcoded fallback rates',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
