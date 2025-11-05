import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { AISuggestion } from '../types/ai-assistant';

/* eslint-disable @typescript-eslint/no-explicit-any */

type DBSuggestionRow = {
  id: string;
  conversation_id?: string | null;
  family_id?: string | null;
  suggestion_text?: string | null;
  suggestion_type?: string | null;
  status?: string | null;
  related_event_id?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
};

export const useSmartSuggestions = (familyId: string, conversationId?: string) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  // Fetch suggestions from database
  const fetchSuggestions = useCallback(async () => {
    if (!familyId) return;

    try {
      setIsLoading(true);
      setError(undefined);

      // Cast to any to avoid deep generic/type-instantiation issues with the project's
      // generated Supabase types for tables that may not be present in the client's type map.
      let query = (supabase as any)
        .from('ai_suggestions')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Optionally filter by conversation
      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to match AISuggestion type
      const transformedSuggestions: AISuggestion[] = (data || []).map((suggestion: DBSuggestionRow) => ({
        id: suggestion.id,
        conversation_id: suggestion.conversation_id ?? undefined,
        family_id: suggestion.family_id ?? undefined,
        suggestion_text: suggestion.suggestion_text ?? '',
        suggestion_type: String(suggestion.suggestion_type ?? 'general'),
        status: String(suggestion.status ?? 'pending'),
        related_event_id: suggestion.related_event_id ?? undefined,
        priority: determinePriority(suggestion.suggestion_type ?? ''),
        created_at: suggestion.created_at ? new Date(suggestion.created_at) : new Date(),
        expires_at: suggestion.expires_at ? new Date(suggestion.expires_at) : new Date(Date.now() + 1000 * 60 * 60),
      }));

      setSuggestions(transformedSuggestions);
    } catch (err: unknown) {
      console.error('Error fetching suggestions:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [familyId, conversationId]);

  // Determine priority based on suggestion type
  const determinePriority = (type: string): 'low' | 'medium' | 'high' => {
    switch (type) {
      case 'conflict_resolution':
        return 'high';
      case 'reminder_addition':
      case 'time_optimization':
        return 'medium';
      default:
        return 'low';
    }
  };

  // Accept a suggestion
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    try {
      setIsLoading(true);

      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      // Update suggestion status
      const { error: updateError } = await (supabase as any)
        .from('ai_suggestions')
        .update({
          status: 'accepted',
        })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      // Apply suggestion action if there's action_data
      // This would be implemented based on your specific needs
      // For example: adding a reminder, updating an event, etc.

      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (err: unknown) {
      console.error('Error accepting suggestion:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [suggestions]);

  // Reject a suggestion
  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('ai_suggestions')
        .update({
          status: 'rejected',
        })
        .eq('id', suggestionId);

      if (error) throw error;

      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (err: unknown) {
      console.error('Error rejecting suggestion:', err);
      setError(getErrorMessage(err));
    }
  }, []);

  // Refresh suggestions manually
  const refreshSuggestions = useCallback(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Auto-expire old suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestions(prev => 
        prev.filter(s => new Date(s.expires_at) > new Date())
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Subscribe to suggestion changes
  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel('ai_suggestions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_suggestions',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions,
  };
};
