import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { birthData, productType, productId, purchaseId } = await req.json()

    if (!birthData || !productType || !productId) {
      throw new Error('Birth data, product type, and product ID are required')
    }

    // Generate astrology reading based on product type
    const readingContent = await generateReading(birthData, productType)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header is required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabase.auth.getUser(token)

    if (!user.user) {
      throw new Error('Invalid user token')
    }

    // Save reading to database
    const { data: reading, error } = await supabase
      .from('astrology_readings')
      .insert({
        user_id: user.user.id,
        birth_data_id: birthData.id,
        astrology_product_id: productId,
        reading_content: readingContent,
        reading_type: productType,
        is_purchased: !!purchaseId,
        purchase_id: purchaseId
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ reading, success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error generating astrology reading:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function generateReading(birthData: any, productType: string) {
  const astroApiKey = Deno.env.get('ASTRO_API_KEY')
  if (!astroApiKey) {
    throw new Error('ASTRO_API_KEY is not configured')
  }

  // Convert birth data to the format expected by the API
  const apiData = {
    day: parseInt(birthData.birth_date.split('-')[2]),
    month: parseInt(birthData.birth_date.split('-')[1]),
    year: parseInt(birthData.birth_date.split('-')[0]),
    hour: parseInt(birthData.birth_time.split(':')[0]),
    min: parseInt(birthData.birth_time.split(':')[1]),
    lat: parseFloat(birthData.latitude),
    lon: parseFloat(birthData.longitude),
    tzone: parseFloat(birthData.timezone.replace('UTC', '').replace('+', ''))
  }

  // Generate reading based on product type
  switch (productType) {
    case 'natal_chart_reading':
      return await generateNatalChartReading(apiData, astroApiKey)
    case 'solar_return_reading':
      return await generateSolarReturnReading(apiData, astroApiKey)
    case 'north_node_reading':
      return await generateNorthNodeReading(apiData, astroApiKey)
    case 'career_path_reading':
      return await generateCareerPathReading(apiData, astroApiKey)
    default:
      throw new Error(`Unsupported product type: ${productType}`)
  }
}

async function generateNatalChartReading(apiData: any, apiKey: string) {
  // Get natal chart data
  const response = await fetch('https://json.astrologyapi.com/v1/birth_details', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiData)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Generate comprehensive natal chart reading
  return {
    title: "Your Natal Chart Reading",
    birth_info: data,
    sections: {
      sun_sign: {
        title: "Sun Sign Analysis",
        content: generateSunSignAnalysis(data)
      },
      moon_sign: {
        title: "Moon Sign Insights",
        content: generateMoonSignAnalysis(data)
      },
      rising_sign: {
        title: "Rising Sign Influence",
        content: generateRisingSignAnalysis(data)
      },
      planetary_positions: {
        title: "Planetary Positions",
        content: generatePlanetaryAnalysis(data)
      },
      houses: {
        title: "House Analysis",
        content: generateHouseAnalysis(data)
      }
    },
    summary: generateNatalSummary(data)
  }
}

async function generateSolarReturnReading(apiData: any, apiKey: string) {
  // For solar return, we need to calculate for the current year
  const currentYear = new Date().getFullYear()
  const solarReturnData = { ...apiData, year: currentYear }

  const response = await fetch('https://json.astrologyapi.com/v1/birth_details', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(solarReturnData)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  return {
    title: `Your ${currentYear} Solar Return Reading`,
    year: currentYear,
    birth_info: data,
    sections: {
      yearly_overview: {
        title: "Year Ahead Overview",
        content: generateYearlyOverview(data)
      },
      key_themes: {
        title: "Key Themes for This Year",
        content: generateKeyThemes(data)
      },
      opportunities: {
        title: "Opportunities & Challenges",
        content: generateOpportunities(data)
      },
      monthly_forecast: {
        title: "Monthly Highlights",
        content: generateMonthlyForecast(data)
      }
    },
    summary: generateSolarReturnSummary(data)
  }
}

async function generateNorthNodeReading(apiData: any, apiKey: string) {
  const response = await fetch('https://json.astrologyapi.com/v1/birth_details', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiData)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  return {
    title: "Your North Node Life Purpose Reading",
    birth_info: data,
    sections: {
      life_purpose: {
        title: "Your Soul's Purpose",
        content: generateLifePurpose(data)
      },
      karmic_lessons: {
        title: "Karmic Lessons",
        content: generateKarmicLessons(data)
      },
      growth_areas: {
        title: "Areas for Growth",
        content: generateGrowthAreas(data)
      },
      spiritual_path: {
        title: "Your Spiritual Path",
        content: generateSpiritualPath(data)
      }
    },
    summary: generateNorthNodeSummary(data)
  }
}

async function generateCareerPathReading(apiData: any, apiKey: string) {
  const response = await fetch('https://json.astrologyapi.com/v1/birth_details', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiData)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  return {
    title: "Your Career Path Reading",
    birth_info: data,
    sections: {
      career_potential: {
        title: "Career Potential",
        content: generateCareerPotential(data)
      },
      ideal_professions: {
        title: "Ideal Professions",
        content: generateIdealProfessions(data)
      },
      work_environment: {
        title: "Ideal Work Environment",
        content: generateWorkEnvironment(data)
      },
      success_factors: {
        title: "Keys to Success",
        content: generateSuccessFactors(data)
      },
      timing: {
        title: "Career Timing",
        content: generateCareerTiming(data)
      }
    },
    summary: generateCareerSummary(data)
  }
}

// Helper functions for generating content
function generateSunSignAnalysis(data: any): string {
  return `Based on your birth details, your Sun sign reveals your core personality and life force. This analysis provides insights into your fundamental nature and how you express yourself in the world.`
}

function generateMoonSignAnalysis(data: any): string {
  return `Your Moon sign governs your emotional nature, subconscious patterns, and inner needs. This section explores your emotional responses and what brings you comfort and security.`
}

function generateRisingSignAnalysis(data: any): string {
  return `Your Rising sign, also known as your Ascendant, represents how you present yourself to the world and your approach to new experiences. This influences your first impressions and outward behavior.`
}

function generatePlanetaryAnalysis(data: any): string {
  return `The positions of planets in your chart at birth create a unique cosmic blueprint. Each planet represents different aspects of your personality and life experiences.`
}

function generateHouseAnalysis(data: any): string {
  return `The twelve houses in your chart represent different life areas and experiences. This analysis reveals where your planetary energies are most likely to manifest.`
}

function generateNatalSummary(data: any): string {
  return `Your natal chart reveals a unique cosmic blueprint that influences your personality, relationships, and life path. Key themes include your natural talents, potential challenges, and areas for personal growth.`
}

function generateYearlyOverview(data: any): string {
  return `This year brings opportunities for growth and transformation. Your solar return chart indicates the main themes and energies that will be prominent in the year ahead.`
}

function generateKeyThemes(data: any): string {
  return `The key themes for this year include personal development, relationship dynamics, and career opportunities. These themes will weave throughout your experiences in the coming months.`
}

function generateOpportunities(data: any): string {
  return `This year presents several opportunities for advancement and growth, along with some challenges that will help you develop resilience and wisdom.`
}

function generateMonthlyForecast(data: any): string {
  return `Each month brings its own energy and focus. Here are the key highlights and areas of attention for the months ahead.`
}

function generateSolarReturnSummary(data: any): string {
  return `Your solar return reading reveals the major themes and opportunities for this year. Focus on personal growth and be open to new experiences that align with your highest potential.`
}

function generateLifePurpose(data: any): string {
  return `Your North Node reveals your soul's intended direction in this lifetime. This is your path of greatest growth and spiritual evolution.`
}

function generateKarmicLessons(data: any): string {
  return `Your South Node represents past-life talents and tendencies that you're meant to balance and evolve beyond. These karmic lessons guide your spiritual development.`
}

function generateGrowthAreas(data: any): string {
  return `The key areas for your personal and spiritual growth are highlighted by your North Node placement. Focus on developing these qualities for fulfillment.`
}

function generateSpiritualPath(data: any): string {
  return `Your spiritual path is unique and aligned with your soul's purpose. This section provides guidance on how to honor your spiritual calling.`
}

function generateNorthNodeSummary(data: any): string {
  return `Your North Node reading reveals your soul's purpose and the qualities you're meant to develop in this lifetime. Embrace these lessons for spiritual growth and fulfillment.`
}

function generateCareerPotential(data: any): string {
  return `Your birth chart reveals natural talents and abilities that can be channeled into fulfilling career paths. Your unique combination of planetary placements suggests specific areas of professional strength.`
}

function generateIdealProfessions(data: any): string {
  return `Based on your astrological profile, certain professions align naturally with your skills and temperament. Consider careers that allow you to utilize your innate abilities.`
}

function generateWorkEnvironment(data: any): string {
  return `Your chart indicates the type of work environment where you'll thrive. This includes team dynamics, leadership styles, and organizational structures that support your success.`
}

function generateSuccessFactors(data: any): string {
  return `The keys to your professional success are written in your stars. Focus on these strengths and approaches to achieve your career goals.`
}

function generateCareerTiming(data: any): string {
  return `Timing is crucial in career development. Your chart reveals optimal periods for career changes, promotions, and new ventures.`
}

function generateCareerSummary(data: any): string {
  return `Your career path reading provides insights into your professional potential and ideal work environment. Use this guidance to make informed decisions about your career direction.`
}