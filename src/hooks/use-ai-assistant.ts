import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface AISuggestion {
  title: string;
  description: string;
  suggestedTime?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  event_preview?: any;
  suggestions?: string[];
}

export interface UseAIAssistantReturn {
  getSuggestions: (context: string) => Promise<AISuggestion[]>;
  loading: boolean;
  error: string | null;
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (message: string) => Promise<void>;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const getSuggestions = async (context: string): Promise<AISuggestion[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      // Use Gemini API directly
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log('API Key available:', !!apiKey); // Will log true/false without exposing the key
      
      if (!apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful family calendar assistant. Provide 3 event suggestions based on this input: ${context}`
            }]
          }],
          safetySettings: [{
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }
      const suggestions = data.candidates[0].content.parts[0].text
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          title: line,
          description: line,
          suggestedTime: new Date().toISOString()
        }));

      return suggestions;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("AI Assistant error:", message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string): Promise<void> => {
    setIsTyping(true);
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      // Get user's family ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', userData.user.id)
        .single();

      if (profileError) throw new Error("Failed to get family ID");
      if (!profileData?.family_id) throw new Error("No family ID found");

      // Use Gemini API directly
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful family calendar assistant. Help with this request: ${message}`
            }]
          }],
          safetySettings: [{
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }

      const aiResponse = {
        success: true,
        response: data.candidates[0].content.parts[0].text,
        event: null,
        suggestions: []
      };

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: data.response || "I'm not sure how to help with that.",
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        event_preview: data.event,
        suggestions: data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("AI Assistant error:", message);
    } finally {
      setIsTyping(false);
    }
  };

  return {
    getSuggestions,
    loading,
    error,
    messages,
    isTyping,
    sendMessage
  };
};