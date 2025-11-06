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

      // Use HuggingFace API
      const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
      
      if (!apiKey) {
        throw new Error('HuggingFace API key not found in environment variables');
      }

      const response = await fetch('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          inputs: `As a family calendar assistant, suggest 3 events based on: ${context}`,
          parameters: {
            max_length: 200,
            temperature: 0.7,
            top_p: 0.95
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const data = await response.json();
      if (!data.generated_text) {
        throw new Error('Invalid response format from HuggingFace API');
      }
      const suggestions = data.generated_text
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

      // Use HuggingFace API
      const response = await fetch('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_HUGGINGFACE_API_KEY}`
        },
        body: JSON.stringify({
          inputs: `As a family calendar assistant: ${message}`,
          parameters: {
            max_length: 200,
            temperature: 0.7,
            top_p: 0.95
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to get AI response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.generated_text) {
        throw new Error('Invalid response format from HuggingFace API');
      }

      const aiResponse = {
        success: true,
        response: data.generated_text,
        event: null,
        suggestions: []
      };

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: data.generated_text || "I'm not sure how to help with that.",
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        event_preview: aiResponse.event,
        suggestions: aiResponse.suggestions
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