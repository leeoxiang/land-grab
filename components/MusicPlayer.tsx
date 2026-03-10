'use client'

import { useEffect, useRef, useState } from 'react'

const MUSIC_URL = 'https://raw.githubusercontent.com/leeoxiang/land-grab/master/music.mp3'

export default function MusicPlayer() {
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [muted,   setMuted]   = useState(false)
  const [volume,  setVolume]  = useState(0.25)

  // Create audio once on mount
  useEffect(() => {
    const audio = new Audio(MUSIC_URL)
    audio.loop   = true
    audio.volume = 0.25
    audioRef.current = audio
    return () => { audio.pause(); audioRef.current = null }
  }, [])

  // Autoplay on first user interaction (browser requires it)
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return
      unlockedRef.current = true
      audioRef.current?.play().then(() => setPlaying(true)).catch(() => {})
    }
    window.addEventListener('click',   unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('click',   unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else         { a.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  const toggleMute = () => {
    const a = audioRef.current
    if (!a) return
    a.muted = !muted
    setMuted(!muted)
  }

  const changeVolume = (v: number) => {
    const a = audioRef.current
    if (!a) return
    a.volume = v
    setVolume(v)
    if (v > 0 && muted) { a.muted = false; setMuted(false) }
  }

  return (
    <div className="music-player">
      <span className="music-label">♪</span>
      <button className="music-btn" onClick={togglePlay} title={playing ? 'Pause music' : 'Play music'}>
        {playing ? '▐▐' : '▶'}
      </button>
      <button className="music-btn" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
        {(muted || volume === 0) ? '✕' : '♫'}
      </button>
      <input
        className="vol-slider"
        type="range"
        min={0} max={1} step={0.01}
        value={muted ? 0 : volume}
        onChange={e => changeVolume(Number(e.target.value))}
        title="Volume"
      />
    </div>
  )
}
