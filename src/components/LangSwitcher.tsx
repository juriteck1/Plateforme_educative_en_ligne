'use client'

import { type Lang } from '@/lib/i18n/translations'

interface Props {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'FR' },
  { id: 'ar', label: 'AR' },
  { id: 'en', label: 'EN' },
  { id: 'tr', label: 'TR' },
]

export default function LangSwitcher({ lang, setLang }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
      {LANGS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setLang(id)}
          className={`px-2 py-1 rounded-md text-xs font-bold transition ${
            lang === id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
