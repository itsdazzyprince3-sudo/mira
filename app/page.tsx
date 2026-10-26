'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Command,
  FileText,
  FolderOpen,
  Headphones,
  LogIn,
  LogOut,
  Mic,
  MicOff,
  MonitorCog,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Volume2,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'

const quickActions = [
  { icon: FolderOpen, label: 'Open workspace' },
  { icon: FileText, label: 'Summarize a file' },
  { icon: Command, label: 'Run a command' },
  { icon: MonitorCog, label: 'System check' },
]

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const navItems = [
  { label: 'Conversation', icon: Sparkles, active: true },
  { label: 'Memory', icon: BrainCircuit },
  { label: 'Automations', icon: WandSparkles },
]

export default function Page() {
  const [message, setMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentMessage, setSentMessage] = useState('')
  const [reply, setReply] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)

  function speakMira(text: string) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find((voice) => /female|samantha|victoria|karen|moira|ava|zira|susan/i.test(voice.name))
    if (femaleVoice) utterance.voice = femaleVoice
    utterance.rate = 0.94
    utterance.pitch = 1.12
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    const speechWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const SpeechRecognitionAPI = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      const wakeMatch = transcript.match(/^(?:hey\s+)?mira\b[,:]?\s*(.*)$/i)
      if (wakeMatch) {
        const command = wakeMatch[1].trim()
        setIsListening(false)
        if (command) window.setTimeout(() => void handleSend(command), 0)
        else setMessage('')
      } else {
        setMessage(transcript)
        setIsListening(false)
      }
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [])

  function toggleListening() {
    const recognition = recognitionRef.current
    if (!recognition) {
      setIsListening((current) => !current)
      return
    }
    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
  }

  async function handleAuth() {
    const supabase = createClient()
    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` },
        })
    if (result.error) {
      setAuthError(result.error.message.toLowerCase().includes('confirm') ? 'Check your email to confirm your account.' : 'Invalid email or password.')
    } else if (authMode === 'signup') {
      setAuthMessage('Check your email to confirm your account.')
    } else {
      setUserEmail(result.data.user?.email ?? email)
      setShowLogin(false)
    }
    setAuthLoading(false)
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    setAuthError('')
    setAuthLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) {
      const providerDisabled = error?.message.toLowerCase().includes('provider is not enabled')
      setAuthError(providerDisabled
        ? 'Google sign-in is disabled for this Supabase project. Use email and password, or enable Google in Supabase Auth providers.'
        : 'Google sign-in could not start. Please try email and password instead.')
      setAuthLoading(false)
      return
    }

    // Google blocks OAuth pages inside the v0 preview iframe. Open the flow in a
    // top-level browser tab instead of navigating the embedded preview.
    const authWindow = window.open(data.url, '_blank', 'noopener,noreferrer')
    if (!authWindow) {
      setAuthError('Allow pop-ups to continue with Google.')
    } else {
      setAuthMessage('Google sign-in opened in a new tab.')
    }
    setAuthLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserEmail('')
  }

  async function handleSend(command?: string) {
    const prompt = (command ?? message).trim()
    if (!prompt) return
    setSent(true)
    setSentMessage(prompt)
    setMessage('')
    setReply('Thinking...')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setReply(data.reply)
      speakMira(data.reply)
    } catch {
      const fallback = 'I could not reach my AI brain right now. Please try again.'
      setReply(fallback)
      speakMira(fallback)
    }
  }

  return (
    <main className="mira-shell">
      <audio ref={voiceAudioRef} src="/audio/mira-voice.mp3" preload="auto" />
      <div className="ambient ambient-cyan" />
      <div className="ambient ambient-violet" />
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <div><strong>MIRA</strong><span>personal intelligence</span></div>
        </div>
        <div className="connection-pill"><span className="status-dot" /> Local web app <span className="pill-muted">secure</span></div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return <button className={`nav-item ${item.active ? 'active' : ''}`} key={item.label}><Icon size={17} /> {item.label}{item.active && <ChevronRight size={14} className="nav-arrow" />}</button>
          })}
        </nav>
        <div className="sidebar-divider" />
        <div className="recent-label"><span>RECENT THREADS</span><button aria-label="New conversation"><Plus size={15} /></button></div>
        <div className="thread-list">
          <button className="thread active-thread"><span className="thread-dot" /> Getting started with MIRA <small>now</small></button>
          <button className="thread"><span className="thread-dot muted-dot" /> Workspace setup <small>yesterday</small></button>
          <button className="thread"><span className="thread-dot muted-dot" /> Voice configuration <small>Oct 24</small></button>
        </div>
        <div className="sidebar-footer">
          <div className="permission-card"><ShieldCheck size={17} /><div><strong>Permission level 1</strong><span>Reversible actions only</span></div><ChevronRight size={14} /></div>
          <button className="settings-button" onClick={() => setShowSettings(true)}><Settings2 size={17} /> Settings <span className="shortcut">⌘ ,</span></button>
          <button className="profile-row profile-button" onClick={() => userEmail ? handleLogout() : setShowLogin(true)}><div className="profile-avatar">{userEmail ? userEmail[0].toUpperCase() : 'A'}</div><div><strong>{userEmail || 'Sign in'}</strong><span>{userEmail ? 'Sign out' : 'Use your account'}</span></div>{userEmail ? <LogOut size={17} className="profile-more" /> : <LogIn size={17} className="profile-more" />}</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">PERSONAL INTELLIGENCE / SESSION 01</p><h1>Good evening, Alex.</h1></div>
          <div className="top-actions"><div className="model-chip"><span className="model-dot" /><span><small>AI BRAIN</small> xAI / configured</span><ChevronRight size={14} /></div><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><button className="icon-button" aria-label="More options"><MoreHorizontal size={18} /></button></div>
        </header>
        <div className="content-grid">
          <div className="conversation-column">
            <div className="chat-scroll">
              <div className="welcome-row"><div className="avatar-wrap"><div className="avatar-halo" /><div className="mira-avatar"><div className="avatar-ear left-ear" /><div className="avatar-ear right-ear" /><div className="avatar-hair" /><div className="avatar-face"><span className="eye left-eye" /><span className="eye right-eye" /><span className="mouth" /></div><div className="avatar-neck" /></div><span className="avatar-status"><Check size={11} /></span></div><div className="welcome-copy"><span className="message-time">MIRA / just now</span><p>Hey! I&apos;m Mira, your personal AI assistant. Everything is ready. What would you like to work on today?</p><div className="welcome-tags"><span><Activity size={12} /> Listening for “Mira”</span><span><ShieldCheck size={12} /> Privacy-first</span></div></div></div>
              {sent && <div className="user-bubble"><span className="message-time">YOU / just now</span><p>{sentMessage}</p></div>}
              {reply && <div className="welcome-row reply-row"><div className="avatar-wrap small-avatar"><div className="mira-avatar"><div className="avatar-hair" /><div className="avatar-face"><span className="eye left-eye" /><span className="eye right-eye" /><span className="mouth" /></div></div></div><div className="welcome-copy"><span className="message-time">MIRA / just now</span><p>{reply}</p><button className="speak-again" onClick={() => speakMira(reply)}><Volume2 size={13} /> Speak response</button></div></div>}
              <div className="suggestion-block"><p className="section-kicker">SUGGESTED STARTING POINTS</p><div className="quick-actions">{quickActions.map((action) => { const Icon = action.icon; return <button key={action.label} onClick={() => setMessage(action.label)}><Icon size={16} /><span>{action.label}</span><ChevronRight size={14} /></button> })}</div></div>
            </div>
            <div className="composer-wrap"><div className="composer"><button className="composer-icon" aria-label="Attach file"><Paperclip size={18} /></button><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask MIRA anything..." rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); handleSend() } }} /><button className={`mic-button ${isListening ? 'listening' : ''}`} onClick={toggleListening} aria-label={isListening ? 'Stop listening' : 'Start listening'}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button><button className="send-button" onClick={() => void handleSend()} aria-label="Send message"><Send size={17} /></button></div><div className="composer-meta"><span><Command size={12} /> Enter to send</span><span><Headphones size={12} /> {isListening ? 'Listening...' : 'Push to talk'}</span><span className="meta-right">MIRA can make mistakes. Verify important actions.</span></div></div>
          </div>
          <aside className="status-column">
            <div className="status-card now-card"><div className="card-heading"><span>NOW</span><span className="live-label"><i /> LIVE</span></div><div className="orbital-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core"><Sparkles size={22} /></div></div><h2>Standing by</h2><p>Say <strong>“Hey Mira”</strong> or press the microphone to begin.</p><div className="voice-bars">{[12,20,31,19,27,38,23,16,29,11,24,34,18,27,14,22].map((height, i) => <span key={i} style={{ height }} />)}</div><div className="status-line"><span><i className="green-dot" /> Wake word active</span><button onClick={toggleListening}>{isListening ? 'Stop mic' : 'Test mic'}</button></div></div>
            <div className="status-card task-card"><div className="card-heading"><span>CURRENT TASK</span><button aria-label="Cancel task"><X size={15} /></button></div><div className="task-empty"><div className="task-icon"><Zap size={17} /></div><div><strong>No active tasks</strong><span>Automation will appear here</span></div></div></div>
            <div className="status-card security-card"><div className="card-heading"><span>SAFETY CENTER</span><ShieldCheck size={16} /></div><div className="security-row"><div className="security-icon"><ShieldCheck size={15} /></div><div><strong>Protected mode</strong><span>Every action needs your approval</span></div></div><div className="level-row"><span>LEVEL 0 <small>Read only</small></span><span className="level-active">LEVEL 1 <small>Reversible</small></span><span>LEVEL 2 <small>Sensitive</small></span></div></div>
          </aside>
        </div>
      </section>
      {showLogin && <div className="modal-backdrop" onClick={() => setShowLogin(false)}><div className="settings-modal login-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">MIRA / ACCOUNT</p><h2>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2></div><button className="icon-button" onClick={() => setShowLogin(false)} aria-label="Close login"><X size={18} /></button></div><form onSubmit={(e) => { e.preventDefault(); void handleAuth() }}><label className="auth-label">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label className="auth-label">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>{authError && <p className="auth-error">{authError}</p>}{authMessage && <p className="auth-message">{authMessage}</p>}<button className="modal-close" disabled={authLoading}>{authLoading ? 'Connecting...' : authMode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="google-button" onClick={() => void handleGoogleLogin()}>Continue with Google</button><button className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthMessage('') }}>{authMode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button></div></div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="settings-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">MIRA / CONFIGURATION</p><h2>Settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={18} /></button></div><div className="settings-list"><label>AI provider <span>xAI / configured</span></label><label>Wake phrase <span>“Mira” + “Hey Mira”</span></label><label>Voice interaction <span>Wake word + push-to-talk</span></label><label>Permission ceiling <span>Level 1 · Reversible</span></label></div><div className="modal-note"><ShieldCheck size={16} /> Local preview status is genuine; connect your provider and Windows bridge to enable actions.</div><button className="modal-close" onClick={() => setShowSettings(false)}>Done</button></div></div>}
    </main>
  )
}
