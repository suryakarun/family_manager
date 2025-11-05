import React from 'react';
import { AlertTriangle, Check, X, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConflictDetectorProps, EventConflict, ConflictResolution } from '../types/ai-assistant';

export const ConflictDetector: React.FC<ConflictDetectorProps> = ({
  conflicts,
  onResolve,
  onIgnore,
}) => {
  const handleResolution = (conflictId: string, resolution: ConflictResolution) => {
    onResolve(conflictId, resolution);
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Scheduling Conflicts Detected
        </h3>
      </div>

      <AnimatePresence>
        {conflicts.map((conflict) => (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4"
          >
            {/* Conflict Description */}
            <div className="mb-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2">
                {conflict.conflict_description}
              </p>

              {/* Event Details */}
              {conflict.event_1_details && conflict.event_2_details && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {/* Event 1 */}
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conflict.event_1_details.title}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(conflict.event_1_details.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{conflict.event_1_details.duration_minutes} min</span>
                        </div>
                        {conflict.event_1_details.location && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                            📍 {conflict.event_1_details.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event 2 */}
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conflict.event_2_details.title}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(conflict.event_2_details.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{conflict.event_2_details.duration_minutes} min</span>
                        </div>
                        {conflict.event_2_details.location && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                            📍 {conflict.event_2_details.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Resolutions */}
            {conflict.suggested_resolutions && conflict.suggested_resolutions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Suggested solutions:
                </p>
                <div className="space-y-2">
                  {conflict.suggested_resolutions.map((resolution, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleResolution(conflict.id, resolution)}
                      className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded transition-colors text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {resolution.type === 'reschedule' && '⏰ Reschedule'}
                            {resolution.type === 'shorten' && '⏱️ Shorten duration'}
                            {resolution.type === 'cancel' && '❌ Cancel event'}
                            {resolution.type === 'merge' && '🔗 Merge events'}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                            {resolution.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onIgnore(conflict.id)}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Ignore
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
