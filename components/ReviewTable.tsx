'use client'

import classNames from 'classnames'
import { normalizeName, normalizePhs } from '@/lib/normalize'
import { ParsedDirectoryRow } from '@/lib/ocr/types'

type Props = {
  rows: ParsedDirectoryRow[]
  activeRowId?: string | null
  onSelectRow: (tempId: string) => void
  onToggleApprove: (tempId: string) => void
  onFieldChange: (tempId: string, field: 'normalizedName' | 'normalizedPhs', value: string) => void
}

function statusLabel(row: ParsedDirectoryRow) {
  if (row.reviewStatus === 'manually-approved') return '手動承認済み'
  if (row.reviewStatus === 'rejected') return '登録対象外'
  if (row.autoApproved) return '自動承認候補'
  return '要確認'
}

export function ReviewTable({ rows, activeRowId, onSelectRow, onToggleApprove, onFieldChange }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        OCR 結果はまだありません。
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <article
          key={row.tempId}
          className={classNames(
            'mobile-card p-4 transition',
            row.warnings.length > 0 ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200',
            activeRowId === row.tempId ? 'ring-2 ring-blue-400/40' : '',
          )}
        >
          <button
            type="button"
            onClick={() => onSelectRow(row.tempId)}
            className="w-full text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">#{index + 1}</div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                OCR {Math.round(row.confidence * 100)}%
              </div>
              <div
                className={classNames(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  row.autoApproved ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900',
                )}
              >
                {statusLabel(row)}
              </div>
              {row.manualEdited && <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">手修正あり</div>}
            </div>

            <div className="mt-4 min-w-0">
              <div className="break-words text-xl font-semibold leading-tight text-slate-900">{row.normalizedName || '氏名未入力'}</div>
              <div className="mt-2 break-all text-[1.7rem] font-semibold leading-none tracking-[0.12em] text-blue-700">
                {row.normalizedPhs || '番号未入力'}
              </div>
            </div>
          </button>

          <div className="mt-4 space-y-4">
            <div>
              <label className="field-label">氏名を修正</label>
              <input
                value={row.normalizedName}
                onFocus={() => onSelectRow(row.tempId)}
                onChange={(event) => onFieldChange(row.tempId, 'normalizedName', normalizeName(event.target.value))}
                className="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] outline-none transition focus:border-blue-400"
              />
              <div className="mt-2 break-words text-xs text-slate-500">OCR 原文: {row.rawName || 'なし'}</div>
            </div>

            <div>
              <label className="field-label">PHS 番号を修正</label>
              <input
                value={row.normalizedPhs}
                inputMode="numeric"
                onFocus={() => onSelectRow(row.tempId)}
                onChange={(event) => onFieldChange(row.tempId, 'normalizedPhs', normalizePhs(event.target.value))}
                className="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] outline-none transition focus:border-blue-400"
              />
              <div className="mt-2 break-words text-xs text-slate-500">OCR 原文: {row.rawPhs || 'なし'}</div>
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-6 text-slate-600">
              <div className="font-semibold text-slate-700">OCR 行テキスト</div>
              <div className="mt-1 break-words">{row.rawText || 'なし'}</div>
            </div>
          </div>

          {row.warnings.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">要確認</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 break-words">
                {row.warnings.map((warning) => (
                  <li key={`${row.tempId}-${warning}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
              警告はありません。必要がなければこのまま登録対象にできます。
            </div>
          )}

          <button
            type="button"
            onClick={() => onToggleApprove(row.tempId)}
            aria-pressed={row.approved}
            className={classNames(
              'touch-button mt-4 w-full',
              row.approved ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white',
            )}
          >
            {row.approved ? '登録対象から外す' : '登録対象にする'}
          </button>
        </article>
      ))}
    </div>
  )
}
