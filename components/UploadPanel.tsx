'use client'

import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { reviewImportedEntries } from '@/lib/aiReview'
import { createOcrService, ParsedDirectoryRow, TesseractOcrService } from '@/lib/ocr'
import { reportError } from '@/lib/safeLog'
import { DirectoryEntry } from '@/lib/types'

type Props = {
  existingContacts: DirectoryEntry[]
  rows: ParsedDirectoryRow[]
  activeRowId?: string | null
  onActiveRowChange: (tempId: string | null) => void
  onImported: (rows: ParsedDirectoryRow[]) => void
}

type ImageMetrics = {
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

export function UploadPanel({
  existingContacts,
  rows,
  activeRowId,
  onActiveRowChange,
  onImported,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('カメラで撮影すると、そのまま OCR と確認に進みます。')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [imageMetrics, setImageMetrics] = useState<ImageMetrics | null>(null)
  const serviceRef = useRef<TesseractOcrService | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      void serviceRef.current?.dispose()
    }
  }, [])

  const resetPreview = () => {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return null
    })
    setImageMetrics(null)
    onImported([])
    onActiveRowChange(null)
    setStatusText('再撮影できます。画像は端末内だけで処理します。')
    setProgress(0)
    setProgressLabel('')
    setErrorMessage(null)
  }

  const onFileChange = async (file?: File) => {
    if (!file) {
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setProgress(0)
    setProgressLabel('OCR を開始しています')
    setImageMetrics(null)

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return nextPreviewUrl
    })

    try {
      if (!serviceRef.current) {
        serviceRef.current = createOcrService({
          onProgress: (nextProgress) => {
            setProgress(nextProgress.progress)
            setProgressLabel(nextProgress.status)
          },
        })
      }

      const extractedLines = await serviceRef.current.extractLines(file)
      const parsedRows = await serviceRef.current.parseDirectoryRows(extractedLines)
      const reviewedRows = reviewImportedEntries(parsedRows, existingContacts)

      onImported(reviewedRows)
      onActiveRowChange(reviewedRows[0]?.tempId ?? null)
      setStatusText(`OCR で ${reviewedRows.length} 件を抽出しました。要確認のみ手直しして登録できます。`)
      setProgress(1)
      setProgressLabel('OCR が完了しました')
    } catch (error) {
      reportError('upload-panel-extract', error)
      setErrorMessage('OCR に失敗しました。写真のブレや影を避けて再撮影してください。')
      setStatusText('OCR に失敗しました。')
      setProgress(0)
      setProgressLabel('')
      onImported([])
    } finally {
      setLoading(false)
    }
  }

  const highlightedBoxes = rows.filter((row) => row.boundingBox)

  return (
    <section className="panel-surface p-4">
      <div className="soft-label">Step 1</div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">撮影して OCR を実行</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        カメラで一覧表を撮影し、そのまま OCR へ進みます。元画像は永続保存せず、この画面上の確認だけに使います。
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="touch-button w-full bg-blue-600 text-white"
        >
          カメラで撮影
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="touch-button w-full bg-slate-100 text-slate-700"
        >
          写真を選ぶ
        </button>
        {previewUrl && (
          <button type="button" onClick={resetPreview} className="touch-button w-full bg-white text-slate-700 ring-1 ring-slate-200">
            再撮影する
          </button>
        )}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void onFileChange(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void onFileChange(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span className="min-w-0 truncate">{progressLabel || 'Ready'}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{statusText}</p>
        {errorMessage && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="section-heading">画像プレビュー</div>
            <p className="mt-1 text-sm text-slate-500">選択中の OCR 行は枠で表示します。</p>
          </div>
          {rows.length > 0 && <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">抽出 {rows.length} 件</div>}
        </div>

        {previewUrl ? (
          <div className="relative overflow-hidden rounded-[20px] bg-white">
            <img
              src={previewUrl}
              alt="アップロードした一覧表のプレビュー"
              className="w-full"
              onLoad={(event) => {
                const image = event.currentTarget
                setImageMetrics({
                  width: image.clientWidth,
                  height: image.clientHeight,
                  naturalWidth: image.naturalWidth,
                  naturalHeight: image.naturalHeight,
                })
              }}
            />

            {imageMetrics && highlightedBoxes.length > 0 && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {highlightedBoxes.map((row) => {
                  if (!row.boundingBox) {
                    return null
                  }

                  const scaleX = imageMetrics.width / imageMetrics.naturalWidth
                  const scaleY = imageMetrics.height / imageMetrics.naturalHeight

                  return (
                    <div
                      key={row.tempId}
                      className={classNames(
                        'absolute rounded-lg border-2 transition',
                        activeRowId === row.tempId ? 'border-amber-400 bg-amber-300/20' : 'border-blue-300 bg-blue-300/10',
                      )}
                      style={{
                        left: `${row.boundingBox.x * scaleX}px`,
                        top: `${row.boundingBox.y * scaleY}px`,
                        width: `${row.boundingBox.width * scaleX}px`,
                        height: `${row.boundingBox.height * scaleY}px`,
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-white px-4 text-center text-sm leading-6 text-slate-500">
            カメラで撮影すると、ここに画像と OCR 対象位置が表示されます。
          </div>
        )}
      </div>
    </section>
  )
}
