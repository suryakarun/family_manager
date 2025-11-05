import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { EventConflict, ConflictResolution } from '../types/ai-assistant';

// Helper types for DB rows
type DBEvent = {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  location?: string | null;
};

type DBConflictRow = {
  id: string;
  family_id?: string;
  event_id_1?: string;
  event_id_2?: string;
  conflict_description?: string;
  conflict_time?: string | null;
  event_1?: DBEvent | null;
  event_2?: DBEvent | null;
  resolution_status?: string;
  created_at?: string;
  resolved_at?: string | null;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
};

export const useConflictDetection = (familyId: string) => {
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  // Fetch conflicts from database
  const fetchConflicts = useCallback(async () => {
    if (!familyId) return;

    try {
      setIsLoading(true);
      setError(undefined);

      const { data, error: fetchError } = await supabase
        .from('event_conflicts')
        .select(`
          *,
          event_1:events!event_conflicts_event_id_1_fkey(id, title, start_time, end_time, location),
          event_2:events!event_conflicts_event_id_2_fkey(id, title, start_time, end_time, location)
        `)
        .eq('family_id', familyId)
        .eq('resolution_status', 'unresolved')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to match EventConflict type
      const transformedConflicts: EventConflict[] = (data || []).map((conflict: DBConflictRow) => ({
        id: conflict.id,
        family_id: conflict.family_id,
        event_id_1: conflict.event_id_1,
        event_id_2: conflict.event_id_2,
        conflict_description: conflict.conflict_description,
        conflict_time: conflict.conflict_time ? new Date(conflict.conflict_time) : undefined,
        event_1_details: conflict.event_1 ? {
          id: conflict.event_1.id,
          title: conflict.event_1.title,
          start_time: new Date(conflict.event_1.start_time),
          end_time: new Date(conflict.event_1.end_time),
          duration_minutes: Math.floor(
            (new Date(conflict.event_1.end_time).getTime() - new Date(conflict.event_1.start_time).getTime()) / 60000
          ),
          location: conflict.event_1.location,
        } : undefined,
        event_2_details: conflict.event_2 ? {
          id: conflict.event_2.id,
          title: conflict.event_2.title,
          start_time: new Date(conflict.event_2.start_time),
          end_time: new Date(conflict.event_2.end_time),
          duration_minutes: Math.floor(
            (new Date(conflict.event_2.end_time).getTime() - new Date(conflict.event_2.start_time).getTime()) / 60000
          ),
          location: conflict.event_2.location,
        } : undefined,
        resolution_status: conflict.resolution_status,
        created_at: new Date(conflict.created_at),
        resolved_at: conflict.resolved_at ? new Date(conflict.resolved_at) : undefined,
        suggested_resolutions: generateSuggestedResolutions(conflict),
      }));

      setConflicts(transformedConflicts);
    } catch (err: unknown) {
      console.error('Error fetching conflicts:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  // Generate suggested resolutions based on conflict
  const generateSuggestedResolutions = (conflict: DBConflictRow): ConflictResolution[] => {
    const resolutions: ConflictResolution[] = [];

    const event1 = conflict.event_1;
    const event2 = conflict.event_2;

    if (event1 && event2 && event1.start_time && event1.end_time && event2.start_time && event2.end_time) {
      // Suggest rescheduling the second event
      const event2End = new Date(event2.end_time);
      resolutions.push({
        type: 'reschedule',
        description: `Move "${event2.title ?? 'Event'}" to start after "${event1.title ?? 'Event'}" ends`,
        new_time: event2End,
        event_to_modify: event2.id,
      });

      // Suggest shortening the first event
      const event1Start = new Date(event1.start_time);
      const event2Start = new Date(event2.start_time);
      const newDuration = Math.floor((event2Start.getTime() - event1Start.getTime()) / 60000);

      if (newDuration > 15) {
        resolutions.push({
          type: 'shorten',
          description: `Shorten "${event1.title ?? 'Event'}" to end before "${event2.title ?? 'Event'}" starts`,
          new_duration: newDuration,
          event_to_modify: event1.id,
        });
      }
    }

    return resolutions;
  };

  // Check for conflicts (can be called manually)
  const checkConflicts = useCallback(async () => {
    await fetchConflicts();
  }, [fetchConflicts]);

  // Resolve a conflict
  const resolveConflict = useCallback(async (conflictId: string, resolution: ConflictResolution) => {
    try {
      setIsLoading(true);

      // Apply the resolution to the event
      if (resolution.type === 'reschedule' && resolution.new_time) {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            start_time: resolution.new_time.toISOString(),
          })
          .eq('id', resolution.event_to_modify);

        if (updateError) throw updateError;
      } else if (resolution.type === 'shorten' && resolution.new_duration) {
        // Get event start time
        const { data: event } = await supabase
          .from('events')
          .select('start_time')
          .eq('id', resolution.event_to_modify)
          .single();

        if (event) {
          const newEndTime = new Date(new Date(event.start_time).getTime() + resolution.new_duration * 60000);
          
          const { error: updateError } = await supabase
            .from('events')
            .update({
              end_time: newEndTime.toISOString(),
            })
            .eq('id', resolution.event_to_modify);

          if (updateError) throw updateError;
        }
      }

      // Mark conflict as resolved
      const { error: resolveError } = await supabase
        .from('event_conflicts')
        .update({
          resolution_status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (resolveError) throw resolveError;

      // Refresh conflicts
      await fetchConflicts();
    } catch (err: unknown) {
      console.error('Error resolving conflict:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [fetchConflicts]);

  // Ignore a conflict
  const ignoreConflict = useCallback(async (conflictId: string) => {
    try {
      const { error } = await supabase
        .from('event_conflicts')
        .update({
          resolution_status: 'ignored',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (error) throw error;

      // Remove from local state
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
    } catch (err: unknown) {
      console.error('Error ignoring conflict:', err);
      setError(getErrorMessage(err));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  // Subscribe to conflict changes
  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel('event_conflicts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_conflicts',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          fetchConflicts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, fetchConflicts]);

  return {
    conflicts,
    isLoading,
    error,
    checkConflicts,
    resolveConflict,
    ignoreConflict,
    refreshConflicts: fetchConflicts,
  };
};
