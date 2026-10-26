'use client'

import { useState } from 'react'
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

  function handleSend() {
    if (!message.trim()) return
    setSent(true)
    setMessage('')
  }

  return (
    <main className="mira-shell">
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
          <div className="profile-row"><div className="profile-avatar">A</div><div><strong>Alex</strong><span>Local profile</span></div><MoreHorizontal size={17} className="profile-more" /></div>
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
              {sent && <div className="user-bubble"><span className="message-time">YOU / just now</span><p>Can you help me with that?</p></div>}
              <div className="suggestion-block"><p className="section-kicker">SUGGESTED STARTING POINTS</p><div className="quick-actions">{quickActions.map((action) => { const Icon = action.icon; return <button key={action.label} onClick={() => setMessage(action.label)}><Icon size={16} /><span>{action.label}</span><ChevronRight size={14} /></button> })}</div></div>
            </div>
            <div className="composer-wrap"><div className="composer"><button className="composer-icon" aria-label="Attach file"><Paperclip size={18} /></button><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask MIRA anything..." rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); handleSend() } }} /><button className={`mic-button ${isListening ? 'listening' : ''}`} onClick={() => setIsListening(!isListening)} aria-label={isListening ? 'Stop listening' : 'Start listening'}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button><button className="send-button" onClick={handleSend} aria-label="Send message"><Send size={17} /></button></div><div className="composer-meta"><span><Command size={12} /> Enter to send</span><span><Headphones size={12} /> {isListening ? 'Listening...' : 'Push to talk'}</span><span className="meta-right">MIRA can make mistakes. Verify important actions.</span></div></div>
          </div>
          <aside className="status-column">
            <div className="status-card now-card"><div className="card-heading"><span>NOW</span><span className="live-label"><i /> LIVE</span></div><div className="orbital-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core"><Sparkles size={22} /></div></div><h2>Standing by</h2><p>Say <strong>“Hey Mira”</strong> or press the microphone to begin.</p><div className="voice-bars">{[12,20,31,19,27,38,23,16,29,11,24,34,18,27,14,22].map((height, i) => <span key={i} style={{ height }} />)}</div><div className="status-line"><span><i className="green-dot" /> Wake word active</span><button onClick={() => setIsListening(!isListening)}>{isListening ? 'Mute' : 'Test mic'}</button></div></div>
            <div className="status-card task-card"><div className="card-heading"><span>CURRENT TASK</span><button aria-label="Cancel task"><X size={15} /></button></div><div className="task-empty"><div className="task-icon"><Zap size={17} /></div><div><strong>No active tasks</strong><span>Automation will appear here</span></div></div></div>
            <div className="status-card security-card"><div className="card-heading"><span>SAFETY CENTER</span><ShieldCheck size={16} /></div><div className="security-row"><div className="security-icon"><ShieldCheck size={15} /></div><div><strong>Protected mode</strong><span>Every action needs your approval</span></div></div><div className="level-row"><span>LEVEL 0 <small>Read only</small></span><span className="level-active">LEVEL 1 <small>Reversible</small></span><span>LEVEL 2 <small>Sensitive</small></span></div></div>
          </aside>
        </div>
      </section>
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="settings-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">MIRA / CONFIGURATION</p><h2>Settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={18} /></button></div><div className="settings-list"><label>AI provider <span>xAI / configured</span></label><label>Wake phrase <span>“Mira” + “Hey Mira”</span></label><label>Voice interaction <span>Wake word + push-to-talk</span></label><label>Permission ceiling <span>Level 1 · Reversible</span></label></div><div className="modal-note"><ShieldCheck size={16} /> Local preview status is genuine; connect your provider and Windows bridge to enable actions.</div><button className="modal-close" onClick={() => setShowSettings(false)}>Done</button></div></div>}
    </main>
  )
}
