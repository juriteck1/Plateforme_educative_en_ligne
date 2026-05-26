'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Loader2, School } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/useLanguage'
import LangSwitcher from '@/components/LangSwitcher'

type Role = 'enseignant' | 'aesh' | 'eleve' | 'parent'

export default function InscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, setLang, t, isRTL } = useLanguage()
  const ins = t.inscription

  const [role, setRole] = useState<Role>('enseignant')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [emailEnfant, setEmailEnfant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [codeEcole, setCodeEcole] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'enseignant') setRole('enseignant')
    if (roleParam === 'parent') setRole('parent')
  }, [searchParams])

  async function handleInscription(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const supabase = createClient()

    let etablissementId: string | null = null
    if (role === 'enseignant' || role === 'aesh') {
      if (!codeEcole.trim()) {
        setErreur(ins.erreurs.codeManquant)
        setChargement(false)
        return
      }
      const { data: etablissement } = await supabase
        .from('etablissements')
        .select('id, nom')
        .eq('code_acces', codeEcole.trim().toUpperCase())
        .single()

      if (!etablissement) {
        setErreur(ins.erreurs.codeInvalide)
        setChargement(false)
        return
      }
      etablissementId = etablissement.id
    }

    if (role === 'parent') {
      if (!emailEnfant.trim()) {
        setErreur(ins.erreurs.emailEnfantManquant)
        setChargement(false)
        return
      }
      const { data: enfantProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', emailEnfant.trim().toLowerCase())
        .single()

      if (!enfantProfile) {
        setErreur(ins.erreurs.eleveIntrouvable)
        setChargement(false)
        return
      }
      if (enfantProfile.role !== 'eleve') {
        setErreur(ins.erreurs.pasEleve)
        setChargement(false)
        return
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom, prenom, role } },
    })

    if (error) {
      setErreur(error.message === 'User already registered'
        ? ins.erreurs.emailExistant
        : ins.erreurs.generique)
      setChargement(false)
      return
    }

    if (!data.user) {
      setErreur(ins.erreurs.generique)
      setChargement(false)
      return
    }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      nom,
      prenom,
      role,
      ...(etablissementId ? { etablissement_id: etablissementId } : {}),
    }, { onConflict: 'id' })

    if (role === 'parent' && emailEnfant.trim()) {
      const { data: enfantData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailEnfant.trim().toLowerCase())
        .single()

      if (enfantData) {
        await supabase.from('parent_eleve').insert({
          parent_id: data.user.id,
          eleve_id: enfantData.id,
        })
      }
    }

    if (role === 'enseignant' || role === 'aesh') {
      router.push('/dashboard')
    } else if (role === 'parent') {
      router.push('/espace-parent')
    } else {
      router.push('/mes-classes')
    }
  }

  const ROLES: { id: Role; label: string; emoji: string; desc: string }[] = [
    { id: 'enseignant', emoji: '👩‍🏫', label: ins.roles.enseignant.label, desc: ins.roles.enseignant.desc },
    { id: 'aesh',       emoji: '🤝',  label: ins.roles.aesh.label,       desc: ins.roles.aesh.desc },
    { id: 'eleve',      emoji: '🎓',  label: ins.roles.eleve.label,      desc: ins.roles.eleve.desc },
    { id: 'parent',     emoji: '👨‍👩‍👧', label: ins.roles.parent.label,     desc: ins.roles.parent.desc },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            <span className="font-bold text-gray-800">L&apos;École du Savoir</span>
          </div>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-5 text-center">{ins.titre}</h1>

        {/* Rôles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {ROLES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition text-center ${
                role === r.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              <span className="text-xl">{r.emoji}</span>
              <span className="font-semibold text-xs">{r.label}</span>
              <span className={`text-xs leading-tight ${role === r.id ? 'text-indigo-100' : 'text-gray-400'}`}>{r.desc}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleInscription} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{ins.prenom}</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{ins.nom}</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ins.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Code école */}
          {(role === 'enseignant' || role === 'aesh') && (
            <div className="bg-indigo-50 rounded-xl px-4 py-4 border border-indigo-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-indigo-800 mb-1">
                <School size={14} />
                {ins.codeEcole.label}
              </label>
              <p className="text-xs text-indigo-600 mb-2">{ins.codeEcole.info}</p>
              <input
                type="text"
                value={codeEcole}
                onChange={(e) => setCodeEcole(e.target.value.toUpperCase())}
                required={role === 'enseignant'}
                placeholder={ins.codeEcole.placeholder}
                maxLength={8}
                className="w-full border border-indigo-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-mono tracking-widest uppercase"
              />
            </div>
          )}

          {/* Email enfant */}
          {role === 'parent' && (
            <div className="bg-amber-50 rounded-xl px-4 py-4 border border-amber-200">
              <label className="block text-sm font-semibold text-amber-800 mb-1">
                👦 {ins.emailEnfant.label}
              </label>
              <p className="text-xs text-amber-600 mb-2">{ins.emailEnfant.info}</p>
              <input
                type="email"
                value={emailEnfant}
                onChange={(e) => setEmailEnfant(e.target.value)}
                required={role === 'parent'}
                placeholder={ins.emailEnfant.placeholder}
                className="w-full border border-amber-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ins.motDePasse}</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              minLength={6}
              placeholder={ins.mdpPlaceholder}
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
            {ins.btn}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          {ins.dejaInscrit}{' '}
          <Link href="/connexion" className="text-indigo-600 font-medium hover:underline">
            {ins.seConnecter}
          </Link>
        </p>
      </div>
    </main>
  )
}
