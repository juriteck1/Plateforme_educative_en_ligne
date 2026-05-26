'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/useLanguage'
import LangSwitcher from '@/components/LangSwitcher'

export default function ConnexionPage() {
  const router = useRouter()
  const { lang, setLang, t, isRTL } = useLanguage()
  const cx = t.connexion

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  async function handleConnexion(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      })

      if (error) {
        setErreur(cx.erreur)
        setChargement(false)
        return
      }

      const role = data.user.user_metadata?.role

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const roleEffectif = profile?.role || role

      if (roleEffectif === 'superadmin') {
        router.push('/superadmin')
      } else if (roleEffectif === 'admin') {
        router.push('/admin')
      } else if (roleEffectif === 'enseignant' || roleEffectif === 'aesh') {
        router.push('/dashboard')
      } else if (roleEffectif === 'parent') {
        router.push('/espace-parent')
      } else {
        router.push('/mes-classes')
      }
    } catch {
      setErreur(cx.erreurReseau)
      setChargement(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            <span className="font-bold text-gray-800">L&apos;École du Savoir</span>
          </div>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">{cx.titre}</h1>

        <form onSubmit={handleConnexion} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {cx.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                {cx.motDePasse}
              </label>
              <Link href="/mot-de-passe-oublie" className="text-xs text-indigo-600 hover:underline">
                {cx.mdpOublie}
              </Link>
            </div>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {erreur && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {chargement && <Loader2 size={18} className="animate-spin" />}
            {cx.btn}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          {cx.pasDeCompte}{' '}
          <Link href="/inscription" className="text-indigo-600 font-medium hover:underline">
            {cx.inscription}
          </Link>
        </p>
      </div>
    </main>
  )
}
