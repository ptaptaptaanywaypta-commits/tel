'use client'

import { useEffect, useState } from 'react'
import { reportError } from '@/lib/safeLog'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  if (!deferredPrompt || dismissed) {
    return null
  }

  return (
    <section className="panel-surface p-4">
      <div className="soft-label">Install</div>
      <h2 className="mt-3 text-base font-semibold text-slate-900">ホーム画面に追加できます</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        ホーム画面に追加すると、現場でアプリのように素早く開けます。オフライン時も検索画面を開きやすくなります。
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={async () => {
            try {
              await deferredPrompt.prompt()
              await deferredPrompt.userChoice
              setDismissed(true)
              setDeferredPrompt(null)
            } catch (error) {
              reportError('install-prompt', error)
            }
          }}
          className="touch-button w-full bg-blue-600 text-white sm:w-auto"
        >
          インストール
        </button>
        <button onClick={() => setDismissed(true)} className="touch-button w-full bg-slate-100 text-slate-700 sm:w-auto">
          あとで
        </button>
      </div>
    </section>
  )
}
