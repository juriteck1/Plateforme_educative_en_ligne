'use client'

import { useEffect, useState, useRef } from 'react'
import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Pause, Play, Square, Send, Users, BookOpen, Video, ExternalLink, Library, ChevronDown, ChevronUp, ArrowLeft, FileText, ImageIcon, File, Upload, Trash2, Music, Plus, Link2, MessageCircle, Hand, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Session, Exercice, Reponse, Profile, Presence, ExerciceModele, DocumentClasse, ContenuSession, SectionActive, MessageSession } from '@/types'

type OngletActif = 'exercice' | 'presences' | 'documents' | 'contenu' | 'chat' | 'rendus'

export default function SalleEnseignantPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [onglet, setOnglet] = useState<OngletActif>('exercice')
  const [exercices, setExercices] = useState<Exercice[]>([])
  const [reponsesParExercice, setReponsesParExercice] = useState<Record<string, (Reponse & { eleve: Profile })[]>>({})
  const [presences, setPresences] = useState<(Presence & { eleve: Profile })[]>([])
  const [chargement, setChargement] = useState(true)
  const [showFormExercice, setShowFormExercice] = useState(false)
  const [documents, setDocuments] = useState<DocumentClasse[]>([])
  const [contenusSession, setContenusSession] = useState<ContenuSession[]>([])
  const [messages, setMessages] = useState<(MessageSession & { auteur: Profile })[]>([])
  const [nbMainsLevees, setNbMainsLevees] = useState(0)
  const [toastMainLevee, setToastMainLevee] = useState<string | null>(null)
  const [showConfirmTerminer, setShowConfirmTerminer] = useState(false)

  useEffect(() => {
    chargerSession()
    const cleanup = abonnerTempsReel()
    return cleanup
  }, [sessionId])

  async function chargerSession() {
    const supabase = createClient()
    const { data } = await supabase
      .from('sessions')
      .select('*, classe:classes(*)')
      .eq('id', sessionId)
      .single()
    setSession(data)

    await Promise.all([chargerExercices(), chargerPresences()])

    // Charger les documents de la classe
    if (data?.classe_id) {
      const { data: docs } = await supabase
        .from('documents_classe').select('*')
        .eq('classe_id', data.classe_id)
        .order('created_at', { ascending: false })
      setDocuments(docs || [])
    }

    // Charger les contenus de session (comptines, sourates, vidéos)
    const { data: contSess } = await supabase
      .from('contenus_session').select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
    setContenusSession(contSess || [])

    // Charger les messages du chat
    await chargerMessages()

    setChargement(false)
  }

  async function chargerExercices() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exercices')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    const exs = data || []
    setExercices(exs)

    // Charger toutes les réponses
    if (exs.length > 0) {
      await chargerToutesReponses(exs.map((e: { id: string }) => e.id))
    }
  }

  async function chargerToutesReponses(exerciceIds: string[]) {
    if (exerciceIds.length === 0) return
    const supabase = createClient()
    const { data } = await supabase
      .from('reponses')
      .select('*, eleve:profiles(*)')
      .in('exercice_id', exerciceIds)

    const par: Record<string, (Reponse & { eleve: Profile })[]> = {}
    for (const r of (data || [])) {
      if (!par[r.exercice_id]) par[r.exercice_id] = []
      par[r.exercice_id].push(r)
    }
    setReponsesParExercice(par)
  }

  function abonnerTempsReel() {
    const supabase = createClient()
    const channel = supabase
      .channel(`session-enseignant-${sessionId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reponses' }, () => {
        chargerExercices()
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'exercices',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        chargerExercices()
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'presences',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        chargerPresences()
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages_session',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload: any) => {
        await chargerMessages()
        if (payload.new?.type === 'main_levee') {
          // Récupérer le nom de l'élève
          const supabase2 = createClient()
          const { data: profil } = await supabase2
            .from('profiles').select('prenom, nom').eq('id', payload.new.auteur_id).single()
          const nom = profil ? `${profil.prenom} ${profil.nom}` : 'Un élève'
          setToastMainLevee(nom)
          setTimeout(() => setToastMainLevee(null), 5000)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  async function chargerMessages() {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages_session')
      .select('*, auteur:profiles(*)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    const msgs = (data || []) as (MessageSession & { auteur: Profile })[]
    setMessages(msgs)
    setNbMainsLevees(msgs.filter(m => m.type === 'main_levee').length)
  }

  async function chargerPresences() {
    const supabase = createClient()
    const { data } = await supabase
      .from('presences')
      .select('*, eleve:profiles(*)')
      .eq('session_id', sessionId)
      .is('quitte_a', null)
    setPresences(data || [])
  }

  async function changerStatut(nouveauStatut: 'en_cours' | 'pause' | 'terminee') {
    const supabase = createClient()
    await supabase
      .from('sessions')
      .update({
        statut: nouveauStatut,
        ...(nouveauStatut === 'terminee' ? { ended_at: new Date().toISOString() } : {})
      })
      .eq('id', sessionId)
    setSession(prev => prev ? { ...prev, statut: nouveauStatut } : null)
    if (nouveauStatut === 'terminee') {
      router.push(`/dashboard/classe/${session?.classe_id}`)
    }
  }

  if (chargement || !session) return <EcranChargement />

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* ── Modale confirmation Terminer ── */}
      {showConfirmTerminer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-5xl mb-3">🔴</div>
            <h3 className="text-white font-bold text-lg mb-2">Terminer le cours ?</h3>
            <p className="text-gray-400 text-sm mb-5">Le cours sera clôturé et tous les élèves déconnectés. Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmTerminer(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-700 transition text-sm">
                Annuler
              </button>
              <button onClick={() => { setShowConfirmTerminer(false); changerStatut('terminee') }}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600 transition text-sm">
                Terminer le cours
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast main levée ──────────────────────────────────── */}
      {toastMainLevee && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-orange-500 text-white px-5 py-3 rounded-2xl shadow-2xl animate-bounce-once pointer-events-none">
          <Hand size={20} className="shrink-0" />
          <span className="font-black text-sm">🖐 {toastMainLevee} lève la main !</span>
        </div>
      )}

      {/* Barre du haut */}
      <header className="bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition text-sm shrink-0"
            title="Retour au tableau de bord"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="w-px h-5 bg-gray-600 shrink-0" />
          <BookOpen className="text-indigo-400 shrink-0" size={18} />
          <span className="text-white font-semibold truncate text-sm sm:text-base">{session.titre}</span>
          <StatutBadge statut={session.statut} />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-gray-400 text-xs sm:text-sm flex items-center gap-1">
            <Users size={13} />
            <span className="hidden sm:inline">{presences.length} élève{presences.length > 1 ? 's' : ''}</span>
            <span className="sm:hidden">{presences.length}</span>
          </span>
          {session.statut === 'en_cours' && (
            <button onClick={() => changerStatut('pause')}
              className="flex items-center gap-1 bg-yellow-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-yellow-600 transition">
              <Pause size={13} /> <span className="hidden sm:inline">Pause</span>
            </button>
          )}
          {session.statut === 'pause' && (
            <button onClick={() => changerStatut('en_cours')}
              className="flex items-center gap-1 bg-green-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-600 transition">
              <Play size={13} /> <span className="hidden sm:inline">Reprendre</span>
            </button>
          )}
          <button onClick={() => setShowConfirmTerminer(true)}
            className="flex items-center gap-1 bg-red-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-600 transition">
            <Square size={13} /> <span className="hidden sm:inline">Terminer</span>
          </button>
        </div>
      </header>

      {/* ── Rangée du haut : onglets + contenu ── */}
      {(() => {
        const sections = session.sections_actives || []
        const hasContenu = sections.some(s => ['comptine', 'sourate', 'video'].includes(s))
        const tabs = [
          { id: 'presences', label: 'Élèves',    icon: <Users size={13} /> },
          { id: 'exercice',  label: 'Exercices', icon: <BookOpen size={13} /> },
          { id: 'documents', label: 'Docs',      icon: <FileText size={13} /> },
          ...(hasContenu ? [{ id: 'contenu', label: 'Contenu', icon: <Music size={13} /> }] : []),
          { id: 'chat', label: 'Chat', icon: (
            <span className="relative inline-flex items-center gap-1">
              <MessageCircle size={13} />
              {nbMainsLevees > 0 && <span className="bg-orange-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full leading-none">{nbMainsLevees}</span>}
            </span>
          )},
          { id: 'rendus', label: 'Rendus', icon: <Upload size={13} /> },
        ]
        return (
          <div className="bg-gray-800 border-b border-gray-700 flex flex-col">
            {/* Barre d'onglets centrée */}
            <div className="flex justify-center border-b border-gray-700 overflow-x-auto">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setOnglet(tab.id as OngletActif)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-medium transition whitespace-nowrap ${
                    onglet === tab.id
                      ? 'text-white border-b-2 border-indigo-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Contenu de l'onglet sélectionné */}
            <div className="max-h-72 overflow-y-auto">
              {onglet === 'exercice' && (
                <PanneauExercice
                  sessionId={sessionId}
                  etablissementId={session.classe?.etablissement_id ?? null}
                  exercices={exercices}
                  reponsesParExercice={reponsesParExercice}
                  showForm={showFormExercice}
                  onShowForm={setShowFormExercice}
                  onExerciceAjoute={() => { setShowFormExercice(false); chargerExercices() }}
                  onCorrectionSaved={() => chargerExercices()}
                />
              )}
              {onglet === 'presences' && (
                <PanneauPresences
                  sessionId={sessionId}
                  classeId={session.classe_id}
                  presences={presences}
                />
              )}
              {onglet === 'documents' && (
                <PanneauDocuments
                  classeId={session.classe_id}
                  documents={documents}
                  onAjoute={(d) => setDocuments([d, ...documents])}
                  onSupprime={(did) => setDocuments(documents.filter(d => d.id !== did))}
                />
              )}
              {onglet === 'contenu' && (
                <PanneauContenu
                  sessionId={sessionId}
                  sections={session.sections_actives || []}
                  contenus={contenusSession}
                  onAjoute={(c) => setContenusSession([c, ...contenusSession])}
                  onSupprime={(id) => setContenusSession(contenusSession.filter(c => c.id !== id))}
                />
              )}
              {onglet === 'chat' && (
                <PanneauChat
                  sessionId={sessionId}
                  messages={messages}
                  roleAuteur="enseignant"
                />
              )}
              {onglet === 'rendus' && (
                <PanneauRendus
                  sessionId={sessionId}
                  classeId={session.classe_id}
                />
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Rangée du bas : Dashboard session (pleine largeur) ── */}
      <div className="flex-1 overflow-y-auto bg-gray-900 relative">
        {session.statut === 'pause' && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-7xl mb-4">⏸️</div>
              <p className="text-white text-2xl font-bold mb-2">Cours en pause</p>
              <button onClick={() => changerStatut('en_cours')}
                className="mt-6 flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition mx-auto">
                <Play size={18} /> Reprendre le cours
              </button>
            </div>
          </div>
        )}
        <DashboardSession
          session={session}
          presences={presences}
          exercices={exercices}
          reponsesParExercice={reponsesParExercice}
          contenusSession={contenusSession}
          onReprendreStatut={changerStatut}
        />
      </div>
    </div>
  )
}

// ─── Dashboard Session (zone centrale) ───────────────────────────────────────

function DashboardSession({
  session, presences, exercices, reponsesParExercice, contenusSession,
}: {
  session: Session
  presences: (Presence & { eleve: Profile })[]
  exercices: Exercice[]
  reponsesParExercice: Record<string, (Reponse & { eleve: Profile })[]>
  contenusSession: ContenuSession[]
  onReprendreStatut: (s: 'en_cours' | 'pause' | 'terminee') => void
}) {
  // Chrono
  const [chrono, setChrono] = useState(0)
  const [chronoActif, setChronoActif] = useState(false)
  const [minuteur, setMinuteur] = useState(0)
  const [minuteurSaisi, setMinuteurSaisi] = useState('5')
  const [minuteurActif, setMinuteurActif] = useState(false)
  const chronoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const minuteurRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (chronoActif) {
      chronoRef.current = setInterval(() => setChrono(t => t + 1), 1000)
    } else if (chronoRef.current) {
      clearInterval(chronoRef.current)
    }
    return () => { if (chronoRef.current) clearInterval(chronoRef.current) }
  }, [chronoActif])

  useEffect(() => {
    if (minuteurActif && minuteur > 0) {
      minuteurRef.current = setInterval(() => {
        setMinuteur(t => {
          if (t <= 1) { setMinuteurActif(false); clearInterval(minuteurRef.current!); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (minuteurRef.current) clearInterval(minuteurRef.current) }
  }, [minuteurActif])

  function lancerMinuteur() {
    const sec = parseInt(minuteurSaisi) * 60
    if (isNaN(sec) || sec <= 0) return
    setMinuteur(sec)
    setMinuteurActif(true)
  }

  function formatTemps(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Stats
  const totalReponses = Object.values(reponsesParExercice).flat().length
  const toutesNotes = Object.values(reponsesParExercice).flat().filter(r => r.note !== null)
  const noteMoy = toutesNotes.length > 0
    ? (toutesNotes.reduce((s, r) => s + (r.note ?? 0), 0) / toutesNotes.length).toFixed(1)
    : null

  // Fil des 10 dernières réponses
  const dernieresReponses = Object.values(reponsesParExercice).flat()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  // Comptines + Sourates
  const comptines = contenusSession.filter(c => c.type === 'comptine')
  const sourates = contenusSession.filter(c => c.type === 'sourate')
  const minuteurPourcent = minuteur > 0
    ? (minuteur / (parseInt(minuteurSaisi) * 60)) * 100
    : 0

  return (
    <div className="p-6 space-y-5">
      {/* Lien vidéo flottant */}
      {session.daily_room_url && (
        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600/40 rounded-lg flex items-center justify-center">
              <Video size={16} className="text-indigo-300" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Visioconférence</p>
              <p className="text-indigo-400 text-xs truncate max-w-xs">{session.daily_room_url}</p>
            </div>
          </div>
          <a href={session.daily_room_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0">
            <ExternalLink size={14} /> Ouvrir
          </a>
        </div>
      )}

      {/* Stats en direct */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Connectés', value: presences.length, icon: '👥', color: 'from-blue-600/20 to-blue-700/10', text: 'text-blue-300', border: 'border-blue-500/20' },
          { label: 'Exercices', value: exercices.length, icon: '📝', color: 'from-indigo-600/20 to-indigo-700/10', text: 'text-indigo-300', border: 'border-indigo-500/20' },
          { label: 'Réponses', value: totalReponses, icon: '✉️', color: 'from-violet-600/20 to-violet-700/10', text: 'text-violet-300', border: 'border-violet-500/20' },
          { label: 'Moy. classe', value: noteMoy ? `${noteMoy}/20` : '—', icon: '⭐', color: 'from-yellow-600/20 to-yellow-700/10', text: 'text-yellow-300', border: 'border-yellow-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl px-3 py-2 text-center`}>
            <div className="text-lg mb-0.5">{stat.icon}</div>
            <p className={`text-xl font-black ${stat.text}`}>{stat.value}</p>
            <p className="text-gray-400 text-xs font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chrono + Minuteur */}
      <div className="grid grid-cols-2 gap-4">
        {/* Chronomètre */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⏱️</span>
            <p className="text-gray-300 text-sm font-semibold">Chronomètre</p>
          </div>
          <p className="text-4xl font-black text-white text-center tracking-widest mb-4">
            {formatTemps(chrono)}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setChronoActif(!chronoActif)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                chronoActif ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
              }`}>
              {chronoActif ? '⏸ Pause' : '▶ Démarrer'}
            </button>
            <button onClick={() => { setChronoActif(false); setChrono(0) }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition">
              ↺
            </button>
          </div>
        </div>

        {/* Minuteur */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⏳</span>
            <p className="text-gray-300 text-sm font-semibold">Minuteur</p>
          </div>
          {minuteurActif || minuteur > 0 ? (
            <>
              <div className="relative flex items-center justify-center mb-2">
                <svg viewBox="0 0 80 80" className="w-20 h-20">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#374151" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none"
                    stroke={minuteur < 30 ? '#ef4444' : '#6366f1'} strokeWidth="6"
                    strokeDasharray={`${minuteurPourcent * 2.136} 213.6`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <p className={`absolute text-xl font-black ${minuteur < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {formatTemps(minuteur)}
                </p>
              </div>
              {minuteur === 0 && <p className="text-center text-green-400 text-xs font-bold animate-pulse">✅ Temps écoulé !</p>}
              <button onClick={() => { setMinuteurActif(false); setMinuteur(0) }}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition mt-1">
                Réinitialiser
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <input type="number" min="1" max="60" value={minuteurSaisi}
                  onChange={e => setMinuteurSaisi(e.target.value)}
                  className="flex-1 bg-gray-700 text-white text-center text-xl font-black rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-gray-400 text-sm">min</span>
              </div>
              <button onClick={lancerMinuteur}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition">
                ▶ Lancer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fil des dernières réponses */}
      {dernieresReponses.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📬</span>
            <p className="text-gray-300 text-sm font-semibold">Dernières réponses</p>
            <span className="ml-auto text-xs text-gray-500">{totalReponses} au total</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {dernieresReponses.map(r => {
              const exo = exercices.find(e => e.id === r.exercice_id)
              return (
                <div key={r.id} className="flex items-start gap-3 bg-gray-700/50 rounded-xl px-3 py-2">
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 mt-0.5">
                    {r.eleve.prenom[0]}{r.eleve.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-semibold">{r.eleve.prenom}</span>
                      {exo && <span className="text-gray-500 text-xs truncate max-w-[120px]">{exo.question.slice(0, 30)}{exo.question.length > 30 ? '…' : ''}</span>}
                      {r.note !== null && (
                        <span className="text-yellow-400 text-xs font-bold ml-auto">{r.note}/20</span>
                      )}
                    </div>
                    <p className="text-gray-300 text-xs mt-0.5 truncate">{r.contenu}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comptines & Sourates du cours */}
      {(comptines.length > 0 || sourates.length > 0) && (
        <div className="grid grid-cols-1 gap-4">
          {sourates.map(s => (
            <div key={s.id} className="bg-gradient-to-br from-green-900/30 to-green-800/10 border border-green-700/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🕌</span>
                <p className="text-green-300 font-bold text-sm">{s.titre}</p>
              </div>
              {s.texte_arabe && (
                <p className="text-right text-white text-xl leading-loose font-medium mb-3" dir="rtl">
                  {s.texte_arabe}
                </p>
              )}
              {s.traduction && <p className="text-green-200/70 text-xs italic border-t border-green-700/30 pt-2">{s.traduction}</p>}
              {s.lien_url && (
                <a href={s.lien_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-green-400 text-xs mt-2 hover:text-green-300 transition">
                  <Music size={12} /> Écouter la récitation
                </a>
              )}
            </div>
          ))}

          {comptines.map(c => (
            <div key={c.id} className="bg-gradient-to-br from-pink-900/30 to-pink-800/10 border border-pink-700/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎵</span>
                <p className="text-pink-300 font-bold text-sm">{c.titre}</p>
              </div>
              {c.texte_paroles && (
                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{c.texte_paroles}</p>
              )}
              {c.lien_url && (
                <a href={c.lien_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-pink-400 text-xs mt-3 hover:text-pink-300 transition">
                  <Music size={12} /> Écouter
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vide — aucune activité */}
      {dernieresReponses.length === 0 && comptines.length === 0 && sourates.length === 0 && (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🎓</div>
          <p className="text-gray-500 text-sm">Le cours vient de commencer.<br />Les réponses des élèves apparaîtront ici en temps réel.</p>
        </div>
      )}
    </div>
  )
}

// ─── Panneau Exercice ───────────────────────────────────────────────────────

function PanneauExercice({
  sessionId, etablissementId, exercices, reponsesParExercice, showForm, onShowForm, onExerciceAjoute, onCorrectionSaved,
}: {
  sessionId: string
  etablissementId: string | null
  exercices: Exercice[]
  reponsesParExercice: Record<string, (Reponse & { eleve: Profile })[]>
  showForm: boolean
  onShowForm: (v: boolean) => void
  onExerciceAjoute: () => void
  onCorrectionSaved: () => void
}) {
  const [exerciceOuvert, setExerciceOuvert] = useState<string | null>(null)

  // Auto-ouvrir le dernier exercice ajouté
  useEffect(() => {
    if (exercices.length > 0) {
      const last = exercices[exercices.length - 1]
      setExerciceOuvert(last.id)
    }
  }, [exercices.length])

  if (showForm) {
    return (
      <FormExercice
        sessionId={sessionId}
        etablissementId={etablissementId}
        onEnvoye={onExerciceAjoute}
        onAnnuler={() => onShowForm(false)}
      />
    )
  }

  return (
    <div className="p-4 space-y-3">
      <button onClick={() => onShowForm(true)}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition">
        <Send size={16} /> Envoyer un exercice
      </button>

      {exercices.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-400 text-sm">Aucun exercice envoyé.<br />Commence le cours !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...exercices].reverse().map((ex, idx) => {
            const reponses = reponsesParExercice[ex.id] || []
            const ouvert = exerciceOuvert === ex.id
            const numero = exercices.length - idx
            const notees = reponses.filter(r => r.note !== null)
            const moy = notees.length > 0
              ? (notees.reduce((s, r) => s + (r.note ?? 0), 0) / notees.length).toFixed(1)
              : null

            return (
              <div key={ex.id} className="bg-gray-700 rounded-xl overflow-hidden">
                {/* En-tête exercice */}
                <button
                  onClick={() => setExerciceOuvert(ouvert ? null : ex.id)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-indigo-300 font-medium">Exercice {numero}</span>
                      <span className="text-xs text-gray-400">{reponses.length} rép.</span>
                      {moy && <span className="text-xs text-yellow-400">Moy. {moy}/20</span>}
                    </div>
                    <p className="text-white text-sm font-medium truncate">{ex.question}</p>
                  </div>
                  {ouvert ? <ChevronUp size={16} className="text-gray-400 shrink-0 ml-2" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 ml-2" />}
                </button>

                {/* Réponses expandables */}
                {ouvert && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-600 pt-3">
                    {reponses.length === 0 ? (
                      <p className="text-gray-500 text-xs text-center py-3">En attente des réponses...</p>
                    ) : (
                      reponses.map(r => (
                        <CarteReponse key={r.id} reponse={r} onCorrectionSaved={onCorrectionSaved} />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Carte Réponse ───────────────────────────────────────────────────────────

function CarteReponse({ reponse, onCorrectionSaved }: {
  reponse: Reponse & { eleve: Profile }
  onCorrectionSaved: () => void
}) {
  const [correction, setCorrection] = useState(reponse.correction || '')
  const [note, setNote] = useState<string>(reponse.note !== null ? String(reponse.note) : '')
  const [enCours, setEnCours] = useState(false)
  const [sauvegarde, setSauvegarde] = useState(!!reponse.correction)

  const noteValide = note === '' || (Number(note) >= 0 && Number(note) <= 20)
  const modifie = correction !== (reponse.correction || '') || note !== (reponse.note !== null ? String(reponse.note) : '')

  async function sauvegarder() {
    if (!noteValide) return
    setEnCours(true)
    const supabase = createClient()
    await supabase.from('reponses').update({
      correction,
      note: note !== '' ? Number(note) : null,
    }).eq('id', reponse.id)
    setSauvegarde(true)
    setEnCours(false)
    onCorrectionSaved()
  }

  return (
    <div className="bg-gray-600 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
            {reponse.eleve.prenom[0]}{reponse.eleve.nom[0]}
          </div>
          <span className="text-white text-xs font-medium">{reponse.eleve.prenom} {reponse.eleve.nom}</span>
        </div>
        {reponse.note !== null && sauvegarde && (
          <span className="text-yellow-400 text-xs font-bold">{reponse.note}/20</span>
        )}
      </div>
      <div className="bg-gray-500 rounded-lg px-3 py-2 mb-2">
        <p className="text-gray-100 text-xs">{reponse.contenu}</p>
      </div>
      <div className="flex gap-2 mb-1">
        <textarea
          value={correction}
          onChange={e => { setCorrection(e.target.value); setSauvegarde(false) }}
          placeholder="Correction..."
          rows={2}
          className="flex-1 bg-gray-500 text-gray-100 text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-gray-400"
        />
        <div className="flex flex-col items-center justify-center">
          <input
            type="number" min={0} max={20} step={0.5}
            value={note}
            onChange={e => { setNote(e.target.value); setSauvegarde(false) }}
            placeholder="—"
            className="w-12 bg-gray-500 text-center text-white font-bold text-xs rounded-lg px-1 py-2 focus:outline-none focus:ring-1 focus:ring-yellow-400 placeholder-gray-400"
          />
          <span className="text-gray-400 text-xs mt-0.5">/20</span>
        </div>
      </div>
      {!sauvegarde && (correction || note !== '') && modifie && (
        <button onClick={sauvegarder} disabled={enCours || !noteValide}
          className="w-full bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-60">
          {enCours ? 'Envoi...' : 'Envoyer la correction'}
        </button>
      )}
      {sauvegarde && <p className="text-green-400 text-xs text-center mt-1">✓ Correction envoyée</p>}
    </div>
  )
}

// ─── FormExercice ────────────────────────────────────────────────────────────

function FormExercice({ sessionId, etablissementId, onEnvoye, onAnnuler }: {
  sessionId: string
  etablissementId: string | null
  onEnvoye: () => void
  onAnnuler: () => void
}) {
  const [question, setQuestion] = useState('')
  const [type, setType] = useState<'reponse_courte' | 'qcm'>('reponse_courte')
  const [options, setOptions] = useState(['', '', ''])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [showBibliotheque, setShowBibliotheque] = useState(false)
  const [modeles, setModeles] = useState<ExerciceModele[]>([])
  const [chargementModeles, setChargementModeles] = useState(false)

  async function ouvrirBibliotheque() {
    setShowBibliotheque(true)
    setChargementModeles(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('exercices_modeles').select('*').eq('enseignant_id', user.id).order('created_at', { ascending: false })
    setModeles(data || [])
    setChargementModeles(false)
  }

  function utiliserModele(m: ExerciceModele) {
    setQuestion(m.question)
    setType(m.type)
    setOptions(m.options || ['', '', ''])
    setShowBibliotheque(false)
  }

  async function handleEnvoyer(e: React.FormEvent) {
    e.preventDefault()
    setChargement(true)
    setErreur(null)
    const supabase = createClient()

    // Résoudre l'etablissement_id : prop passée en priorité,
    // sinon fallback sur le profil de l'utilisateur connecté
    let etabId = etablissementId
    if (!etabId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('etablissement_id')
          .eq('id', user.id)
          .single()
        etabId = prof?.etablissement_id ?? null
      }
    }

    const { error } = await supabase.from('exercices').insert({
      session_id: sessionId,
      etablissement_id: etabId,
      question,
      type,
      options: type === 'qcm' ? options.filter(o => o.trim()) : null,
      statut: 'envoye',
    })
    if (error) {
      console.error('Erreur insertion exercice:', error)
      setErreur("Impossible d'envoyer l'exercice. Vérifie les droits RLS.")
      setChargement(false)
      return
    }
    onEnvoye()
  }

  if (showBibliotheque) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium text-sm">Choisir depuis la bibliothèque</h3>
          <button onClick={() => setShowBibliotheque(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
        </div>
        {chargementModeles ? (
          <div className="text-center py-8"><div className="w-6 h-6 border-2 border-gray-600 border-t-indigo-400 rounded-full animate-spin mx-auto" /></div>
        ) : modeles.length === 0 ? (
          <div className="text-center py-8"><p className="text-gray-400 text-sm">Bibliothèque vide.</p></div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {modeles.map(m => (
              <button key={m.id} type="button" onClick={() => utiliserModele(m)}
                className="w-full text-left bg-gray-700 hover:bg-gray-600 rounded-xl p-3 transition">
                <div className="flex items-center gap-2 mb-1">
                  {m.matiere && <span className="text-xs text-indigo-300">{m.matiere}</span>}
                  <span className="text-xs text-gray-400">{m.type === 'qcm' ? 'QCM' : 'Réponse libre'}</span>
                </div>
                <p className="text-white text-sm font-medium">{m.titre}</p>
                <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{m.question}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleEnvoyer} className="p-4 space-y-4">
      {erreur && (
        <div className="bg-red-900/50 border border-red-500 rounded-xl px-4 py-3">
          <p className="text-red-300 text-xs">{erreur}</p>
        </div>
      )}
      <button type="button" onClick={ouvrirBibliotheque}
        className="w-full flex items-center justify-center gap-2 bg-gray-700 text-gray-200 py-2 rounded-xl text-sm font-medium hover:bg-gray-600 transition border border-gray-600">
        <Library size={14} /> Depuis la bibliothèque
      </button>
      <div className="flex gap-2">
        {[{ id: 'reponse_courte', label: 'Réponse libre' }, { id: 'qcm', label: 'QCM' }].map(t => (
          <button key={t.id} type="button" onClick={() => setType(t.id as 'reponse_courte' | 'qcm')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${type === t.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1">Question</label>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} required rows={3}
          placeholder="Ta question ici..."
          className="w-full bg-gray-700 text-white text-sm rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-500" />
      </div>
      {type === 'qcm' && (
        <div className="space-y-2">
          <label className="block text-gray-300 text-sm">Options</label>
          {options.map((opt, i) => (
            <input key={i} type="text" value={opt}
              onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
              placeholder={`Option ${i + 1}`}
              className="w-full bg-gray-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-gray-500" />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onAnnuler}
          className="flex-1 bg-gray-600 text-gray-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-500 transition">
          Annuler
        </button>
        <button type="submit" disabled={chargement || !question}
          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60">
          <Send size={14} /> {chargement ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </form>
  )
}

// ─── Panneau Appel ──────────────────────────────────────────────────────────

function PanneauPresences({
  sessionId, classeId, presences,
}: {
  sessionId: string
  classeId: string
  presences: (Presence & { eleve: Profile })[]
}) {
  const [eleves, setEleves] = useState<Profile[]>([])
  const [appel, setAppel] = useState<Record<string, 'present' | 'absent'>>({})
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function charger() {
      const supabase = createClient()
      const { data: inscs } = await supabase
        .from('inscriptions').select('eleve:profiles(*)').eq('classe_id', classeId)
      setEleves((inscs || []).map((i: { eleve: any }) => i.eleve).filter((e: any) => e?.role === 'eleve'))

      // Statuts d'appel déjà enregistrés
      const { data: pres } = await supabase
        .from('presences').select('eleve_id, statut_appel')
        .eq('session_id', sessionId).not('statut_appel', 'is', null)
      const map: Record<string, 'present' | 'absent'> = {}
      for (const p of (pres || [])) {
        if (p.statut_appel) map[p.eleve_id] = p.statut_appel as 'present' | 'absent'
      }
      setAppel(map)
      setChargement(false)
    }
    charger()
  }, [classeId, sessionId])

  async function marquer(eleveId: string, statut: 'present' | 'absent') {
    const supabase = createClient()
    const presenceExistante = presences.find(p => p.eleve_id === eleveId)
    if (presenceExistante) {
      await supabase.from('presences').update({ statut_appel: statut }).eq('id', presenceExistante.id)
    } else {
      await supabase.from('presences').upsert({
        session_id: sessionId, eleve_id: eleveId,
        rejoint_a: new Date().toISOString(), statut_appel: statut,
      })
    }
    setAppel(prev => ({ ...prev, [eleveId]: statut }))
  }

  const connectes = new Set(presences.map(p => p.eleve_id))
  const nbPresents = Object.values(appel).filter(s => s === 'present').length
  const nbAbsents = Object.values(appel).filter(s => s === 'absent').length
  const nbNonAppeles = eleves.length - Object.keys(appel).length

  if (chargement) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-gray-600 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-3">
      {/* Résumé appel */}
      {eleves.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-1">
          <div className="bg-green-900/40 rounded-xl px-3 py-2 text-center">
            <p className="text-green-400 font-black text-lg leading-none">{nbPresents}</p>
            <p className="text-green-500/70 text-xs mt-0.5">Présents</p>
          </div>
          <div className="bg-red-900/40 rounded-xl px-3 py-2 text-center">
            <p className="text-red-400 font-black text-lg leading-none">{nbAbsents}</p>
            <p className="text-red-500/70 text-xs mt-0.5">Absents</p>
          </div>
          <div className="bg-gray-700 rounded-xl px-3 py-2 text-center">
            <p className="text-gray-300 font-black text-lg leading-none">{nbNonAppeles}</p>
            <p className="text-gray-500 text-xs mt-0.5">En attente</p>
          </div>
        </div>
      )}

      {eleves.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Aucun élève inscrit dans cette classe.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {eleves.map(eleve => {
            const connecte = connectes.has(eleve.id)
            const statut = appel[eleve.id] ?? null

            return (
              <li key={eleve.id} className={`rounded-xl px-3 py-2.5 flex items-center gap-3 transition ${
                statut === 'present' ? 'bg-green-900/30 border border-green-700/50'
                : statut === 'absent' ? 'bg-red-900/30 border border-red-700/50'
                : 'bg-gray-700 border border-transparent'
              }`}>
                {/* Avatar */}
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {eleve.prenom[0]}{eleve.nom[0]}
                </div>

                {/* Nom + connexion */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{eleve.prenom} {eleve.nom}</p>
                  <p className="text-xs mt-0.5">
                    {connecte
                      ? <span className="text-green-400">● Connecté</span>
                      : <span className="text-gray-500">○ Non connecté</span>
                    }
                  </p>
                </div>

                {/* Boutons appel */}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => marquer(eleve.id, 'present')}
                    title="Marquer présent"
                    className={`w-8 h-8 rounded-lg text-sm font-black transition ${
                      statut === 'present'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-900/50'
                        : 'bg-gray-600 text-gray-400 hover:bg-green-500/30 hover:text-green-400'
                    }`}>✓</button>
                  <button onClick={() => marquer(eleve.id, 'absent')}
                    title="Marquer absent"
                    className={`w-8 h-8 rounded-lg text-sm font-black transition ${
                      statut === 'absent'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-900/50'
                        : 'bg-gray-600 text-gray-400 hover:bg-red-500/30 hover:text-red-400'
                    }`}>✗</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─── Panneau Documents ───────────────────────────────────────────────────────

function PanneauDocuments({
  classeId, documents, onAjoute, onSupprime,
}: {
  classeId: string
  documents: DocumentClasse[]
  onAjoute: (d: DocumentClasse) => void
  onSupprime: (id: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function icone(type: string) {
    if (type === 'pdf') return <FileText size={15} className="text-red-400" />
    if (type === 'image') return <ImageIcon size={15} className="text-blue-400" />
    return <File size={15} className="text-gray-400" />
  }

  function formatTaille(b: number | null) {
    if (!b) return ''
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
    return `${(b / (1024 * 1024)).toFixed(1)} Mo`
  }

  async function handleFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setErreur('Max 10 Mo'); return }

    setUploading(true); setErreur(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const path = `classes/${classeId}/${Date.now()}-${file.name}`
    const type: DocumentClasse['type_fichier'] =
      file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'autre'

    const { data: storageData, error: se } = await supabase.storage
      .from('documents').upload(path, file, { contentType: file.type })
    if (se) { setErreur(se.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storageData.path)
    const { data: doc } = await supabase.from('documents_classe').insert({
      classe_id: classeId, enseignant_id: user.id,
      nom: file.name, fichier_url: urlData.publicUrl,
      fichier_path: storageData.path, type_fichier: type, taille: file.size,
    }).select().single()

    if (doc) onAjoute(doc)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function supprimer(doc: DocumentClasse) {
    if (!confirm(`Supprimer "${doc.nom}" ?`)) return
    const supabase = createClient()
    await supabase.storage.from('documents').remove([doc.fichier_path])
    await supabase.from('documents_classe').delete().eq('id', doc.id)
    onSupprime(doc.id)
  }

  return (
    <div className="p-4 space-y-3">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-500/40 text-purple-400 hover:border-purple-400 hover:text-purple-300 py-3 rounded-xl text-sm font-medium transition disabled:opacity-50"
      >
        {uploading
          ? <><span className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />Envoi...</>
          : <><Upload size={15} />Ajouter un document (PDF / image)</>
        }
      </button>
      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFichier} />

      {erreur && <p className="text-red-400 text-xs bg-red-900/30 rounded-lg px-3 py-2">{erreur}</p>}

      {documents.length === 0 ? (
        <p className="text-gray-500 text-xs text-center py-4">Aucun document partagé.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map(doc => (
            <li key={doc.id} className="bg-gray-700 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="shrink-0">{icone(doc.type_fichier)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{doc.nom}</p>
                <p className="text-gray-400 text-xs">{formatTaille(doc.taille)}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple-300 transition">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => supprimer(doc)} className="text-gray-500 hover:text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Panneau Contenu (Comptine / Sourate / Vidéo) ────────────────────────────

function PanneauContenu({
  sessionId, sections, contenus, onAjoute, onSupprime,
}: {
  sessionId: string
  sections: SectionActive[]
  contenus: ContenuSession[]
  onAjoute: (c: ContenuSession) => void
  onSupprime: (id: string) => void
}) {
  const [formType, setFormType] = useState<'comptine' | 'sourate' | 'video' | null>(null)

  const TYPES: { id: 'comptine' | 'sourate' | 'video'; label: string; emoji: string; couleur: string }[] = [
    { id: 'comptine', label: 'Comptine', emoji: '🎵', couleur: 'pink' },
    { id: 'sourate',  label: 'Sourate',  emoji: '🕌', couleur: 'green' },
    { id: 'video',    label: 'Vidéo',    emoji: '🎬', couleur: 'red' },
  ]

  const typeActifs = TYPES.filter(t => sections.includes(t.id))

  if (formType) {
    return (
      <FormContenuSession
        sessionId={sessionId}
        type={formType}
        onAjoute={(c) => { onAjoute(c); setFormType(null) }}
        onAnnuler={() => setFormType(null)}
      />
    )
  }

  return (
    <div className="p-4 space-y-5">
      {typeActifs.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          Aucun type de contenu actif pour ce cours.
        </p>
      )}

      {typeActifs.map(type => {
        const items = contenus.filter(c => c.type === type.id)
        return (
          <div key={type.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{type.emoji}</span>
                <h3 className="text-white font-semibold text-sm">{type.label}</h3>
              </div>
              <button
                onClick={() => setFormType(type.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg"
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-3 bg-gray-800 rounded-xl">
                Aucune {type.label.toLowerCase()} pour ce cours.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <CarteContenuSession key={item.id} contenu={item} onSupprime={() => onSupprime(item.id)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Carte Contenu Session ────────────────────────────────────────────────────

function CarteContenuSession({ contenu, onSupprime }: {
  contenu: ContenuSession
  onSupprime: () => void
}) {
  async function supprimer() {
    if (!confirm(`Supprimer "${contenu.titre}" ?`)) return
    const supabase = createClient()
    if (contenu.fichier_path) {
      await supabase.storage.from('documents').remove([contenu.fichier_path])
    }
    await supabase.from('contenus_session').delete().eq('id', contenu.id)
    onSupprime()
  }

  return (
    <div className="bg-gray-700 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white text-sm font-semibold">{contenu.titre}</p>
        <button onClick={supprimer} className="text-gray-500 hover:text-red-400 transition shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {contenu.texte_arabe && (
        <div className="bg-gray-600 rounded-lg px-3 py-2">
          <p className="text-right text-white text-base leading-relaxed font-arabic" dir="rtl">
            {contenu.texte_arabe}
          </p>
        </div>
      )}
      {contenu.traduction && (
        <p className="text-gray-300 text-xs italic">{contenu.traduction}</p>
      )}
      {contenu.texte_paroles && (
        <p className="text-gray-300 text-xs whitespace-pre-wrap">{contenu.texte_paroles}</p>
      )}
      {contenu.lien_url && (
        <a href={contenu.lien_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs transition">
          <Link2 size={12} /> Ouvrir le lien
        </a>
      )}
      {contenu.fichier_url && (
        <a href={contenu.fichier_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 text-xs transition">
          <ExternalLink size={12} /> Écouter / Ouvrir le fichier
        </a>
      )}
    </div>
  )
}

// ─── Formulaire Contenu Session ───────────────────────────────────────────────

function FormContenuSession({ sessionId, type, onAjoute, onAnnuler }: {
  sessionId: string
  type: 'comptine' | 'sourate' | 'video'
  onAjoute: (c: ContenuSession) => void
  onAnnuler: () => void
}) {
  const [titre, setTitre] = useState('')
  const [texteParoles, setTexteParoles] = useState('')
  const [texteArabe, setTexteArabe] = useState('')
  const [traduction, setTraduction] = useState('')
  const [lienUrl, setLienUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fichierUrl, setFichierUrl] = useState<string | null>(null)
  const [fichierPath, setFichierPath] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const LABELS = {
    comptine: { titre: 'Titre de la comptine *', paroles: 'Paroles', icon: '🎵', couleur: 'pink' },
    sourate:  { titre: 'Nom de la sourate *',    paroles: 'Translittération (optionnel)', icon: '🕌', couleur: 'green' },
    video:    { titre: 'Titre de la vidéo *',    paroles: 'Description (optionnel)', icon: '🎬', couleur: 'red' },
  }[type]

  async function handleAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { setErreur('Fichier max 20 Mo'); return }
    setUploading(true); setErreur(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const path = `sessions/${sessionId}/${type}/${Date.now()}-${file.name}`
    const { data: sd, error: se } = await supabase.storage
      .from('documents').upload(path, file, { contentType: file.type })
    if (se) { setErreur(se.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(sd.path)
    setFichierUrl(urlData.publicUrl)
    setFichierPath(sd.path)
    setUploading(false)
  }

  async function handleSoumettre(e: React.FormEvent) {
    e.preventDefault()
    if (!titre) return
    setChargement(true); setErreur(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setChargement(false); return }

    const { data, error } = await supabase.from('contenus_session').insert({
      session_id: sessionId,
      enseignant_id: user.id,
      type,
      titre,
      texte_paroles: texteParoles || null,
      texte_arabe: type === 'sourate' ? (texteArabe || null) : null,
      traduction: type === 'sourate' ? (traduction || null) : null,
      lien_url: lienUrl || null,
      fichier_url: fichierUrl,
      fichier_path: fichierPath,
    }).select().single()

    if (error) { setErreur(error.message); setChargement(false); return }
    onAjoute(data)
  }

  return (
    <form onSubmit={handleSoumettre} className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{LABELS.icon}</span>
        <h3 className="text-white font-semibold text-sm">Ajouter une {type === 'comptine' ? 'comptine' : type === 'sourate' ? 'sourate' : 'vidéo'}</h3>
      </div>

      {erreur && <p className="text-red-400 text-xs bg-red-900/30 rounded-lg px-3 py-2">{erreur}</p>}

      {/* Titre */}
      <div>
        <label className="block text-gray-400 text-xs mb-1">{LABELS.titre}</label>
        <input type="text" value={titre} onChange={e => setTitre(e.target.value)} required
          placeholder={type === 'sourate' ? 'ex : Al-Fatiha' : type === 'comptine' ? 'ex : L\'alphabet arabe' : 'ex : Introduction au cours'}
          className="w-full bg-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-500"
        />
      </div>

      {/* Texte arabe (sourate seulement) */}
      {type === 'sourate' && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">Texte en arabe</label>
          <textarea value={texteArabe} onChange={e => setTexteArabe(e.target.value)} rows={4}
            placeholder="بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ..."
            dir="rtl"
            className="w-full bg-gray-700 text-white text-base rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 text-right"
          />
        </div>
      )}

      {/* Traduction (sourate seulement) */}
      {type === 'sourate' && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">Traduction en français</label>
          <textarea value={traduction} onChange={e => setTraduction(e.target.value)} rows={3}
            placeholder="Au nom d'Allah, le Tout Miséricordieux..."
            className="w-full bg-gray-700 text-white text-sm rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
          />
        </div>
      )}

      {/* Paroles / Description */}
      {type !== 'video' && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">{LABELS.paroles}</label>
          <textarea value={texteParoles} onChange={e => setTexteParoles(e.target.value)} rows={3}
            placeholder={type === 'comptine' ? 'Paroles de la comptine...' : 'Translittération...'}
            className="w-full bg-gray-700 text-white text-sm rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-500"
          />
        </div>
      )}

      {/* Lien URL */}
      <div>
        <label className="block text-gray-400 text-xs mb-1 flex items-center gap-1">
          <Link2 size={11} /> Lien YouTube / audio (optionnel)
        </label>
        <input type="url" value={lienUrl} onChange={e => setLienUrl(e.target.value)}
          placeholder="https://youtube.com/..."
          className="w-full bg-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-500"
        />
      </div>

      {/* Upload audio */}
      <div>
        <label className="block text-gray-400 text-xs mb-1 flex items-center gap-1">
          <Upload size={11} /> Fichier audio / vidéo (optionnel, max 20 Mo)
        </label>
        {fichierUrl ? (
          <div className="flex items-center gap-2 bg-gray-700 rounded-xl px-3 py-2.5">
            <span className="text-green-400 text-xs">✓ Fichier uploadé</span>
            <button type="button" onClick={() => { setFichierUrl(null); setFichierPath(null) }}
              className="text-gray-500 hover:text-red-400 text-xs ml-auto">Retirer</button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 py-2.5 rounded-xl text-xs transition disabled:opacity-50">
            {uploading
              ? <><span className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" /> Upload...</>
              : <><Upload size={13} /> Choisir un fichier MP3 / MP4</>
            }
          </button>
        )}
        <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleAudio} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onAnnuler}
          className="flex-1 bg-gray-600 text-gray-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-500 transition">
          Annuler
        </button>
        <button type="submit" disabled={chargement || uploading || !titre}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60">
          {chargement ? 'Enregistrement...' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}

// ─── Panneau Chat (partagé enseignant + élève) ────────────────────────────────

function PanneauChat({
  sessionId,
  messages,
  roleAuteur,
  userId,
}: {
  sessionId: string
  messages: (MessageSession & { auteur: Profile })[]
  roleAuteur: 'enseignant' | 'eleve'
  userId?: string
}) {
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [mainLevee, setMainLevee] = useState(false)
  const [modeAnnonce, setModeAnnonce] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function envoyerMessage(type: 'message' | 'main_levee' | 'annonce' = 'message') {
    const contenu = type === 'main_levee' ? '🖐 Main levée' : texte.trim()
    if (!contenu) return
    setEnvoi(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEnvoi(false); return }
    const { error } = await supabase.from('messages_session').insert({
      session_id: sessionId,
      auteur_id: user.id,
      contenu,
      type,
    })
    if (error) { console.error('envoyerMessage error:', error); setEnvoi(false); return }
    setTexte('')
    if (type === 'main_levee') setMainLevee(true)
    if (type === 'annonce') setModeAnnonce(false)
    setEnvoi(false)
  }

  const isEnseignant = roleAuteur === 'enseignant'

  const mainsLevees = messages.filter(m => m.type === 'main_levee')

  return (
    <div className="flex flex-col h-full">

      {/* ── Bloc mains levées (enseignant uniquement) ─────────── */}
      {isEnseignant && mainsLevees.length > 0 && (
        <div className="shrink-0 bg-orange-500/10 border-b border-orange-500/30 px-3 py-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Hand size={14} className="text-orange-400" />
            <span className="text-orange-400 text-xs font-black uppercase tracking-wide">Mains levées ({mainsLevees.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mainsLevees.map(m => (
              <span key={m.id} className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold px-2 py-1 rounded-lg">
                🖐 {m.auteur?.prenom} {m.auteur?.nom}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Liste des messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {messages.filter(m => m.type !== 'main_levee').length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-500 text-sm">Le chat est vide.<br />Les messages apparaîtront ici.</p>
          </div>
        ) : (
          messages.map(msg => {
            const estMoi = msg.auteur_id === userId
            const estProf = msg.auteur?.role === 'enseignant'
            const estMainLevee = msg.type === 'main_levee'

            if (estMainLevee) {
              return (
                <div key={msg.id} className="flex items-center gap-2 bg-orange-900/30 border border-orange-700/40 rounded-xl px-3 py-2">
                  <span className="text-lg">🖐</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-orange-300 text-xs font-bold">{msg.auteur?.prenom} {msg.auteur?.nom}</span>
                    <span className="text-orange-400 text-xs ml-1">lève la main</span>
                  </div>
                  <span className="text-gray-600 text-xs">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex gap-2 ${estMoi || (isEnseignant && estProf) ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ${estProf ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                  {msg.auteur?.prenom?.[0]}{msg.auteur?.nom?.[0]}
                </div>
                <div className={`max-w-[78%] ${estMoi || (isEnseignant && estProf) ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {estProf && !estMoi && (
                    <span className="text-indigo-400 text-xs font-semibold px-1">Prof</span>
                  )}
                  {!estProf && (
                    <span className="text-gray-500 text-xs px-1">{msg.auteur?.prenom}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    estProf
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-gray-700 text-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.contenu}
                  </div>
                  <span className="text-gray-600 text-xs px-1">
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-gray-700 p-3 space-y-2">
        {/* Bouton annonce (enseignant seulement) */}
        {isEnseignant && (
          <button
            onClick={() => setModeAnnonce(m => !m)}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition ${
              modeAnnonce
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-700/30'
            }`}
          >
            <Megaphone size={15} />
            {modeAnnonce ? '📢 Mode annonce activé — Envoyer ci-dessous' : '📢 Envoyer une annonce à tous'}
          </button>
        )}

        {/* Bouton main levée (élèves seulement) */}
        {!isEnseignant && (
          <button
            onClick={() => envoyerMessage('main_levee')}
            disabled={envoi || mainLevee}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition ${
              mainLevee
                ? 'bg-orange-900/40 text-orange-400 border border-orange-700/40'
                : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-700/30'
            }`}
          >
            <Hand size={15} />
            {mainLevee ? 'Main levée !' : 'Lever la main 🖐'}
          </button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={texte}
            onChange={e => setTexte(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                envoyerMessage(modeAnnonce ? 'annonce' : 'message')
              }
            }}
            placeholder={modeAnnonce ? '📢 Annonce affichée sur les écrans élèves...' : isEnseignant ? 'Message à tous les élèves...' : 'Ton message...'}
            className={`flex-1 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 placeholder-gray-500 ${
              modeAnnonce
                ? 'bg-indigo-900/60 focus:ring-indigo-400 border border-indigo-500'
                : 'bg-gray-700 focus:ring-indigo-400'
            }`}
          />
          <button
            onClick={() => envoyerMessage(modeAnnonce ? 'annonce' : 'message')}
            disabled={envoi || !texte.trim()}
            className={`text-white px-3 py-2.5 rounded-xl transition disabled:opacity-40 ${
              modeAnnonce ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {modeAnnonce ? <Megaphone size={15} /> : <Send size={15} />}
          </button>
        </div>
        {modeAnnonce && (
          <p className="text-indigo-400 text-xs text-center">L&apos;annonce s&apos;affichera en bannière sur l&apos;écran de chaque élève pendant 8 secondes.</p>
        )}
      </div>
    </div>
  )
}

// ─── Panneau Rendus ───────────────────────────────────────────────────────────

type RenduRow = {
  id: string
  titre: string
  fichier_url: string
  type_fichier: string
  created_at: string
  taille: number | null
  eleve: { prenom: string; nom: string } | null
}

function PanneauRendus({ sessionId, classeId }: { sessionId: string; classeId: string }) {
  const [rendus, setRendus] = useState<RenduRow[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function charger() {
      const supabase = createClient()
      const { data } = await supabase
        .from('rendus_eleves')
        .select('id, titre, fichier_url, type_fichier, created_at, taille, eleve:profiles!rendus_eleves_eleve_id_fkey(prenom, nom)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
      setRendus((data || []) as unknown as RenduRow[])
      setChargement(false)
    }
    charger()

    // Realtime pour les nouveaux rendus
    const supabase = createClient()
    const channel = supabase.channel(`rendus-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rendus_eleves', filter: `session_id=eq.${sessionId}` },
        () => charger())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  function icone(type: string) {
    if (type === 'pdf') return <FileText size={14} className="text-red-400 shrink-0" />
    if (type === 'image') return <ImageIcon size={14} className="text-blue-400 shrink-0" />
    return <File size={14} className="text-gray-400 shrink-0" />
  }

  function tailleFmt(taille: number | null) {
    if (!taille) return ''
    if (taille < 1024) return `${taille} o`
    if (taille < 1024 * 1024) return `${(taille / 1024).toFixed(0)} Ko`
    return `${(taille / 1024 / 1024).toFixed(1)} Mo`
  }

  if (chargement) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-gray-600 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Upload size={16} className="text-emerald-400" />
        <h3 className="text-white font-bold text-sm">Devoirs rendus</h3>
        {rendus.length > 0 && (
          <span className="bg-emerald-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{rendus.length}</span>
        )}
      </div>

      {rendus.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <div className="text-3xl mb-2">📤</div>
          <p className="text-sm">Aucun rendu pour l&apos;instant</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rendus.map(r => (
            <li key={r.id} className="bg-gray-700 rounded-xl p-3">
              <div className="flex items-start gap-3">
                {icone(r.type_fichier)}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{r.titre}</p>
                  {r.eleve && (
                    <p className="text-gray-400 text-xs">{r.eleve.prenom} {r.eleve.nom}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {r.taille && <span className="text-gray-500 text-xs">{tailleFmt(r.taille)}</span>}
                  </div>
                </div>
                <a href={r.fichier_url} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 shrink-0">
                  <ExternalLink size={14} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const config: Record<string, { label: string; class: string }> = {
    en_cours: { label: '● En cours', class: 'text-green-400' },
    pause: { label: '⏸ Pause', class: 'text-yellow-400' },
    terminee: { label: 'Terminée', class: 'text-gray-400' },
  }
  const c = config[statut] || { label: statut, class: 'text-gray-400' }
  return <span className={`text-xs font-medium ${c.class}`}>{c.label}</span>
}

function EcranChargement() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-gray-600 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  )
}
