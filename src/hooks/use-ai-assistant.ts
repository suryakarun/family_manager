import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AIEventSuggestion {
  title: string;
  description: string;
  suggestedTime: string;
}

interface UseAIAssistantReturn {
  getSuggestions: (context?: string) => Promise<AIEventSuggestion[]>;
  getAutoComplete: (partial: string) => Promise<string[]>;
  getSmartReminder: () => Promise<string>;
  loading: boolean;
  error: string | null;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAIFunction = async (type: string, context?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const { data, error: functionError } = await supabase.functions.invoke(
        "ai-event-assistant",
        {
          body: {
            userId: userData.user.id,
            context: context || "",
            type,
          },
        }
      );

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      return data;
    } catch (err: any) {
      console.error("AI Assistant error:", err);
      setError(err.message || "AI assistant failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async (context?: string): Promise<AIEventSuggestion[]> => {
    try {
      const data = await callAIFunction("suggestion", context);
      
      // Parse the suggestions from AI response
      const suggestions: AIEventSuggestion[] = [];
      const lines = data.suggestion.split("\n").filter((l: string) => l.trim());
      
      lines.forEach((line: string) => {
        // Parse format: "1. [Title] - [Description] - [Time]"
        const match = line.match(/\d+\.\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+)/);
        if (match) {
          suggestions.push({
            title: match[1].trim(),
            description: match[2].trim(),
            suggestedTime: match[3].trim(),
          });
        }
      });

      return suggestions;
    } catch (err) {
      return [];
    }
  };

  const getAutoComplete = async (partial: string): Promise<string[]> => {
    try {
      if (!partial || partial.length < 2) return [];

      const data = await callAIFunction("autocomplete", partial);
      
      // Parse suggestions (one per line)
      return data.suggestion
        .split("\n")
        .filter((l: string) => l.trim())
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
        .slice(0, 3);
    } catch (err) {
      return [];
    }
  };

  const getSmartReminder = async (): Promise<string> => {
    try {
      const data = await callAIFunction("smart_reminder");
      return data.suggestion;
    } catch (err) {
      return "";
    }
  };

  return {
    getSuggestions,
    getAutoComplete,
    getSmartReminder,
    loading,
    error,
  };
};
