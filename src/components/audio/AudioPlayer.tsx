// src/components/audio/AudioPlayer.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  audioUrl: string
  transcript?: string
  className?: string
}

export function AudioPlayer({ audioUrl, transcript, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  // eslint-disable-next-line no-undef
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // eslint-disable-next-line no-undef
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.src = ''
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn('flex flex-col gap-2 p-4 bg-muted/50 rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <Button
          onClick={togglePlay}
          size="icon"
          variant="outline"
          className="h-10 w-10"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <div className="flex-1">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-[80px]">
          <Volume2 className="h-3 w-3" />
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
      </div>
      
      {transcript && (
        <p className="text-sm text-muted-foreground mt-2 p-2 bg-background rounded border">
          {transcript}
        </p>
      )}
    </div>
  )
}


