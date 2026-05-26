'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Loader2, CheckCircle, ArrowLeft, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const RETOUR: Record<string, string> = {
  enseignant: '/dashboard',
  eleve: '/mes-classes',
  parent: '/espace-parent',
  admin: '/admin',
}

export default function ProfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [succes, setSucces] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => { chargerProfil() }, [])

  async function chargerProfil() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (prof) {
      setProfile(prof)
      setPrenom(prof.prenom || '')
      setNom(prof.nom || '')
      setEmail(prof.email || '')
    }
    setChargement(false)
  }

  async function handleSauvegarderInfos(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setSucces('')
    setSauvegarde(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Mettre à jour le profil
    const { error: errProfil } = await supabase
      .from('profiles')
      .update({ prenom, nom, email })
      .eq('id', user.id)

    // Mettre à jour l'email dans auth si changé
    if (email !== profile?.email) {
      await supabase.auth.updateUser({ email })
    }

    if (errProfil) {
      setErreur('Erreur lors de la mise à jour du profil.')
    } else {
      setSucces('infos')
      setProfile(prev => prev ? { ...prev, prenom, nom, email } : null)
    }
    setSauvegarde(false)
  }

  async function handleChangerMotDePasse(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setSucces('')

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setSauvegarde(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: motDePasse })

    if (error) {
      setErreur('Erreur lors du changement de mot de passe.')
    } else {
      setSucces('mdp')
      setMotDePasse('')
      setConfirmation('')
    }
    setSauvegarde(false)
  }

  const lienRetour = RETOUR[profile?.role || ''] || '/'

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={22} />
            <span className="font-bold text-gray-800 text-sm">L&apos;École du Savoir</span>
          </div>
          <Link href={lienRetour} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition">
            <ArrowLeft size={16} /> Retour
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mon profil</h1>
          <p className="text-gray-500 text-sm mt-1">
            {profile?.role === 'enseignant' ? '👩‍🏫 Enseignant'
              : profile?.role === 'eleve' ? '🎓 Élève'
              : profile?.role === 'parent' ? '👨‍👩‍👧 Parent'
              : '🔧 Administrateur'}
          </p>
        </div>

        {/* Avatar initiales */}
        <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-700 font-black text-2xl">
            {prenom[0]}{nom[0]}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{prenom} {nom}</p>
            <p className="text-gray-400 text-sm">{email}</p>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50">
            <User size={18} className="text-indigo-500" />
            <h2 className="font-bold text-gray-900">Informations personnelles</h2>
          </div>
          <form onSubmit={handleSauvegarderInfos} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={13} className="inline mr-1" />
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
              {email !== profile?.email && (
                <p className="text-xs text-amber-600 mt-1">
                  Un email de confirmation sera envoyé à la nouvelle adresse.
                </p>
              )}
            </div>

            {erreur && succes !== 'infos' && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>
            )}
            {succes === 'infos' && (
              <p className="text-green-600 text-sm bg-green-50 rounded-lg px-4 py-3 flex items-center gap-2">
                <CheckCircle size={16} /> Profil mis à jour avec succès.
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sauvegarde}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60 flex items-center gap-2"
              >
                {sauvegarde && <Loader2 size={15} className="animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>

        {/* Changer le mot de passe */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50">
            <Lock size={18} className="text-indigo-500" />
            <h2 className="font-bold text-gray-900">Changer le mot de passe</h2>
          </div>
          <form onSubmit={handleChangerMotDePasse} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={visible ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={e => setMotDePasse(e.target.value)}
                  minLength={6}
                  placeholder="6 caractères minimum"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
                <button type="button" onClick={() => setVisible(!visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input
                type={visible ? 'text' : 'password'}
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                placeholder="Répète le mot de passe"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>

            {erreur && succes !== 'mdp' && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>
            )}
            {succes === 'mdp' && (
              <p className="text-green-600 text-sm bg-green-50 rounded-lg px-4 py-3 flex items-center gap-2">
                <CheckCircle size={16} /> Mot de passe changé avec succès.
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sauvegarde || !motDePasse}
                className="bg-gray-800 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-900 transition disabled:opacity-40 flex items-center gap-2"
              >
                {sauvegarde && <Loader2 size={15} className="animate-spin" />}
                Changer le mot de passe
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
