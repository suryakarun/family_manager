// AI Assistant Type Definitions
// Complete TypeScript types for AI calendar assistant

// ============================================================
// Core AI Types
// ============================================================

export type AIMode = 'chat' | 'voice';

export type AIResponseType = 'event' | 'chat' | 'suggestion' | 'conflict' | 'error';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: AIMode;
  timestamp: Date;
  metadata?: {
    audio_duration?: number;
    confidence?: number;
  };
}

export interface AIConversation {
  id: string;
  conversation_id: string;
  user_id: string;
  family_id: string;
  messages: AIMessage[];
  created_at: Date;
  updated_at: Date;
}

// ============================================================
// AI Request/Response Types
// ============================================================

export interface AIEventRequest {
  message: string;
  mode: AIMode;
  user_id: string;
  family_id: string;
  existing_events?: EventData[];
  conversation_id?: string;
}

export interface AIResponse {
  type: AIResponseType;
  message: string;
  event?: ParsedEvent;
  conflicts?: EventConflict[];
  suggestions?: string[];
  conversation_id: string;
  error?: string;
}

// ============================================================
// Event Parsing Types
// ============================================================

export interface ParsedEvent {
  title: string;
  description?: string;
  start_time?: string; // ISO format
  end_time?: string; // ISO format
  duration_minutes?: number;
  location?: string;
  recurrence?: RecurrenceType;
  day_of_week?: DayOfWeek;
  attendees?: EventAttendee[];
  reminders?: EventReminder[];
  driving_needed?: boolean;
  notes?: string;
  tags?: string[];
  color?: string;
}

export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface EventAttendee {
  name: string;
  role: 'participant' | 'driver' | 'organizer' | 'optional';
  user_id?: string;
  family_member_id?: string;
}

export interface EventReminder {
  method: 'email' | 'whatsapp' | 'sms' | 'notification';
  minutes_before: number;
  custom_message?: string;
}

// ============================================================
// Conflict Detection Types
// ============================================================

export interface EventConflict {
  id: string;
  family_id: string;
  event_id_1?: string;
  event_id_2?: string;
  conflict_description: string;
  conflict_time?: Date;
  event_1_details?: ConflictEventDetails;
  event_2_details?: ConflictEventDetails;
  resolution_status: ConflictResolutionStatus;
  suggested_resolutions?: ConflictResolution[];
  created_at: Date;
  resolved_at?: Date;
}

export interface ConflictEventDetails {
  id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  location?: string;
}

export type ConflictResolutionStatus = 'unresolved' | 'resolved' | 'ignored';

export interface ConflictResolution {
  type: 'reschedule' | 'shorten' | 'cancel' | 'merge';
  description: string;
  new_time?: Date;
  new_duration?: number;
  event_to_modify: string;
}

// ============================================================
// Smart Suggestions Types
// ============================================================

export interface AISuggestion {
  id: string;
  conversation_id: string;
  family_id: string;
  suggestion_text: string;
  suggestion_type: SuggestionType;
  status: SuggestionStatus;
  related_event_id?: string;
  priority?: 'low' | 'medium' | 'high';
  created_at: Date;
  expires_at: Date;
  action_data?: Record<string, any>;
}

export type SuggestionType = 
  | 'event_improvement'
  | 'conflict_resolution'
  | 'reminder_addition'
  | 'attendee_suggestion'
  | 'time_optimization'
  | 'wellness_break'
  | 'family_activity'
  | 'travel_planning';

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

// ============================================================
// Voice Input Types
// ============================================================

export interface VoiceRecording {
  id: string;
  audio_blob: Blob;
  duration: number;
  timestamp: Date;
  transcription?: string;
  confidence?: number;
}

export interface VoiceInputState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error?: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  language: string;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

// ============================================================
// Chat Interface Types
// ============================================================

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  mode: AIMode;
  event_preview?: ParsedEvent;
  suggestions?: string[];
  conflicts?: EventConflict[];
  status: 'sending' | 'sent' | 'error';
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  error?: string;
  conversation_id?: string;
}

// ============================================================
// Database Types (matches Supabase schema)
// ============================================================

export interface AIConversationDB {
  id: string;
  conversation_id: string;
  user_id: string;
  family_id: string;
  message: string;
  mode: AIMode;
  response: AIResponse;
  created_at: string;
}

export interface AISuggestionDB {
  id: string;
  conversation_id: string;
  family_id: string;
  suggestion_text: string;
  suggestion_type: string;
  status: SuggestionStatus;
  related_event_id?: string;
  created_at: string;
  expires_at: string;
}

export interface EventConflictDB {
  id: string;
  family_id: string;
  conversation_id?: string;
  event_id_1?: string;
  event_id_2?: string;
  conflict_description: string;
  conflict_time?: string;
  resolution_status: ConflictResolutionStatus;
  resolved_at?: string;
  created_at: string;
}

// ============================================================
// UI Component Props Types
// ============================================================

export interface AIAssistantProps {
  familyId: string;
  userId: string;
  onEventCreated?: (event: ParsedEvent) => void;
  onConflictDetected?: (conflicts: EventConflict[]) => void;
  defaultMode?: AIMode;
}

export interface VoiceInputProps {
  onRecordingComplete: (recording: VoiceRecording) => void;
  onTranscriptionReady?: (text: string) => void;
  maxDuration?: number;
  disabled?: boolean;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  conversationId?: string;
}

export interface ConflictDetectorProps {
  conflicts: EventConflict[];
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
  onIgnore: (conflictId: string) => void;
}

export interface SmartSuggestionsProps {
  suggestions: AISuggestion[];
  onAccept: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
  maxVisible?: number;
}

// ============================================================
// Utility Types
// ============================================================

export interface EventData {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface DateTimeOptions {
  date?: Date;
  time?: string;
  timezone?: string;
}

// ============================================================
// Error Types
// ============================================================

export class AIAssistantError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AIAssistantError';
  }
}

export type AIErrorCode = 
  | 'API_ERROR'
  | 'TRANSCRIPTION_FAILED'
  | 'INVALID_INPUT'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR';

// ============================================================
// Constants
// ============================================================

export const AI_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_RECORDING_DURATION: 120, // seconds
  DEFAULT_EVENT_DURATION: 60, // minutes
  SUGGESTION_EXPIRY_DAYS: 7,
  MAX_SUGGESTIONS_DISPLAY: 3,
  CONFLICT_CHECK_BUFFER: 15, // minutes
} as const;

export const REMINDER_PRESETS = [
  { label: 'At time of event', minutes: 0 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
] as const;
