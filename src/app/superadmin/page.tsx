'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, LogOut, Building2, Plus, Copy, Check, Users,
  GraduationCap, School, UserCircle, RefreshCw, Trash2, ChevronDown, ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Etablissement {
  id: string
  nom: string
  adresse: string | null
  code_acces: string
  created_at: string
}

interface EtablissementAvecStats extends Etablissement {
  nb_enseignants: number
  nb_eleves: number
  nb_classes: number
  admins: { id: string; prenom: string; nom: string; email: string }[]
  expanded: boolean
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [etablissements, setEtablissements] = useState<EtablissementAvecStats[]>([])
  const [chargement, setChargement] = useState(true)
  const [onglet, setOnglet] = useState<'etablissements' | 'creer_etab' | 'creer_admin'>('etablissements')

  // Formulaire nouvel établissement
  const [nomEtab, setNomEtab] = useState('')
  const [adresseEtab, setAdresseEtab] = useState('')
  const [creationEtabEnCours, setCreationEtabEnCours] = useState(false)
  const [erreurEtab, setErreurEtab] = useState('')
  const [succesEtab, setSuccesEtab] = useState('')

  // Formulaire nouvel admin
  const [prenomAdmin, setPrenomAdmin] = useState('')
  const [nomAdmin, setNomAdmin] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [mdpAdmin, setMdpAdmin] = useState('')
  const [etabChoisi, setEtabChoisi] = useState('')
  const [creationAdminEnCours, setCreationAdminEnCours] = useState(false)
  const [erreurAdmin, setErreurAdmin] = useState('')
  const [succesAdmin, setSuccesAdmin] = useState('')

  // Copié dans le presse-papier
  const [codeCopie, setCodeCopie] = useState<string | null>(null)

  useEffect(() => { chargerDonnees() }, [])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (!prof || prof.role !== 'superadmin') {
      router.push('/connexion')
      return
    }
    setProfile(prof)

    // Charger tous les établissements
    const { data: etabs } = await supabase
      .from('etablissements')
      .select('*')
      .order('created_at', { ascending: false })

    // Pour chaque établissement, charger les stats
    const etabsAvecStats = await Promise.all(
      (etabs || []).map(async (e: Etablissement) => {
        const [
          { count: nb_enseignants },
          { count: nb_eleves },
          { count: nb_classes },
          { data: admins },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'enseignant').eq('etablissement_id', e.id),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'eleve').eq('etablissement_id', e.id),
          supabase.from('classes').select('*', { count: 'exact', head: true }).eq('etablissement_id', e.id),
          supabase.from('profiles').select('id, prenom, nom, email').eq('role', 'admin').eq('etablissement_id', e.id),
        ])
        return {
          ...e,
          nb_enseignants: nb_enseignants || 0,
          nb_eleves: nb_eleves || 0,
          nb_classes: nb_classes || 0,
          admins: admins || [],
          expanded: false,
        }
      })
    )

    setEtablissements(etabsAvecStats)
    setChargement(false)
  }

  async function creerEtablissement(e: React.FormEvent) {
    e.preventDefault()
    setErreurEtab('')
    setSuccesEtab('')
    setCreationEtabEnCours(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('etablissements')
      .insert({ nom: nomEtab.trim(), adresse: adresseEtab.trim() || null })
      .select()
      .single()

    if (error) {
      setErreurEtab("Erreur lors de la création : " + error.message)
      setCreationEtabEnCours(false)
      return
    }

    setSuccesEtab(`Établissement créé ! Code d'accès : ${data.code_acces}`)
    setNomEtab('')
    setAdresseEtab('')
    setCreationEtabEnCours(false)
    chargerDonnees()
  }

  async function creerAdmin(e: React.FormEvent) {
    e.preventDefault()
    setErreurAdmin('')
    setSuccesAdmin('')
    setCreationAdminEnCours(true)

    // Passer par l'API route (service role key, bypasse RLS)
    const res = await fetch('/api/superadmin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: prenomAdmin,
        nom: nomAdmin,
        email: emailAdmin.trim(),
        password: mdpAdmin,
        etablissement_id: etabChoisi,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setErreurAdmin(json.error === 'User already registered'
        ? 'Cet email est déjà utilisé.'
        : 'Erreur : ' + (json.error || 'Inconnue'))
      setCreationAdminEnCours(false)
      return
    }

    setSuccesAdmin(`Administrateur ${prenomAdmin} ${nomAdmin} créé avec succès.`)
    setPrenomAdmin('')
    setNomAdmin('')
    setEmailAdmin('')
    setMdpAdmin('')
    setEtabChoisi('')
    setCreationAdminEnCours(false)
    chargerDonnees()
  }

  async function copierCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCodeCopie(code)
    setTimeout(() => setCodeCopie(null), 2000)
  }

  function toggleExpand(id: string) {
    setEtablissements(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e))
  }

  async function handleDeconnexion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  const totalEnseignants = etablissements.reduce((s, e) => s + e.nb_enseignants, 0)
  const totalEleves = etablissements.reduce((s, e) => s + e.nb_eleves, 0)
  const totalClasses = etablissements.reduce((s, e) => s + e.nb_classes, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="text-indigo-600" size={24} />
            <span className="font-bold text-gray-800">L&apos;École du Savoir</span>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">{profile?.prenom} {profile?.nom}</span>
            <Link href="/profil" className="text-gray-400 hover:text-indigo-600 transition"><UserCircle size={20} /></Link>
            <button onClick={handleDeconnexion} className="text-gray-400 hover:text-gray-600 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Super Administration</h1>
            <p className="text-gray-500 text-sm mt-1">Gestion globale de tous les établissements</p>
          </div>
          <button
            onClick={chargerDonnees}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 rounded-xl px-4 py-2 transition"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Établissements', value: etablissements.length, icon: <Building2 size={20} />, color: 'bg-purple-500' },
            { label: 'Enseignants', value: totalEnseignants, icon: <School size={20} />, color: 'bg-indigo-500' },
            { label: 'Élèves', value: totalEleves, icon: <GraduationCap size={20} />, color: 'bg-green-500' },
            { label: 'Classes', value: totalClasses, icon: <Users size={20} />, color: 'bg-blue-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>
                {s.icon}
              </div>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {([
            { id: 'etablissements', label: 'Établissements' },
            { id: 'creer_etab', label: '+ Nouvel établissement' },
            { id: 'creer_admin', label: '+ Nouvel admin' },
          ] as const).map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                onglet === o.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Liste des établissements */}
        {onglet === 'etablissements' && (
          <div className="space-y-4">
            {etablissements.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center">
                <Building2 size={40} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400">Aucun établissement créé</p>
                <button
                  onClick={() => setOnglet('creer_etab')}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  Créer le premier établissement
                </button>
              </div>
            )}
            {etablissements.map(etab => (
              <div key={etab.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Building2 size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{etab.nom}</h3>
                      {etab.adresse && <p className="text-gray-400 text-sm">{etab.adresse}</p>}
                      <p className="text-gray-400 text-xs mt-0.5">
                        Créé le {new Date(etab.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Code accès */}
                    <button
                      onClick={() => copierCode(etab.code_acces)}
                      className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl px-4 py-2 transition group"
                    >
                      <span className="font-mono font-bold text-indigo-700 tracking-widest text-sm">{etab.code_acces}</span>
                      {codeCopie === etab.code_acces
                        ? <Check size={14} className="text-green-500" />
                        : <Copy size={14} className="text-indigo-400 group-hover:text-indigo-600" />
                      }
                    </button>
                    <button
                      onClick={() => toggleExpand(etab.id)}
                      className="text-gray-400 hover:text-gray-600 transition p-2"
                    >
                      {etab.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Stats mini */}
                <div className="px-6 pb-4 flex items-center gap-6 border-t border-gray-50">
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <School size={14} className="text-indigo-400" />
                    <strong className="text-gray-900">{etab.nb_enseignants}</strong> enseignant{etab.nb_enseignants > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-green-400" />
                    <strong className="text-gray-900">{etab.nb_eleves}</strong> élève{etab.nb_eleves > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-blue-400" />
                    <strong className="text-gray-900">{etab.nb_classes}</strong> classe{etab.nb_classes > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Users size={14} className="text-purple-400" />
                    <strong className="text-gray-900">{etab.admins.length}</strong> admin{etab.admins.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Admins (expanded) */}
                {etab.expanded && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Administrateurs</p>
                    {etab.admins.length === 0 ? (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-400 text-sm">Aucun admin assigné</p>
                        <button
                          onClick={() => { setEtabChoisi(etab.id); setOnglet('creer_admin') }}
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} /> Créer un admin
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {etab.admins.map(admin => (
                          <div key={admin.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                              {admin.prenom?.[0]}{admin.nom?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{admin.prenom} {admin.nom}</p>
                              <p className="text-xs text-gray-400">{admin.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Créer un établissement */}
        {onglet === 'creer_etab' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Nouvel établissement</h2>
                  <p className="text-sm text-gray-400">Un code d&apos;accès unique sera généré automatiquement</p>
                </div>
              </div>

              <form onSubmit={creerEtablissement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;établissement *</label>
                  <input
                    type="text"
                    value={nomEtab}
                    onChange={(e) => setNomEtab(e.target.value)}
                    required
                    placeholder="École Al-Hikma"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (optionnel)</label>
                  <input
                    type="text"
                    value={adresseEtab}
                    onChange={(e) => setAdresseEtab(e.target.value)}
                    placeholder="12 rue de la Paix, Paris"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {erreurEtab && (
                  <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{erreurEtab}</p>
                )}
                {succesEtab && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <p className="text-green-700 text-sm font-semibold">{succesEtab}</p>
                    <p className="text-green-600 text-xs mt-1">Communiquez ce code aux enseignants lors de leur inscription.</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creationEtabEnCours}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creationEtabEnCours ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  Créer l&apos;établissement
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Créer un admin */}
        {onglet === 'creer_admin' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <UserCircle size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Nouvel administrateur</h2>
                  <p className="text-sm text-gray-400">Créer un compte admin lié à un établissement</p>
                </div>
              </div>

              <form onSubmit={creerAdmin} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={prenomAdmin}
                      onChange={(e) => setPrenomAdmin(e.target.value)}
                      required
                      placeholder="Karim"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={nomAdmin}
                      onChange={(e) => setNomAdmin(e.target.value)}
                      required
                      placeholder="Benali"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    required
                    placeholder="admin@ecole.fr"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    value={mdpAdmin}
                    onChange={(e) => setMdpAdmin(e.target.value)}
                    required
                    minLength={6}
                    placeholder="6 caractères minimum"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Établissement *</label>
                  <select
                    value={etabChoisi}
                    onChange={(e) => setEtabChoisi(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="">— Choisir un établissement —</option>
                    {etablissements.map(e => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </select>
                  {etablissements.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Aucun établissement disponible.{' '}
                      <button type="button" onClick={() => setOnglet('creer_etab')} className="underline">Créez-en un d&apos;abord.</button>
                    </p>
                  )}
                </div>

                {erreurAdmin && (
                  <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{erreurAdmin}</p>
                )}
                {succesAdmin && (
                  <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-semibold">{succesAdmin}</p>
                )}

                <button
                  type="submit"
                  disabled={creationAdminEnCours || etablissements.length === 0}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creationAdminEnCours ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  Créer l&apos;administrateur
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
