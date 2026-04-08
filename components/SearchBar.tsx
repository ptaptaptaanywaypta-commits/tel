'use client'

type Props = {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="sticky sticky-safe-top z-20 rounded-[24px] border border-white/90 bg-white/95 p-3 shadow-lg backdrop-blur-xl">
      <label className="field-label px-1">名前・部署・番号で検索</label>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="例: 山田 / 外来 / 1234"
          className="min-h-[52px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="touch-button shrink-0 bg-slate-100 text-slate-700"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
