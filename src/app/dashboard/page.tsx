'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Users, Copy, Check, LogOut, Play, Library, Radio, UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Classe, Profile, Session } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Classe[]>([])
  const [sessionsActives, setSessionsActives] = useState<Record<string, Session>>({})
  const [chargement, setChargement] = useState(true)
  const [showNouvelleClasse, setShowNouvelleClasse] = useState(false)

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Utiliser les métadonnées si le profil DB n'est pas lisible
    const role = prof?.role || user.user_metadata?.role
    if (role && role !== 'enseignant') { router.push('/mes-classes'); return }

    setProfile(prof || {
      id: user.id,
      email: user.email || '',
      nom: user.user_metadata?.nom || '',
      prenom: user.user_metadata?.prenom || '',
      role: user.user_metadata?.role || 'enseignant',
      created_at: new Date().toISOString(),
    })

    const { data: mesClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('enseignant_id', user.id)
      .order('created_at', { ascending: false })

    setClasses(mesClasses || [])

    // Charger les sessions actives (en_cours ou pause)
    if (mesClasses && mesClasses.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .in('classe_id', mesClasses.map((c: { id: string }) => c.id))
        .in('statut', ['en_cours', 'pause'])
        .order('started_at', { ascending: false })

      const map: Record<string, Session> = {}
      for (const s of (sessions || [])) {
        // Garder seulement la plus récente par classe
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            <span className="font-bold text-gray-800">L&apos;École du Savoir</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/bibliotheque"
              className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 text-sm font-medium transition"
            >
              <Library size={16} />
              Bibliothèque
            </Link>
            <span className="text-gray-600 text-sm">
              Bonjour, <strong>{profile?.prenom}</strong>
            </span>
            <button
              onClick={handleDeconnexion}
              className="text-gray-400 hover:text-gray-600 transition"
              title="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Bandeau cours en cours */}
        {Object.values(sessionsActives).map(session => {
          const classe = classes.find(c => c.id === session.classe_id)
          return (
            <Link
              key={session.id}
              href={`/session/${session.id}/enseignant`}
              className="flex items-center justify-between bg-green-500 text-white rounded-2xl px-5 py-4 mb-6 hover:bg-green-600 transition shadow-lg shadow-green-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Radio size={20} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-100 uppercase tracking-wide">
                    {session.statut === 'pause' ? '⏸ Cours en pause' : '● Cours en direct'}
                  </p>
                  <p className="font-bold text-lg leading-tight">
                    {session.titre}
                    {classe && <span className="font-normal opacity-80"> — {classe.nom}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-xl font-bold text-sm shrink-0">
                <Play size={15} />
                Reprendre
              </div>
            </Link>
          )
        })}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes classes</h1>
            <p className="text-gray-500 mt-1">{classes.length} classe{classes.length > 1 ? 's' : ''} créée{classes.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowNouvelleClasse(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus size={18} />
            Nouvelle classe
          </button>
        </div>

        {/* Liste des classes */}
        {classes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Aucune classe pour l&apos;instant
            </h2>
            <p className="text-gray-400 mb-6">Crée ta première classe pour commencer !</p>
            <button
              onClick={() => setShowNouvelleClasse(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              Créer ma première classe
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {classes.map((classe) => (
              <CarteClasse key={classe.id} classe={classe} sessionActive={sessionsActives[classe.id] || null} />
            ))}
          </div>
        )}
      </main>

      {/* Modal nouvelle classe */}
      {showNouvelleClasse && (
        <ModalNouvelleClasse
          onClose={() => setShowNouvelleClasse(false)}
          onCreee={(nouvelleClasse) => {
            setClasses([nouvelleClasse, ...classes])
            setShowNouvelleClasse(false)
          }}
          enseignantId={profile!.id}
        />
      )}
    </div>
  )
}

function CarteClasse({ classe, sessionActive }: { classe: Classe; sessionActive: Session | null }) {
  const [copie, setCopie] = useState(false)

  function copierCode() {
    navigator.clipboard.writeText(classe.code_acces)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition ${
      sessionActive ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-gray-900 text-lg">{classe.nom}</h3>
            {sessionActive && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {sessionActive.statut === 'pause' ? 'Pause' : 'En direct'}
              </span>
            )}
          </div>
          {classe.description && (
            <p className="text-gray-500 text-sm mt-0.5">{classe.description}</p>
          )}
        </div>
        <div className="bg-indigo-50 p-2 rounded-xl shrink-0">
          <Users size={20} className="text-indigo-500" />
        </div>
      </div>

      {/* Code d'accès */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Code d&apos;accès élèves</p>
          <p className="font-mono font-bold text-gray-800 tracking-widest text-lg">
            {classe.code_acces.toUpperCase()}
          </p>
        </div>
        <button onClick={copierCode} className="text-gray-400 hover:text-indigo-600 transition" title="Copier le code">
          {copie ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/dashboard/classe/${classe.id}`}
          className="flex-1 text-center border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition"
        >
          Gérer
        </Link>
        {sessionActive ? (
          <Link
            href={`/session/${sessionActive.id}/enseignant`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition"
          >
            <Play size={14} />
            Reprendre le cours
          </Link>
        ) : (
          <Link
            href={`/dashboard/classe/${classe.id}/nouvelle-session`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Play size={14} />
            Lancer un cours
          </Link>
        )}
      </div>
    </div>
  )
}

function ModalNouvelleClasse({
  onClose,
  onCreee,
  enseignantId,
}: {
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
    setChargement(true)
    setErreur('')

    const supabase = createClient()

    // Récupérer l'utilisateur connecté pour s'assurer d'avoir le bon ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErreur('Session expirée, reconnecte-toi.'); setChargement(false); return }

    const { data, error } = await supabase
      .from('classes')
      .insert({ nom, description: description || null, enseignant_id: user.id })
      .select()
      .single()

    if (error) {
      setErreur(`Erreur : ${error.message}`)
      setChargement(false)
      return
    }
    if (data) onCreee(data)
    setChargement(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nouvelle classe</h2>
        <form onSubmit={handleCreer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la classe *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              placeholder="ex : CM2 — Mathématiques"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Classe de 6ème, niveau débutant..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          {erreur && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={chargement || !nom}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {chargement && <Loader2 size={16} className="animate-spin" />}
              Créer la classe
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Loader2({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function EcranChargement() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Chargement...</p>
      </div>
    </div>
  )
}
