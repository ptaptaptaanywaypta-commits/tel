'use client'

import Link from 'next/link'
import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { ContactCard } from '@/components/ContactCard'
import { Header } from '@/components/Header'
import { InstallPrompt } from '@/components/InstallPrompt'
import { SearchBar } from '@/components/SearchBar'
import { getContacts, getHistory, seedContacts } from '@/lib/db'
import { normalizeDigits, normalizeSpaces } from '@/lib/normalize'
import { reportError } from '@/lib/safeLog'
import { DirectoryEntry, UpdateHistory } from '@/lib/types'

function filterContacts(contacts: DirectoryEntry[], query: string) {
  const normalizedQuery = normalizeSpaces(normalizeDigits(query)).toLowerCase()

  if (!normalizedQuery) {
    return contacts
  }

  return contacts.filter((item) => {
    const targets = [item.name, item.department ?? '', item.phs]
    return targets.some((value) => value.toLowerCase().includes(normalizedQuery))
  })
}

export default function HomePage() {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<DirectoryEntry[]>([])
  const [history, setHistory] = useState<UpdateHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [seedLoading, setSeedLoading] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [contactsData, historyData] = await Promise.all([getContacts(), getHistory()])

        if (!active) {
          return
        }

        setContacts(contactsData)
        setHistory(historyData)
      } catch (error) {
        reportError('home-load', error)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const deferredQuery = useDeferredValue(query)
  const filteredContacts = filterContacts(contacts, deferredQuery)
  const latestHistory = history[0]

  return (
    <main className="app-shell">
      <div className="space-y-4">
        <section className="panel-surface p-4">
          <Header />
        </section>

        <InstallPrompt />

        <section className="grid grid-cols-2 gap-3">
          <div className="panel-surface p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">登録件数</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{contacts.length}</div>
            <div className="mt-2 text-sm text-slate-500">端末ローカル保存</div>
          </div>
          <div className="panel-surface p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">最終更新</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {latestHistory ? new Date(latestHistory.appliedAt).toLocaleString('ja-JP') : 'まだ更新なし'}
            </div>
            <div className="mt-2 text-sm text-slate-500">{latestHistory ? (latestHistory.kind === 'seed' ? '初期データ投入' : 'OCR 取り込み') : '管理画面から登録してください'}</div>
          </div>
        </section>

        <section className="space-y-4">
          <SearchBar
            value={query}
            onChange={(nextValue) => {
              startTransition(() => setQuery(nextValue))
            }}
          />

          <div className="panel-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">表示 {filteredContacts.length} 件</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">1 カラム表示</span>
              {loading && <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">読み込み中</span>}
            </div>
          </div>

          <div className="space-y-4">
            {!loading && contacts.length === 0 ? (
              <section className="panel-surface p-6 text-center">
                <h2 className="text-lg font-semibold text-slate-900">電話帳データがありません</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  管理画面から一覧表を撮影して取り込むと、この画面ですぐ検索できるようになります。
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link href="/admin" className="touch-button w-full bg-blue-600 text-white">
                    管理画面から取り込む
                  </Link>
                  {isDevelopment && (
                    <button
                      onClick={async () => {
                        setSeedLoading(true)

                        try {
                          await seedContacts(true)
                          const [contactsData, historyData] = await Promise.all([getContacts(), getHistory()])
                          setContacts(contactsData)
                          setHistory(historyData)
                        } catch (error) {
                          reportError('home-seed', error)
                        } finally {
                          setSeedLoading(false)
                        }
                      }}
                      className="touch-button w-full bg-slate-900 text-white"
                    >
                      {seedLoading ? '投入中...' : '開発用サンプルを投入'}
                    </button>
                  )}
                </div>
              </section>
            ) : !loading && filteredContacts.length === 0 ? (
              <section className="panel-surface p-6 text-center text-sm text-slate-500">
                条件に合う連絡先が見つかりませんでした。
              </section>
            ) : (
              filteredContacts.map((entry) => <ContactCard key={entry.id} entry={entry} />)
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
