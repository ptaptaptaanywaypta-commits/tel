'use client'

import { ReactNode, useEffect, useState } from 'react'
import {
  clearAdminSession,
  getRemainingSessionMinutes,
  isAdminPinConfigured,
  isValidPin,
  readAdminSession,
  refreshAdminSession,
  storeAdminSession,
  verifyAdminPin,
} from '@/lib/auth/adminPin'
import { reportError } from '@/lib/safeLog'

type LockState = 'checking' | 'locked' | 'unlocked' | 'unconfigured'

export function AdminPinGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockState>('checking')
  const [pin, setPin] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)

  useEffect(() => {
    try {
      if (!isAdminPinConfigured()) {
        setState('unconfigured')
        return
      }

      if (readAdminSession()) {
        setState('unlocked')
        setRemainingMinutes(getRemainingSessionMinutes())
        return
      }

      setState('locked')
    } catch (error) {
      reportError('pin-gate-init', error)
      setState('locked')
    }
  }, [])

  useEffect(() => {
    if (state !== 'unlocked') {
      return
    }

    const syncSession = () => {
      const session = refreshAdminSession()

      if (!session) {
        setState('locked')
        setRemainingMinutes(0)
        return
      }

      setRemainingMinutes(getRemainingSessionMinutes())
    }

    const onActivity = () => syncSession()
    const timer = window.setInterval(() => {
      if (!readAdminSession()) {
        setState('locked')
        setRemainingMinutes(0)
        return
      }

      setRemainingMinutes(getRemainingSessionMinutes())
    }, 30000)

    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
    }
  }, [state])

  const relock = () => {
    clearAdminSession()
    setPin('')
    setErrorMessage('')
    setState('locked')
    setRemainingMinutes(0)
  }

  if (state === 'checking') {
    return (
      <section className="panel-surface p-5">
        <div className="soft-label">PIN Lock</div>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">管理画面を開いています</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">PIN 設定を確認しています。</p>
      </section>
    )
  }

  if (state === 'unconfigured') {
    return (
      <div className="space-y-4">
        <div className="panel-surface flex flex-col gap-2 p-4 text-sm text-slate-600">
          <div className="soft-label">PIN Lock</div>
          <div className="font-semibold text-slate-900">PIN 未設定のためロックをスキップしています</div>
          <p className="leading-6">
            `.env.local` に `NEXT_PUBLIC_ADMIN_PIN_HASH` を設定すると、管理画面に PIN ロックをかけられます。
          </p>
        </div>
        {children}
      </div>
    )
  }

  if (state === 'unlocked') {
    return (
      <div className="space-y-4">
        <div className="panel-surface flex flex-col gap-3 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="leading-6">管理画面はロック解除中です。操作が止まると {remainingMinutes} 分前後で自動ロックします。</div>
          <button onClick={relock} className="touch-button w-full bg-slate-900 text-white sm:w-auto">
            今すぐロック
          </button>
        </div>
        {children}
      </div>
    )
  }

  return (
    <section className="panel-surface p-5">
      <div className="soft-label">PIN Lock</div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">管理画面の PIN 認証</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        管理画面を開くには PIN を入力してください。認証状態は短時間だけこの端末に保持されます。
      </p>

      <div className="mt-5">
        <label className="field-label">PIN</label>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
          className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] outline-none transition focus:border-blue-400 focus:bg-white"
          placeholder="4-8 桁の数字"
        />
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      )}

      <button
        onClick={async () => {
          if (!isValidPin(pin)) {
            setErrorMessage('PIN は 4-8 桁の数字で入力してください。')
            return
          }

          setWorking(true)
          setErrorMessage('')

          try {
            const verified = await verifyAdminPin(pin)

            if (!verified) {
              setErrorMessage('PIN が一致しません。')
              return
            }

            storeAdminSession()
            setPin('')
            setState('unlocked')
            setRemainingMinutes(getRemainingSessionMinutes())
          } catch (error) {
            reportError('pin-gate-unlock', error)
            setErrorMessage('ロック解除に失敗しました。')
          } finally {
            setWorking(false)
          }
        }}
        disabled={working}
        className="touch-button mt-5 w-full bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {working ? '認証中...' : 'PIN でロック解除'}
      </button>
    </section>
  )
}
