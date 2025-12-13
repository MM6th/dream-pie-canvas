import React, { useEffect, useRef, useState } from "react";

interface AudioLevelMeterProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export const AudioLevelMeter = ({ stream, isRecording }: AudioLevelMeterProps) => {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isRecording) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 128) * 100);
      setLevel(normalizedLevel);
      
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isRecording]);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Audio Level</span>
        {isRecording && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400">Recording</span>
          </span>
        )}
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-75 rounded-full"
          style={{
            width: `${level}%`,
            background: level > 80 
              ? 'hsl(var(--destructive))' 
              : level > 50 
                ? 'hsl(45, 100%, 50%)' 
                : 'hsl(var(--primary))'
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
};

export default AudioLevelMeter;
