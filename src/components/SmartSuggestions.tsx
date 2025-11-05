import React from 'react';
import { Lightbulb, Check, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SmartSuggestionsProps, AISuggestion } from '../types/ai-assistant';

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  suggestions,
  onAccept,
  onReject,
  maxVisible = 3,
}) => {
  const visibleSuggestions = suggestions.slice(0, maxVisible);

  if (visibleSuggestions.length === 0) return null;

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'event_improvement':
        return '✨';
      case 'conflict_resolution':
        return '⚠️';
      case 'reminder_addition':
        return '🔔';
      case 'attendee_suggestion':
        return '👥';
      case 'time_optimization':
        return '⏰';
      case 'wellness_break':
        return '🧘';
      case 'family_activity':
        return '🎉';
      case 'travel_planning':
        return '🚗';
      default:
        return '💡';
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'conflict_resolution':
        return 'yellow';
      case 'wellness_break':
        return 'green';
      case 'family_activity':
        return 'purple';
      default:
        return 'indigo';
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          AI Suggestions
        </h3>
      </div>

      <AnimatePresence>
        {visibleSuggestions.map((suggestion, index) => {
          const color = getSuggestionColor(suggestion.suggestion_type);
          const icon = getSuggestionIcon(suggestion.suggestion_type);

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`
                bg-${color}-50 dark:bg-${color}-900/20 
                border-l-4 border-${color}-500 
                rounded-lg p-4
              `}
              style={{
                backgroundColor: `rgb(${color === 'indigo' ? '238 242 255' : color === 'yellow' ? '254 252 232' : color === 'green' ? '240 253 244' : '250 245 255'})`,
                borderLeftColor: `rgb(${color === 'indigo' ? '99 102 241' : color === 'yellow' ? '234 179 8' : color === 'green' ? '34 197 94' : '168 85 247'})`,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 text-2xl mt-0.5">
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {suggestion.suggestion_text}
                  </p>

                  {/* Priority Badge */}
                  {suggestion.priority && suggestion.priority !== 'low' && (
                    <div className="mt-2">
                      <span className={`
                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${suggestion.priority === 'high' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                        }
                      `}>
                        {suggestion.priority === 'high' ? '🔴 High Priority' : '🟡 Medium Priority'}
                      </span>
                    </div>
                  )}

                  {/* Expiry Warning */}
                  {new Date(suggestion.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      ⏰ Expires in {Math.round((new Date(suggestion.expires_at).getTime() - Date.now()) / (60 * 60 * 1000))} hours
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => onAccept(suggestion.id)}
                    className="p-2 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors group"
                    title="Accept suggestion"
                  >
                    <Check className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                  </button>
                  <button
                    onClick={() => onReject(suggestion.id)}
                    className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors group"
                    title="Dismiss suggestion"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Show More Indicator */}
      {suggestions.length > maxVisible && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2"
        >
          +{suggestions.length - maxVisible} more suggestion{suggestions.length - maxVisible !== 1 ? 's' : ''}
        </motion.p>
      )}
    </div>
  );
};
