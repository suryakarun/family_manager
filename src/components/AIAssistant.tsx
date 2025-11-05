import React, { useState, useEffect } from 'react';
import { MessageSquare, Mic, X, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInterface } from './ChatInterface';
import { VoiceInput } from './VoiceInput';
import { ConflictDetector } from './ConflictDetector';
import { SmartSuggestions } from './SmartSuggestions';
import { useAIAssistant } from '../hooks/use-ai-assistant';
import { useConflictDetection } from '../hooks/use-conflict-detection';
import { useSmartSuggestions } from '../hooks/use-smart-suggestions';
import type { AIMode, ParsedEvent, EventConflict, AISuggestion } from '../types/ai-assistant';

interface AIAssistantProps {
  familyId: string;
  userId: string;
  onEventCreated?: (event: ParsedEvent) => void;
  onConflictDetected?: (conflicts: EventConflict[]) => void;
  defaultMode?: AIMode;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  familyId,
  userId,
  onEventCreated,
  onConflictDetected,
  defaultMode = 'chat',
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AIMode>(defaultMode);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Custom hooks
  const {
    messages,
    isTyping,
    conversationId,
    sendMessage,
    error: assistantError,
  } = useAIAssistant(familyId, userId);

  const {
    conflicts,
    checkConflicts,
    resolveConflict,
    ignoreConflict,
  } = useConflictDetection(familyId);

  const {
    suggestions,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions,
  } = useSmartSuggestions(familyId, conversationId);

  // Effects
  useEffect(() => {
    if (conflicts.length > 0) {
      setShowConflicts(true);
      onConflictDetected?.(conflicts);
    }
  }, [conflicts, onConflictDetected]);

  useEffect(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions]);

  // Handlers
  const handleSendMessage = async (message: string) => {
    const response = await sendMessage(message, mode);
    
    if (response?.event) {
      onEventCreated?.(response.event);
    }
    
    if (response?.type === 'event') {
      // Check for conflicts after creating event
      await checkConflicts();
    }
  };

  const handleVoiceRecording = async (text: string) => {
    await handleSendMessage(text);
  };

  const toggleMode = () => {
    setMode(prev => prev === 'chat' ? 'voice' : 'chat');
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowConflicts(false);
    setShowSuggestions(false);
  };

  // Render
  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Sparkles className="w-6 h-6" />
        {(conflicts.length > 0 || suggestions.length > 0) && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            {conflicts.length + suggestions.length}
          </motion.div>
        )}
      </motion.button>

      {/* Main Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Panel */}
            <motion.div
              className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
              initial={{ y: '100%', scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-semibold">AI Family Assistant</h2>
                    <p className="text-sm text-indigo-100">
                      {mode === 'chat' ? 'Type your message' : 'Speak naturally'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mode Toggle */}
                  <button
                    onClick={toggleMode}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    title={mode === 'chat' ? 'Switch to voice' : 'Switch to chat'}
                  >
                    {mode === 'chat' ? (
                      <Mic className="w-5 h-5" />
                    ) : (
                      <MessageSquare className="w-5 h-5" />
                    )}
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {assistantError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{assistantError}</p>
                </div>
              )}

              {/* Conflict Alerts */}
              {showConflicts && conflicts.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <ConflictDetector
                    conflicts={conflicts}
                    onResolve={resolveConflict}
                    onIgnore={ignoreConflict}
                  />
                </div>
              )}

              {/* Smart Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <SmartSuggestions
                    suggestions={suggestions}
                    onAccept={acceptSuggestion}
                    onReject={rejectSuggestion}
                    maxVisible={3}
                  />
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden">
                {mode === 'chat' ? (
                  <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isTyping={isTyping}
                    conversationId={conversationId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <VoiceInput
                      onRecordingComplete={(recording) => {
                        if (recording.transcription) {
                          handleVoiceRecording(recording.transcription);
                        }
                      }}
                      maxDuration={120}
                    />
                    
                    {/* Voice Mode Instructions */}
                    <div className="mt-8 text-center max-w-md">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Speak naturally to create events, check your schedule, or get suggestions
                      </p>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">
                          Try saying:
                        </p>
                        <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1">
                          <li>"Add volleyball practice every Monday at 7"</li>
                          <li>"What's on my calendar tomorrow?"</li>
                          <li>"Remind me about Mom's birthday"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Powered by AI • {conversationId ? 'Connected' : 'Ready'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
