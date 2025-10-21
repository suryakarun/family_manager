import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventTitle, eventDate, duration, destination, currentLocation, transportMode, description } = await req.json();
    console.log("Received request payload:", { eventTitle, eventDate, duration, destination, currentLocation, transportMode, description });

    // Get API key
    let GEMINI_API_KEY = "";
    try {
      GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
      console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? "Present" : "Missing");
    } catch (e) {
      console.error("Deno.env.get failed:", e);
      GEMINI_API_KEY = "";
    }

    // Return mock data if API key is missing
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY missing, returning mock travel plan.");
      return new Response(JSON.stringify({
        itinerary: {
          summary: "Mock plan: No AI available. This is a fallback response.",
          timeline: [
            {
              time: `${eventDate} 06:00 AM`,
              description: `Depart from ${currentLocation}`,
            },
            {
              time: `${eventDate} 10:30 AM`,
              description: `Arrive at ${destination}`,
            },
            {
              time: `${eventDate} 03:00 PM`,
              description: `Attend ${eventTitle}`,
            },
          ],
        },
        transportOptions: [
          {
            mode: transportMode,
            name: "Chennai Express",
            number: "12163",
            operator: "Indian Railways",
            departureTime: `${eventDate} 06:15 AM`,
            arrivalTime: `${eventDate} 10:45 AM`,
            duration: "4h 30m",
            price: "₹850"
          },
          {
            mode: transportMode,
            name: "Brindavan Express",
            number: "12639",
            operator: "Indian Railways",
            departureTime: `${eventDate} 07:00 AM`,
            arrivalTime: `${eventDate} 11:30 AM`,
            duration: "4h 30m",
            price: "₹750"
          }
        ],
        conflicts: [],
        suggestions: [
          {
            title: "Marina Beach",
            description: "Visit India's longest urban beach. Perfect for evening walks, local street food, and watching the sunset over the Bay of Bengal.",
            duration: "2-3h"
          },
          {
            title: "Fort St. George",
            description: "Explore the historic British fort, now a museum showcasing colonial-era artifacts and the legislative assembly.",
            duration: "1-2h"
          },
          {
            title: "Kapaleeshwarar Temple",
            description: "Experience the stunning Dravidian architecture of this ancient Hindu temple dedicated to Lord Shiva.",
            duration: "1h"
          }
        ],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare AI prompt with detailed instructions
    const prompt = `You are an expert Indian travel planner AI. Create a comprehensive travel plan in JSON format for travel within India.

EVENT DETAILS:
- Event: ${eventTitle}
- Date: ${eventDate}
- Duration: ${duration} days
- From: ${currentLocation}
- To: ${destination}
- Preferred Transport: ${transportMode}
${description ? `- Additional Requirements: ${description}` : ""}

IMPORTANT INSTRUCTIONS:
1. Use realistic Indian transport services (Indian Railways trains, state transport buses, airlines like IndiGo/Air India)
2. Include SPECIFIC train/bus/flight names and numbers
3. Use realistic timings based on typical journey duration between cities
4. Price estimates in Indian Rupees (₹)
5. Suggest actual tourist attractions at the destination
6. Format dates as "YYYY-MM-DD HH:MM AM/PM"

Return ONLY valid JSON with this EXACT structure (no markdown, no explanation):
{
  "itinerary": {
    "summary": "Brief 2-3 sentence overview of the trip",
    "timeline": [
      {"time": "${eventDate} 06:00 AM", "description": "Leave home and head to station"},
      {"time": "${eventDate} 07:30 AM", "description": "Board transport"},
      {"time": "${eventDate} 12:00 PM", "description": "Arrive at destination"}
    ]
  },
  "transportOptions": [
    {
      "mode": "${transportMode}",
      "name": "Specific Service Name (e.g., Rajdhani Express, Shatabdi Express)",
      "number": "Service Number (e.g., 12301, 12002)",
      "operator": "Indian Railways / State Transport / Airline Name",
      "departureTime": "${eventDate} 07:30 AM",
      "arrivalTime": "${eventDate} 12:15 PM",
      "duration": "4h 45m",
      "price": "₹850"
    }
  ],
  "conflicts": [],
  "suggestions": [
    {
      "title": "Actual Tourist Attraction Name",
      "description": "Detailed description of what to see and do there (2-3 sentences)",
      "duration": "2-3h"
    }
  ]
}

Provide 2-3 transport options and 3-4 tourist suggestions. Be specific and realistic!`;

    // Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
    
    let resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        }),
      });
    } catch (fetchError) {
      console.error("Error calling Gemini API:", fetchError);
      throw new Error("Failed to call Gemini API: " + fetchError.message);
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Gemini API error: ${resp.status} - ${errorText}`);
      throw new Error(`Gemini API returned ${resp.status}`);
    }

    // Parse response
    const body = await resp.json();
    let text = "";
    
    if (body?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = body.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected Gemini response:", body);
      throw new Error("Invalid response from Gemini API");
    }

    // Extract JSON from response
    let travelPlan;
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      
      // Try to extract from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      // Remove any leading/trailing non-JSON characters
      jsonText = jsonText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      travelPlan = JSON.parse(jsonText);
      console.log("Successfully parsed travel plan");
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      console.error("Raw text:", text);
      
      // Fallback plan with more details
      travelPlan = {
        itinerary: {
          summary: `Unable to parse AI response. Here's a basic plan for traveling from ${currentLocation} to ${destination}.`,
          timeline: [
            {
              time: `${eventDate} 06:00 AM`,
              description: `Depart from ${currentLocation}`,
            },
            {
              time: `${eventDate} 02:00 PM`,
              description: `Arrive at ${destination} for ${eventTitle}`,
            }
          ],
        },
        transportOptions: [
          {
            mode: transportMode,
            name: "Standard Service",
            number: "TBD",
            operator: "Check local transport",
            departureTime: `${eventDate} 06:00 AM`,
            arrivalTime: `${eventDate} 02:00 PM`,
            duration: "8h",
            price: "₹500-1000"
          }
        ],
        conflicts: [],
        suggestions: [
          {
            title: "Local Attractions",
            description: "Explore popular tourist spots in the area. Check local tourism websites for recommendations.",
            duration: "2-4h"
          }
        ],
      };
    }

    return new Response(JSON.stringify(travelPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});