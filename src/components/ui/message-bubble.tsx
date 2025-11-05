import React from 'react';
import { User, Bot, Check, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  isTyping?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  sender,
  timestamp,
  status = 'sent',
  isTyping = false,
}) => {
  const isUser = sender === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser 
          ? 'bg-indigo-100 dark:bg-indigo-900' 
          : 'bg-purple-100 dark:bg-purple-900'
        }
      `}>
        {isUser ? (
          <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Bubble */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`
            px-4 py-2.5 rounded-2xl
            ${isUser 
              ? 'bg-indigo-600 text-white rounded-br-sm' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
            }
            ${isTyping ? 'animate-pulse' : ''}
          `}
        >
          {isTyping ? (
            <div className="flex gap-1">
              <motion.div
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {isUser ? (
                <p className="text-white m-0">{message}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="ml-0">{children}</li>,
                    code: ({ children }) => (
                      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {message}
                </ReactMarkdown>
              )}
            </div>
          )}
        </motion.div>

        {/* Metadata */}
        {!isTyping && (
          <div className={`flex items-center gap-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Timestamp */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timestamp.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>

            {/* Status (for user messages) */}
            {isUser && (
              <div>
                {status === 'sending' && (
                  <Clock className="w-3 h-3 text-gray-400" />
                )}
                {status === 'sent' && (
                  <Check className="w-3 h-3 text-indigo-400" />
                )}
                {status === 'error' && (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
