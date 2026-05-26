'use client'

import { useState, useEffect, useCallback } from 'react'
import { translations, type Lang } from './translations'

const STORAGE_KEY = 'ecole_lang'
const VALID_LANGS: Lang[] = ['fr', 'ar', 'en', 'tr']

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && VALID_LANGS.includes(saved)) {
      setLangState(saved)
    }
  }, [])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)
  }, [])

  const t = translations[lang]
  const isRTL = lang === 'ar'

  return { lang, setLang, t, isRTL }
}
