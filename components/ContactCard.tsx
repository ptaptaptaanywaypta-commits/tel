'use client'

import { useState } from 'react'
import { reportError } from '@/lib/safeLog'
import { DirectoryEntry } from '@/lib/types'

export function ContactCard({ entry }: { entry: DirectoryEntry }) {
  const [copied, setCopied] = useState(false)

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(entry.phs)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      reportError('contact-copy', error)
    }
  }

  return (
    <article className="mobile-card overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {entry.department || '部署未設定'}
          </div>
          <h3 className="mt-2 break-words text-[1.55rem] font-semibold leading-tight tracking-tight text-slate-900">
            {entry.name}
          </h3>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">登録済み</div>
      </div>

      <div className="mt-4 rounded-[22px] bg-blue-600 px-4 py-4 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-blue-100">PHS</div>
        <div className="mt-2 break-all text-[2rem] font-semibold leading-none tracking-[0.12em]">{entry.phs}</div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="text-sm text-slate-500">更新日: {new Date(entry.updatedAt).toLocaleDateString('ja-JP')}</div>
        <button onClick={copyNumber} className="touch-button w-full bg-slate-900 text-white">
          {copied ? 'コピーしました' : '番号をコピー'}
        </button>
      </div>
    </article>
  )
}
