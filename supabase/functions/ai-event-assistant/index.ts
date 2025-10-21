// If running in Node.js, use Express instead of Deno's serve
import express from "express";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventPattern {
  title: string;
  description: string;
  day_of_week: number;
  hour: number;
  frequency: number;
}

const app = express();
app.use(express.json());

app.options("*", (req, res) => {
  res.set(corsHeaders);
  res.send("ok");
});

app.post("/", async (req, res) => {
  try {
    const { userId, context, type } = req.body;

    // Create Supabase client
    let supabaseUrl: string | undefined;
    let supabaseKey: string | undefined;
    if (typeof process !== "undefined" && process.env) {
      supabaseUrl = process.env.SUPABASE_URL;
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    const supabaseClient = createClient(
      supabaseUrl ?? "",
      supabaseKey ?? ""
    );

    // Get user's event history
    const { data: events, error: eventsError } = await supabaseClient
      .from("events")
      .select("title, description, start_time, end_time, all_day")
      .eq("created_by", userId)
      .order("start_time", { ascending: false })
      .limit(50);

    if (eventsError) throw eventsError;

    // Analyze patterns
    const patterns = analyzeEventPatterns(events || []);

    // Get OpenAI API key
    let openaiKey: string | undefined;
    if (typeof process !== "undefined" && process.env) {
      openaiKey = process.env.OPENAI_API_KEY;
    }
    if (!openaiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Build AI prompt based on type
    let prompt = "";
    
    if (type === "suggestion") {
      prompt = buildSuggestionPrompt(patterns, context);
    } else if (type === "autocomplete") {
      prompt = buildAutocompletePrompt(patterns, context);
    } else if (type === "smart_reminder") {
      prompt = buildSmartReminderPrompt(patterns);
    }

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful family calendar assistant. Provide concise, practical suggestions for family events and activities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const aiData = await openaiResponse.json();
    const suggestion = aiData.choices[0]?.message?.content || "";

    res.status(200).set({ ...corsHeaders, "Content-Type": "application/json" }).json({
      suggestion,
      patterns,
      success: true,
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(400).set({ ...corsHeaders, "Content-Type": "application/json" }).json({
      error: error instanceof Error ? error.message : String(error),
      success: false,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
interface Event {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
}

function analyzeEventPatterns(events: Event[]): EventPattern[] {
  const patternMap = new Map<string, EventPattern>();

  events.forEach((event) => {
    const date = new Date(event.start_time);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const title = event.title.toLowerCase();

    const key = `${title}-${dayOfWeek}-${hour}`;
    
    if (patternMap.has(key)) {
      const pattern = patternMap.get(key)!;
      pattern.frequency += 1;
    } else {
      patternMap.set(key, {
        title: event.title,
        description: event.description || "",
        day_of_week: dayOfWeek,
        hour: hour,
        frequency: 1,
      });
    }
  });

  return Array.from(patternMap.values())
    .filter(p => p.frequency >= 2) // Only patterns that repeat
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5); // Top 5 patterns
}

function buildSuggestionPrompt(patterns: EventPattern[], context: string): string {
  const patternText = patterns.length > 0
    ? patterns.map(p => 
        `- "${p.title}" on ${getDayName(p.day_of_week)}s at ${formatHour(p.hour)} (${p.frequency} times)`
      ).join("\n")
    : "No recurring patterns found yet.";

  return `Based on this family's calendar patterns:
${patternText}

Current context: ${context || "User is creating a new event"}

Provide 3 smart event suggestions in this exact format:
1. [Event Title] - [Brief description] - [Suggested day/time]
2. [Event Title] - [Brief description] - [Suggested day/time]
3. [Event Title] - [Brief description] - [Suggested day/time]

Make suggestions practical, family-friendly, and based on their patterns.`;
}

function buildAutocompletePrompt(patterns: EventPattern[], context: string): string {
  const patternText = patterns.length > 0
    ? patterns.map(p => `"${p.title}"`).join(", ")
    : "No patterns yet";

  return `User is typing: "${context}"

Their common events: ${patternText}

Complete their event title with 3 suggestions (one per line, just the title):`;
}

function buildSmartReminderPrompt(patterns: EventPattern[]): string {
  if (patterns.length === 0) {
    return "Suggest 1 new family activity they might want to add to their calendar.";
  }

  const topPattern = patterns[0];
  return `This family usually has "${topPattern.title}" on ${getDayName(topPattern.day_of_week)}s at ${formatHour(topPattern.hour)}.

Write a friendly, casual WhatsApp-style message suggesting they schedule it again. Keep it under 100 characters.`;
}

function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}
