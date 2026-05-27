'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { type Lang } from '@/lib/i18n/translations'

interface Props {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LANGS: { id: Lang; code: string; label: string }[] = [
  { id: 'fr', code: 'fr', label: 'Français' },
  { id: 'ar', code: 'sa', label: 'العربية'  },
  { id: 'en', code: 'gb', label: 'English'  },
  { id: 'tr', code: 'tr', label: 'Türkçe'   },
]

function Flag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width={24}
      height={18}
      alt={code}
      className="rounded-sm object-cover shrink-0"
      style={{ display: 'block' }}
    />
  )
}

export default function LangSwitcher({ lang, setLang }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-500 hover:text-gray-700"
        aria-label="Changer de langue"
      >
        <Globe size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-w-[160px] py-1">
          {LANGS.map(({ id, code, label }) => (
            <button
              key={id}
              onClick={() => { setLang(id); setOpen(false) }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition text-left ${
                lang === id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Flag code={code} />
              <span>{label}</span>
              {lang === id && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
