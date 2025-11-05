import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './ui/message-bubble';
import type { ChatInterfaceProps, ChatMessage, ParsedEvent } from '../types/ai-assistant';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isTyping,
  conversationId,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle send message
  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !isTyping) {
      onSendMessage(trimmed);
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render event preview card
  const renderEventPreview = (event: ParsedEvent) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-2 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800"
    >
      <div className="flex items-start gap-3">
        <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-2">
          <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {event.title}
          </h4>
          
          {event.start_time && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(event.start_time).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              {event.duration_minutes && (
                <span className="text-gray-500">
                  ({event.duration_minutes} min)
                </span>
              )}
            </div>
          )}
          
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          )}
          
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>
                {event.attendees.map(a => a.name).join(', ')}
              </span>
            </div>
          )}
          
          {event.recurrence && event.recurrence !== 'NONE' && (
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              Repeats {event.recurrence.toLowerCase()}
              {event.day_of_week && ` on ${event.day_of_week}s`}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full p-6 mb-4">
              <Calendar className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Hi! I'm your Family Calendar AI
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
              I can help you create events, check your schedule, and manage your family calendar.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-w-md">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Try asking me:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 text-left">
                <li>• "Add volleyball practice every Monday at 7 PM"</li>
                <li>• "What's on my schedule tomorrow?"</li>
                <li>• "Create a family dinner on Saturday"</li>
                <li>• "Remind me about Mom's birthday next week"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Message List */}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble
                message={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                status={message.status}
              />
              
              {/* Event Preview */}
              {message.event_preview && message.sender === 'assistant' && (
                renderEventPreview(message.event_preview)
              )}
              
              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.suggestions.map((suggestion, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded px-3 py-2"
                    >
                      💡 {suggestion}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MessageBubble
              message="Thinking..."
              sender="assistant"
              timestamp={new Date()}
              isTyping
            />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
              }}
            />
            
            {/* Character count */}
            {inputValue.length > 400 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {inputValue.length}/500
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className={`
              p-3 rounded-lg transition-all duration-200
              ${inputValue.trim() && !isTyping
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setInputValue("What's on my schedule today?")}
            disabled={isTyping}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            Today's schedule
          </button>
          <button
            onClick={() => setInputValue("Add a new event")}
            disabled={isTyping}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            Create event
          </button>
          <button
            onClick={() => setInputValue("Suggest a family activity")}
            disabled={isTyping}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            Get suggestions
          </button>
        </div>
      </div>
    </div>
  );
};
