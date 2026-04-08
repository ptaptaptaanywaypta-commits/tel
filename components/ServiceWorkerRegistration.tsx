'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/safeLog'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        void registration.update()
      } catch (error) {
        reportError('service-worker-register', error)
      }
    }

    void register()
  }, [])

  return null
}

