import { MergePreview } from '@/lib/diff'

export function DiffPreview({ preview }: { preview: MergePreview }) {
  return (
    <section className="panel-surface p-4">
      <div className="soft-label">Step 2</div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">差分プレビュー</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        登録対象だけを集計し、新規追加・番号変更・要確認をカードで確認できます。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-blue-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">自動承認候補</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{preview.summary.autoApproved}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">要確認</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{preview.summary.reviewRequired}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">新規追加</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{preview.summary.added}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">番号変更</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{preview.summary.updated}</div>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-800">新規追加</div>
          <div className="space-y-3">
            {preview.additions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">追加候補はありません。</div>
            ) : (
              preview.additions.map((change) => (
                <div key={change.tempId} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                  <div className="break-words text-sm font-semibold text-slate-900">{change.name}</div>
                  <div className="mt-2 break-all text-lg font-semibold tracking-[0.12em] text-slate-900">{change.nextPhs}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-800">番号変更</div>
          <div className="space-y-3">
            {preview.updates.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">変更候補はありません。</div>
            ) : (
              preview.updates.map((change) => (
                <div key={change.tempId} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="break-words text-sm font-semibold text-slate-900">{change.name}</div>
                  <div className="mt-2 break-all text-lg font-semibold tracking-[0.12em] text-slate-900">{change.nextPhs}</div>
                  <div className="mt-2 text-sm text-slate-500">変更前: {change.previousPhs}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-800">重複・要確認</div>
          <div className="space-y-3">
            {preview.reviewRequired.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">要確認の差分はありません。</div>
            ) : (
              preview.reviewRequired.map((change) => (
                <div key={change.tempId} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                  <div className="break-words text-sm font-semibold text-slate-900">{change.name}</div>
                  <div className="mt-2 break-all text-lg font-semibold tracking-[0.12em] text-slate-900">{change.nextPhs}</div>
                  <div className="mt-2 break-words text-sm leading-6 text-rose-900">{change.warnings.join(' / ') || '要確認です。'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
