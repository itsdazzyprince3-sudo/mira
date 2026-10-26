'use client'

import { useEffect, useState } from 'react'
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type VersionResponse = {
  version?: unknown
}

export function PwaUpdates({ buildVersion }: { buildVersion: string }) {
  const [updateReady, setUpdateReady] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [installHelp, setInstallHelp] = useState(false)

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined
    let checkInterval: number | undefined
    let disposed = false
    const checkForUpdate = async () => {
      if (!navigator.onLine) return

      try {
        const response = await fetch('/api/version', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Version check failed (${response.status}).`)
        const result: VersionResponse = await response.json()
        if (typeof result.version !== 'string' || !result.version) {
          throw new Error('Version check returned an invalid app version.')
        }
        if (result.version !== buildVersion) setUpdateReady(true)
      } catch (error) {
        console.error('[MIRA] Could not check the latest app version:', error)
      }

      void registration?.update().catch((error: unknown) => {
        console.error('[MIRA] Could not check for an app update:', error)
      })
    }
    const handleOnline = () => checkForUpdate()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
      setShowInstallButton(true)
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
    setShowInstallButton(!isStandalone)
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((result) => {
          if (disposed) return
          registration = result

          checkInterval = window.setInterval(() => void checkForUpdate(), 5 * 60 * 1000)
          window.addEventListener('online', handleOnline)
          document.addEventListener('visibilitychange', handleVisibility)
          void checkForUpdate()
        })
        .catch((error: unknown) => {
          console.error('[MIRA] Could not register app updates:', error)
        })

      return () => {
        disposed = true
        if (checkInterval !== undefined) window.clearInterval(checkInterval)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        window.removeEventListener('online', handleOnline)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) {
      setInstallHelp(true)
      return
    }

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      setShowInstallButton(choice.outcome !== 'accepted')
    } catch (error) {
      console.error('[MIRA] Could not start app installation:', error)
      setInstallHelp(true)
    }
  }

  return (
    <>
      {installHelp && (
        <div className="pwa-install-tip" role="status">
          <span>To install MIRA, open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</span>
          <button onClick={() => setInstallHelp(false)} aria-label="Dismiss installation instructions"><X size={15} /></button>
        </div>
      )}
      {showInstallButton && (
        <button className="pwa-install-button" onClick={() => void installApp()}>
          <ArrowDownToLine size={14} /> Install MIRA
        </button>
      )}
      {updateReady && (
        <div className="pwa-update-banner" role="status" aria-live="polite">
          <span><strong>MIRA has an update.</strong> Your chats won’t reload until you choose to update.</span>
          <button onClick={() => window.location.reload()}><RefreshCw size={14} /> Update now</button>
          <button className="pwa-dismiss" onClick={() => setUpdateReady(false)} aria-label="Dismiss update notice"><X size={15} /></button>
        </div>
      )}
    </>
  )
}
