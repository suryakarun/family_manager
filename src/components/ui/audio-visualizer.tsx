import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevel,
  isActive,
  barCount = 24,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw flat line when inactive
        ctx.fillStyle = 'rgba(156, 163, 175, 0.3)';
        const barWidth = width / barCount;
        for (let i = 0; i < barCount; i++) {
          const x = i * barWidth + barWidth / 4;
          ctx.fillRect(x, height / 2 - 2, barWidth / 2, 4);
        }
        return;
      }

      // Draw animated bars when active
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;

      for (let i = 0; i < barCount; i++) {
        // Create wave effect with audio level
        const normalizedAudioLevel = Math.min(audioLevel / 100, 1);
        const waveOffset = Math.sin((Date.now() / 200) + i * 0.5) * 0.3;
        const barHeight = (normalizedAudioLevel + waveOffset) * maxBarHeight * 0.5 + maxBarHeight * 0.1;
        
        const x = i * barWidth + barWidth / 4;
        const y = (height - barHeight) / 2;

        // Gradient color based on audio level
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (normalizedAudioLevel > 0.7) {
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // red
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.4)');
        } else if (normalizedAudioLevel > 0.4) {
          gradient.addColorStop(0, 'rgba(251, 146, 60, 0.8)'); // orange
          gradient.addColorStop(1, 'rgba(251, 146, 60, 0.4)');
        } else {
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); // indigo
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.4)');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth / 2, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isActive, barCount]);

  return (
    <motion.canvas
      ref={canvasRef}
      width={400}
      height={80}
      className="w-full h-20 rounded-lg"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    />
  );
};
