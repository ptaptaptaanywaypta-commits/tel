'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminPinGate } from '@/components/AdminPinGate'
import { DiffPreview } from '@/components/DiffPreview'
import { ReviewTable } from '@/components/ReviewTable'
import { UploadPanel } from '@/components/UploadPanel'
import { reviewImportedEntries } from '@/lib/aiReview'
import { addHistory, getContacts, getHistory, replaceContacts } from '@/lib/db'
import { buildMergePreview, mergeApprovedEntries } from '@/lib/diff'
import { ParsedDirectoryRow } from '@/lib/ocr'
import { reportError } from '@/lib/safeLog'
import { DirectoryEntry, UpdateHistory } from '@/lib/types'

type FilterMode = 'all' | 'needs-review' | 'auto-approved'

export default function AdminPage() {
  const [rows, setRows] = useState<ParsedDirectoryRow[]>([])
  const [contacts, setContacts] = useState<DirectoryEntry[]>([])
  const [history, setHistory] = useState<UpdateHistory[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [activeRowId, setActiveRowId] = useState<string | null>(null)

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
        reportError('admin-load', error)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (rows.length === 0) {
      return
    }

    setRows((prev) => reviewImportedEntries(prev, contacts))
  }, [contacts])

  const mergePreview = buildMergePreview(contacts, rows)
  const approvedCount = rows.filter((row) => row.approved).length
  const autoApprovedCount = rows.filter((row) => row.autoApproved).length
  const needsReviewCount = rows.filter((row) => row.reviewStatus === 'needs-review').length
  const visibleRows = rows.filter((row) => {
    if (filterMode === 'needs-review') {
      return row.reviewStatus === 'needs-review'
    }

    if (filterMode === 'auto-approved') {
      return row.autoApproved
    }

    return true
  })

  const handleImported = (nextRows: ParsedDirectoryRow[]) => {
    setRows(nextRows)
    setFilterMode('all')
    setActiveRowId(nextRows[0]?.tempId ?? null)
    setNotice(`${nextRows.length} 件を読み込みました。要確認だけ直して登録できます。`)
  }

  const handleFieldChange = (tempId: string, field: 'normalizedName' | 'normalizedPhs', value: string) => {
    setRows((prev) =>
      reviewImportedEntries(
        prev.map((row) => {
          if (row.tempId !== tempId) {
            return row
          }

          return {
            ...row,
            [field]: value,
            manualEdited: true,
            manualDecision: row.manualDecision ?? null,
          }
        }),
        contacts,
      ),
    )
  }

  const toggleApprove = (tempId: string) => {
    setRows((prev) =>
      reviewImportedEntries(
        prev.map((row) => {
          if (row.tempId !== tempId) {
            return row
          }

          return {
            ...row,
            manualDecision: row.approved ? 'rejected' : 'approved',
          }
        }),
        contacts,
      ),
    )
  }

  const applyApproved = async () => {
    if (approvedCount === 0) {
      setNotice('登録対象の行がありません。')
      return
    }

    if (mergePreview.additions.length === 0 && mergePreview.updates.length === 0) {
      setNotice('追加または更新の差分がありません。')
      return
    }

    setSubmitting(true)

    try {
      const sourceVersion = new Date().toISOString()
      const merged = mergeApprovedEntries(contacts, rows, sourceVersion)
      await replaceContacts(merged.entries)

      const historyRow: UpdateHistory = {
        id: crypto.randomUUID(),
        kind: 'import',
        appliedAt: new Date().toISOString(),
        sourceVersion,
        added: merged.added,
        updated: merged.updated,
        removed: merged.removed,
        approvedApplied: merged.summary.approvedApplied,
        autoApproved: merged.summary.autoApproved,
        reviewRequired: merged.summary.reviewRequired,
      }

      await addHistory(historyRow)
      setContacts(merged.entries)
      setHistory((prev) => [historyRow, ...prev])
      setRows([])
      setActiveRowId(null)
      setNotice(`登録を反映しました。追加 ${merged.added} 件 / 更新 ${merged.updated} 件`)
    } catch (error) {
      reportError('admin-apply', error)
      setNotice('登録処理に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const hasApplicableChanges = mergePreview.additions.length > 0 || mergePreview.updates.length > 0

  return (
    <main className="app-shell">
      <AdminPinGate>
        <div className="space-y-4">
          <section className="panel-surface p-4">
            <div className="flex flex-col gap-3">
              <div>
                <div className="soft-label">Secure Admin</div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">OCR 取り込みと登録</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  撮影、OCR、差分確認、登録をスマホ 1 画面の流れで進められます。警告のない高信頼行は自動承認候補にします。
                </p>
              </div>
              <Link href="/" className="touch-button w-full bg-slate-900 text-white sm:w-auto">
                検索画面へ戻る
              </Link>
            </div>

            {notice && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                {notice}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="panel-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">登録対象</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{approvedCount}</div>
            </div>
            <div className="panel-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">自動承認候補</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{autoApprovedCount}</div>
            </div>
            <div className="panel-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">要確認</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{needsReviewCount}</div>
            </div>
            <div className="panel-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">表示件数</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{visibleRows.length}</div>
            </div>
          </section>

          <UploadPanel
            existingContacts={contacts}
            rows={rows}
            activeRowId={activeRowId}
            onActiveRowChange={setActiveRowId}
            onImported={handleImported}
          />

          <section className="panel-surface p-4">
            <div className="soft-label">Step 3</div>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">レビューカード</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  氏名、番号、警告、承認状態を 1 件ずつ確認できます。必要な行だけ手修正してください。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`touch-button ${filterMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  すべて
                </button>
                <button
                  onClick={() => setFilterMode('needs-review')}
                  className={`touch-button ${filterMode === 'needs-review' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-900'}`}
                >
                  要確認のみ
                </button>
                <button
                  onClick={() => setFilterMode('auto-approved')}
                  className={`touch-button ${filterMode === 'auto-approved' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-900'}`}
                >
                  自動承認候補のみ
                </button>
              </div>
            </div>

            <div className="mt-4">
              <ReviewTable
                rows={visibleRows}
                activeRowId={activeRowId}
                onSelectRow={setActiveRowId}
                onFieldChange={handleFieldChange}
                onToggleApprove={toggleApprove}
              />
            </div>
          </section>

          <DiffPreview preview={mergePreview} />

          <section className="panel-surface p-4">
            <h2 className="section-heading">更新履歴</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {history.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3">履歴はまだありません。</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="font-semibold text-slate-800">{item.kind === 'seed' ? '初期データ投入' : 'OCR 取り込み'}</div>
                      <div>{new Date(item.appliedAt).toLocaleString('ja-JP')}</div>
                    </div>
                    <div className="mt-2 leading-6 text-slate-600">
                      追加 {item.added} / 更新 {item.updated} / 登録 {item.approvedApplied} / 自動承認 {item.autoApproved} / 要確認 {item.reviewRequired}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="bottom-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-5xl px-3">
          <div className="panel-surface rounded-b-none border-b-0 p-3 sm:rounded-[24px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-6 text-slate-600">
                <div className="font-semibold text-slate-900">承認済みのみ登録</div>
                <div>登録対象 {approvedCount} 件 / 要確認 {needsReviewCount} 件</div>
              </div>
              <button
                onClick={applyApproved}
                disabled={submitting || !hasApplicableChanges}
                className="touch-button w-full bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting ? '登録中...' : '承認済みを登録'}
              </button>
            </div>
          </div>
        </div>
      </AdminPinGate>
    </main>
  )
}
