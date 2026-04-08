import Link from 'next/link'

export function Header() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="soft-label">Local First PWA</div>
        <h1 className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950">院内電話帳</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          名前が分かればすぐに PHS 番号を探せる、スマホ優先のローカル電話帳です。
        </p>
      </div>

      <Link href="/admin" className="touch-button w-full bg-blue-600 text-white sm:w-auto">
        管理画面
      </Link>
    </div>
  )
}
