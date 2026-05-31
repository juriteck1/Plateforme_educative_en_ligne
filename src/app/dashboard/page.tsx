'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, BookOpen, Users, Copy, Check, LogOut, Play,
  Library, Radio, MessageCircle, LayoutDashboard,
  GraduationCap, X, Pencil, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Classe, Profile, Session } from '@/types'

type Onglet = 'classes' | 'messagerie' | 'bibliotheque'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Classe[]>([])
  const [sessionsActives, setSessionsActives] = useState<Record<string, Session>>({})
  const [chargement, setChargement] = useState(true)
  const [showNouvelleClasse, setShowNouvelleClasse] = useState(false)
  const [onglet, setOnglet] = useState<Onglet>('classes')
  const [sidebarOuverte, setSidebarOuverte] = useState(false)

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const role = prof?.role || user.user_metadata?.role
    if (role && role !== 'enseignant') { router.push('/mes-classes'); return }

    setProfile(prof || {
      id: user.id, email: user.email || '',
      nom: user.user_metadata?.nom || '',
      prenom: user.user_metadata?.prenom || '',
      role: user.user_metadata?.role || 'enseignant',
      created_at: new Date().toISOString(),
    })

    const { data: mesClasses } = await supabase
      .from('classes').select('*').eq('enseignant_id', user.id).order('created_at', { ascending: false })

    setClasses(mesClasses || [])

    if (mesClasses && mesClasses.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions').select('*')
        .in('classe_id', mesClasses.map((c: { id: string }) => c.id))
        .in('statut', ['en_cours', 'pause'])
        .order('started_at', { ascending: false })

      const map: Record<string, Session> = {}
      for (const s of (sessions || [])) {
        if (!map[s.classe_id]) map[s.classe_id] = s
      }
      setSessionsActives(map)
    }

    setChargement(false)
  }

  async function handleDeconnexion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (chargement) return <EcranChargement />

  const NAV = [
    { id: 'classes'      as Onglet, label: 'Mes classes',   icon: <LayoutDashboard size={18} />, badge: classes.length },
    { id: 'messagerie'   as Onglet, label: 'Messagerie',    icon: <MessageCircle size={18} /> },
    { id: 'bibliotheque' as Onglet, label: 'Bibliothèque',  icon: <Library size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar gauche ── */}
      {/* Overlay mobile */}
      {sidebarOuverte && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOuverte(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-indigo-900 text-white flex flex-col z-30
        transform transition-transform duration-200
        ${sidebarOuverte ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-indigo-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-300" />
              <span className="font-bold text-sm">École du Savoir</span>
            </div>
            <button className="lg:hidden text-indigo-400 hover:text-white" onClick={() => setSidebarOuverte(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
              {profile?.prenom?.[0]}{profile?.nom?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{profile?.prenom} {profile?.nom}</p>
              <p className="text-xs text-indigo-400">Enseignant</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'messagerie') { router.push('/dashboard/messagerie'); return }
                if (item.id === 'bibliotheque') { router.push('/dashboard/bibliotheque'); return }
                setOnglet(item.id)
                setSidebarOuverte(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                onglet === item.id
                  ? 'bg-white/15 text-white'
                  : 'text-indigo-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span className="text-xs bg-indigo-700 px-2 py-0.5 rounded-full font-bold">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="px-3 py-4 border-t border-indigo-800 space-y-1">
          <Link href="/profil" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-300 hover:bg-white/10 hover:text-white text-sm font-medium transition">
            <GraduationCap size={18} /> Mon profil
          </Link>
          <button onClick={handleDeconnexion} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-300 hover:bg-white/10 hover:text-red-300 text-sm font-medium transition">
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Zone principale ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOuverte(true)} className="text-gray-500 hover:text-gray-800">
            <LayoutDashboard size={22} />
          </button>
          <span className="font-bold text-gray-800 text-sm">Dashboard</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 px-5 py-6 max-w-5xl w-full mx-auto">

          {/* Bandeau cours en cours */}
          {Object.values(sessionsActives).map(session => {
            const classe = classes.find(c => c.id === session.classe_id)
            return (
              <Link key={session.id} href={`/session/${session.id}/enseignant`}
                className="flex items-center justify-between bg-green-500 text-white rounded-2xl px-4 py-3 mb-5 hover:bg-green-600 transition shadow-lg shadow-green-200 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <Radio size={17} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-green-100 uppercase tracking-wide">
                      {session.statut === 'pause' ? '⏸ En pause' : '● En direct'}
                    </p>
                    <p className="font-bold text-sm truncate">
                      {session.titre}{classe && <span className="font-normal opacity-80"> — {classe.nom}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl font-bold text-sm shrink-0">
                  <Play size={13} /> Reprendre
                </div>
              </Link>
            )
          })}

          {/* ── Contenu onglet : Mes classes ── */}
          {onglet === 'classes' && (
            <>
              <div className="flex items-center justify-between mb-5 gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Mes classes</h1>
                  <p className="text-gray-400 text-sm mt-0.5">{classes.length} classe{classes.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowNouvelleClasse(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm shrink-0 text-sm"
                >
                  <Plus size={16} /> Nouvelle classe
                </button>
              </div>

              {classes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📚</div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune classe pour l&apos;instant</h2>
                  <p className="text-gray-400 mb-6 text-sm">Crée ta première classe pour commencer !</p>
                  <button onClick={() => setShowNouvelleClasse(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition text-sm">
                    Créer ma première classe
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {classes.map(classe => (
                    <CarteClasse key={classe.id} classe={classe} sessionActive={sessionsActives[classe.id] || null}
                    onModifiee={(c) => setClasses(classes.map(cl => cl.id === c.id ? c : cl))}
                    onSupprimee={(id) => setClasses(classes.filter(cl => cl.id !== id))}
                  />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal nouvelle classe */}
      {showNouvelleClasse && (
        <ModalNouvelleClasse
          onClose={() => setShowNouvelleClasse(false)}
          onCreee={(nouvelleClasse) => { setClasses([nouvelleClasse, ...classes]); setShowNouvelleClasse(false) }}
          enseignantId={profile!.id}
        />
      )}
    </div>
  )
}

// ─── Carte classe ─────────────────────────────────────────────────────────────
function CarteClasse({ classe, sessionActive, onModifiee, onSupprimee }: {
  classe: Classe
  sessionActive: Session | null
  onModifiee: (c: Classe) => void
  onSupprimee: (id: string) => void
}) {
  const [copie, setCopie] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [nomEdit, setNomEdit] = useState(classe.nom)
  const [descEdit, setDescEdit] = useState(classe.description || '')
  const [saving, setSaving] = useState(false)

  function copierCode() {
    navigator.clipboard.writeText(classe.code_acces)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  async function sauvegarder(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('classes')
      .update({ nom: nomEdit, description: descEdit || null })
      .eq('id', classe.id).select().single()
    if (data) onModifiee(data)
    setSaving(false)
    setShowEdit(false)
  }

  async function supprimer() {
    const supabase = createClient()
    await supabase.from('classes').delete().eq('id', classe.id)
    onSupprimee(classe.id)
    setShowConfirmDelete(false)
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition ${
        sessionActive ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-100'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="font-bold text-gray-900">{classe.nom}</h3>
              {sessionActive && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {sessionActive.statut === 'pause' ? 'Pause' : 'En direct'}
                </span>
              )}
            </div>
            {classe.description && <p className="text-gray-400 text-xs mt-0.5">{classe.description}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button onClick={() => setShowEdit(true)}
              className="p-1.5 text-gray-300 hover:text-indigo-500 transition rounded-lg hover:bg-indigo-50" title="Modifier">
              <Pencil size={14} />
            </button>
            <button onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition rounded-lg hover:bg-red-50" title="Supprimer">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Code d'accès */}
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Code d&apos;accès élèves</p>
            <p className="font-mono font-bold text-gray-800 tracking-widest">{classe.code_acces.toUpperCase()}</p>
          </div>
          <button onClick={copierCode} className="text-gray-400 hover:text-indigo-600 transition" title="Copier">
            {copie ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/dashboard/classe/${classe.id}`}
            className="flex-1 text-center border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition">
            Gérer
          </Link>
          {sessionActive ? (
            <Link href={`/session/${sessionActive.id}/enseignant`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition">
              <Play size={13} /> Reprendre
            </Link>
          ) : (
            <Link href={`/dashboard/classe/${classe.id}/nouvelle-session`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              <Play size={13} /> Lancer
            </Link>
          )}
        </div>
      </div>

      {/* Modal modifier */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Modifier la classe</h2>
            <form onSubmit={sauvegarder} className="space-y-3">
              <input type="text" value={nomEdit} onChange={e => setNomEdit(e.target.value)} required
                placeholder="Nom de la classe" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <textarea value={descEdit} onChange={e => setDescEdit(e.target.value)} rows={2}
                placeholder="Description (optionnel)" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving || !nomEdit}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Supprimer &quot;{classe.nom}&quot; ?</h2>
            <p className="text-gray-500 text-sm mb-5">Tous les cours, exercices et inscriptions seront définitivement supprimés.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmDelete(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
              <button onClick={supprimer}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Modal nouvelle classe ────────────────────────────────────────────────────
function ModalNouvelleClasse({ onClose, onCreee, enseignantId }: {
  onClose: () => void
  onCreee: (classe: Classe) => void
  enseignantId: string
}) {
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault()
    setChargement(true); setErreur('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErreur('Session expirée.'); setChargement(false); return }
    const { data, error } = await supabase.from('classes')
      .insert({ nom, description: description || null, enseignant_id: user.id })
      .select().single()
    if (error) { setErreur(`Erreur : ${error.message}`); setChargement(false); return }
    if (data) onCreee(data)
    setChargement(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Nouvelle classe</h2>
        <form onSubmit={handleCreer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe *</label>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)} required
              placeholder="ex : CM2 — Mathématiques"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Classe de 6ème, niveau débutant..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-sm" />
          </div>
          {erreur && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
              Annuler
            </button>
            <button type="submit" disabled={chargement || !nom}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-60 text-sm">
              {chargement ? 'Création...' : 'Créer la classe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EcranChargement() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📚</div>
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}
