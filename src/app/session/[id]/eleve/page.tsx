'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, Video, ExternalLink, CheckCircle2, BookOpen, ClipboardList, Calendar, FileText, ImageIcon, File, Music, Link2, MessageCircle, X, Hand, LogOut, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Session, Exercice, Reponse, ContenuClasse, DocumentClasse, ContenuSession, MessageSession, Profile } from '@/types'

export default function SalleElevePage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [exercices, setExercices] = useState<Exercice[]>([])
  const [mesReponses, setMesReponses] = useState<Record<string, Reponse>>({})
  const [contenus, setContenus] = useState<ContenuClasse[]>([])
  const [documents, setDocuments] = useState<DocumentClasse[]>([])
  const [contenusSession, setContenusSession] = useState<ContenuSession[]>([])
  const [messages, setMessages] = useState<(MessageSession & { auteur: Profile })[]>([])
  const [chatOuvert, setChatOuvert] = useState(false)
  const [nbNouveaux, setNbNouveaux] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [confirmerQuitter, setConfirmerQuitter] = useState(false)
  const [mainLevee, setMainLevee] = useState(false)
  const [annonce, setAnnonce] = useState<string | null>(null)

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null

    async function initialiser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/connexion'); return }
      setUserId(user.id)

      const { data: sessionData } = await supabase
        .from('sessions').select('*, classe:classes(*)').eq('id', sessionId).single()
      setSession(sessionData)

      // Charger les contenus et documents de la classe + contenus session
      if (sessionData?.classe_id) {
        const [{ data: contenusData }, { data: docsData }, { data: contSessData }] = await Promise.all([
          supabase.from('contenus_classe').select('*')
            .eq('classe_id', sessionData.classe_id)
            .order('created_at', { ascending: true }),
          supabase.from('documents_classe').select('*')
            .eq('classe_id', sessionData.classe_id)
            .order('created_at', { ascending: false }),
          supabase.from('contenus_session').select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false }),
        ])
        setContenus(contenusData || [])
        setDocuments(docsData || [])
        setContenusSession(contSessData || [])
      }

      // Charger les messages du chat
      const { data: msgsData } = await supabase
        .from('messages_session')
        .select('*, auteur:profiles(*)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      setMessages((msgsData || []) as (MessageSession & { auteur: Profile })[])

      // Enregistrer la présence
      await supabase.from('presences').upsert({
        session_id: sessionId, eleve_id: user.id, rejoint_a: new Date().toISOString(),
      }, { onConflict: 'session_id,eleve_id' })

      // Auto-inscrire l'élève à la classe si pas encore inscrit
      if (sessionData?.classe_id) {
        const { data: dejaInscrit } = await supabase
          .from('inscriptions')
          .select('id')
          .eq('classe_id', sessionData.classe_id)
          .eq('eleve_id', user.id)
          .single()
        if (!dejaInscrit) {
          await supabase.from('inscriptions').insert({
            classe_id: sessionData.classe_id,
            eleve_id: user.id,
          })
        }
      }

      await chargerExercicesEtReponses(user.id)

      channel = supabase.channel(`eleve-session-${sessionId}-${Date.now()}`)
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
          (payload: any) => setSession(payload.new as Session))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exercices', filter: `session_id=eq.${sessionId}` },
          async () => { await chargerExercicesEtReponses(user.id) })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exercices', filter: `session_id=eq.${sessionId}` },
          async () => { await chargerExercicesEtReponses(user.id) })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reponses', filter: `eleve_id=eq.${user.id}` },
          async (payload: any) => {
            const rep = payload.new as Reponse
            setMesReponses(prev => ({ ...prev, [rep.exercice_id]: rep }))
          })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_session', filter: `session_id=eq.${sessionId}` },
          async (payload: any) => {
            const supabase2 = createClient()
            const { data } = await supabase2
              .from('messages_session')
              .select('*, auteur:profiles(*)')
              .eq('session_id', sessionId)
              .order('created_at', { ascending: true })
            const msgs = (data || []) as (MessageSession & { auteur: Profile })[]
            setMessages(msgs)
            // Afficher une bannière si c'est une annonce du prof
            if (payload.new?.type === 'annonce') {
              setAnnonce(payload.new.contenu)
              setTimeout(() => setAnnonce(null), 8000)
            } else {
              setChatOuvert(prev => {
                if (!prev) setNbNouveaux(n => n + 1)
                return prev
              })
            }
          })
        .subscribe()

      setChargement(false)
    }

    async function chargerExercicesEtReponses(uid: string) {
      const supabase = createClient()
      const { data: exs, error: exsError } = await supabase
        .from('exercices').select('*').eq('session_id', sessionId)
        .eq('statut', 'envoye').order('created_at', { ascending: true })
      if (exsError) console.error('Erreur exercices (RLS ?):', JSON.stringify(exsError), exsError?.message, exsError?.code, exsError?.details)
      setExercices(exs || [])

      if (exs && exs.length > 0) {
        const { data: reps, error: repsError } = await supabase
          .from('reponses').select('*').eq('eleve_id', uid)
          .in('exercice_id', exs.map((e: { id: string }) => e.id))
        if (repsError) console.error('Erreur réponses (RLS ?):', repsError)
        const map: Record<string, Reponse> = {}
        for (const r of (reps || [])) map[r.exercice_id] = r
        setMesReponses(map)
      }
    }

    initialiser()
    return () => { if (channel) createClient().removeChannel(channel) }
  }, [sessionId])

  async function leverMain() {
    if (mainLevee || !userId) return
    const supabase = createClient()
    await supabase.from('messages_session').insert({
      session_id: sessionId, auteur_id: userId, contenu: '🖐 Main levée', type: 'main_levee',
    })
    setMainLevee(true)
  }

  async function quitterCours() {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('presences')
      .update({ quitte_a: new Date().toISOString() })
      .eq('session_id', sessionId).eq('eleve_id', userId)
    router.push('/mes-classes')
  }

  async function envoyerReponse(exerciceId: string, contenu: string) {
    if (!userId || !contenu.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('reponses')
      .upsert({ exercice_id: exerciceId, eleve_id: userId, contenu })
      .select().single()
    if (data) setMesReponses(prev => ({ ...prev, [exerciceId]: data }))
  }

  if (chargement || !session) return <EcranChargement />

  if (session.statut === 'pause') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">☕</div>
          <h1 className="text-gray-800 text-3xl font-black mb-3">Pause !</h1>
          <p className="text-gray-500 text-lg">Le cours reprend dans quelques instants.</p>
          <div className="mt-8 flex justify-center gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (session.statut === 'terminee') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-gray-800 text-3xl font-black mb-3">Bravo !</h1>
          <p className="text-gray-500 text-lg mb-8">Le cours est terminé. Tu as super bien travaillé !</p>
          <button onClick={() => router.push('/mes-classes')}
            className="bg-green-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition shadow-lg shadow-green-200">
            Retour à mes cours 🏠
          </button>
        </div>
      </div>
    )
  }

  const avantCours = contenus.filter(c => c.type === 'avant_cours')
  const travaux = contenus.filter(c => c.type === 'travail_a_faire')
  const sections = session.sections_actives || []
  const comptines = contenusSession.filter(c => c.type === 'comptine')
  const sourates = contenusSession.filter(c => c.type === 'sourate')
  const videos = contenusSession.filter(c => c.type === 'video')

  function iconeDoc(type: string) {
    if (type === 'pdf') return <FileText size={14} className="text-red-500 shrink-0" />
    if (type === 'image') return <ImageIcon size={14} className="text-blue-500 shrink-0" />
    return <File size={14} className="text-gray-400 shrink-0" />
  }
  const nbRepondus = exercices.filter(e => mesReponses[e.id]).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50 flex flex-col">

      {/* ── Bannière annonce prof ───────────────────────────────── */}
      {annonce && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-start justify-center pt-4 px-4 pointer-events-none">
          <div className="bg-indigo-600 text-white px-5 py-4 rounded-2xl shadow-2xl max-w-md w-full flex items-start gap-3 pointer-events-auto animate-bounce-once">
            <Megaphone size={22} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-black text-sm mb-0.5">Message du professeur</p>
              <p className="text-indigo-100 text-sm">{annonce}</p>
            </div>
            <button onClick={() => setAnnonce(null)} className="text-indigo-200 hover:text-white shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modale quitter ──────────────────────────────────────── */}
      {confirmerQuitter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="text-5xl mb-4">🚪</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Quitter le cours ?</h2>
            <p className="text-gray-400 text-sm mb-6">Tu seras déconnecté du cours en cours. Tu pourras le rejoindre à nouveau avec le code.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmerQuitter(false)}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-2xl font-bold hover:bg-gray-50 transition"
              >
                Rester 📚
              </button>
              <button
                onClick={quitterCours}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition"
              >
                Quitter 🚪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white border-b-2 border-indigo-100 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-lg">📚</span>
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm truncate">{session.titre}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-semibold">Cours en direct</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Progression */}
            {exercices.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium">Répondu</p>
                  <p className="text-sm font-black text-indigo-600">{nbRepondus}/{exercices.length}</p>
                </div>
                <div className="w-10 h-10">
                  <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#e0e7ff" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                      strokeDasharray={`${exercices.length > 0 ? (nbRepondus / exercices.length) * 94 : 0} 94`}
                      strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}

            {/* Bouton vidéo */}
            {session.daily_room_url && (
              <a href={session.daily_room_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-100">
                <Video size={15} />
                <span className="hidden sm:inline">Vidéo</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>
            )}

            {/* Bouton quitter */}
            <button
              onClick={() => setConfirmerQuitter(true)}
              className="flex items-center gap-1.5 bg-red-50 text-red-500 border-2 border-red-200 px-3 py-2 rounded-xl font-bold text-sm hover:bg-red-100 transition"
              title="Quitter le cours"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Corps principal : 2 colonnes ───────────────────────── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex gap-6 items-start">

        {/* ── Colonne gauche : ressources (sticky) ─────────────── */}
        {(avantCours.length > 0 || travaux.length > 0 || documents.length > 0 || comptines.length > 0 || sourates.length > 0 || videos.length > 0) && (
          <aside className="w-72 shrink-0 space-y-4 sticky top-24 hidden lg:block">

            {/* À voir avant le cours */}
            {avantCours.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-blue-100 overflow-hidden shadow-sm">
                <div className="bg-blue-50 px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen size={14} className="text-blue-600" />
                  </div>
                  <h3 className="font-black text-blue-700 text-sm">À voir avant le cours</h3>
                </div>
                <ul className="divide-y divide-blue-50">
                  {avantCours.map(c => (
                    <li key={c.id} className="px-4 py-3">
                      <p className="font-bold text-gray-800 text-sm">{c.titre}</p>
                      {c.contenu && <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{c.contenu}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Travail à faire */}
            {travaux.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-orange-100 overflow-hidden shadow-sm">
                <div className="bg-orange-50 px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ClipboardList size={14} className="text-orange-600" />
                  </div>
                  <h3 className="font-black text-orange-700 text-sm">Travail à faire</h3>
                </div>
                <ul className="divide-y divide-orange-50">
                  {travaux.map(c => (
                    <li key={c.id} className="px-4 py-3">
                      <p className="font-bold text-gray-800 text-sm">{c.titre}</p>
                      {c.contenu && <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{c.contenu}</p>}
                      {c.date_limite && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Calendar size={10} className="text-orange-400" />
                          <p className="text-xs text-orange-500 font-semibold">
                            Pour le {new Date(c.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-purple-100 overflow-hidden shadow-sm">
                <div className="bg-purple-50 px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText size={14} className="text-purple-600" />
                  </div>
                  <h3 className="font-black text-purple-700 text-sm">Documents</h3>
                </div>
                <ul className="divide-y divide-purple-50">
                  {documents.map(doc => (
                    <li key={doc.id} className="px-4 py-3">
                      <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 group">
                        {iconeDoc(doc.type_fichier)}
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700 truncate flex-1">
                          {doc.nom}
                        </span>
                        <ExternalLink size={11} className="text-purple-300 group-hover:text-purple-500 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Comptines */}
            {sections.includes('comptine') && comptines.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-pink-100 overflow-hidden shadow-sm">
                <div className="bg-pink-50 px-4 py-3 flex items-center gap-2">
                  <span className="text-lg">🎵</span>
                  <h3 className="font-black text-pink-700 text-sm">Comptine du jour</h3>
                </div>
                {comptines.map(c => (
                  <div key={c.id} className="px-4 py-3 border-t border-pink-50">
                    <p className="font-bold text-gray-800 text-sm mb-1">{c.titre}</p>
                    {c.texte_paroles && <p className="text-gray-600 text-xs whitespace-pre-wrap leading-relaxed">{c.texte_paroles}</p>}
                    {c.lien_url && (
                      <a href={c.lien_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-pink-500 text-xs mt-2 hover:text-pink-700">
                        <Music size={11} /> Écouter
                      </a>
                    )}
                    {c.fichier_url && (
                      <a href={c.fichier_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-pink-500 text-xs mt-1 hover:text-pink-700">
                        <ExternalLink size={11} /> Fichier audio
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sourates */}
            {sections.includes('sourate') && sourates.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-green-100 overflow-hidden shadow-sm">
                <div className="bg-green-50 px-4 py-3 flex items-center gap-2">
                  <span className="text-lg">🕌</span>
                  <h3 className="font-black text-green-700 text-sm">Sourate du jour</h3>
                </div>
                {sourates.map(s => (
                  <div key={s.id} className="px-4 py-3 border-t border-green-50 space-y-2">
                    <p className="font-bold text-gray-800 text-sm">{s.titre}</p>
                    {s.texte_arabe && (
                      <div className="bg-green-50 rounded-xl px-3 py-3">
                        <p className="text-right text-gray-800 text-base leading-loose" dir="rtl">
                          {s.texte_arabe}
                        </p>
                      </div>
                    )}
                    {s.traduction && (
                      <p className="text-gray-500 text-xs italic leading-relaxed">{s.traduction}</p>
                    )}
                    {s.texte_paroles && (
                      <p className="text-gray-500 text-xs leading-relaxed">{s.texte_paroles}</p>
                    )}
                    {s.lien_url && (
                      <a href={s.lien_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 text-xs hover:text-green-800">
                        <Music size={11} /> Écouter la récitation
                      </a>
                    )}
                    {s.fichier_url && (
                      <a href={s.fichier_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 text-xs hover:text-green-800 block">
                        <ExternalLink size={11} /> Fichier audio
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Vidéos */}
            {sections.includes('video') && videos.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden shadow-sm">
                <div className="bg-red-50 px-4 py-3 flex items-center gap-2">
                  <span className="text-lg">🎬</span>
                  <h3 className="font-black text-red-700 text-sm">Vidéos</h3>
                </div>
                {videos.map(v => (
                  <div key={v.id} className="px-4 py-3 border-t border-red-50">
                    <p className="font-bold text-gray-800 text-sm mb-1">{v.titre}</p>
                    {v.texte_paroles && <p className="text-gray-500 text-xs mb-2">{v.texte_paroles}</p>}
                    {v.lien_url && (
                      <a href={v.lien_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
                        <ExternalLink size={11} /> Voir la vidéo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* ── Version mobile des ressources (en haut) ──────────── */}
        {(avantCours.length > 0 || travaux.length > 0 || documents.length > 0 || comptines.length > 0 || sourates.length > 0 || videos.length > 0) && (
          <div className="lg:hidden w-full space-y-3 mb-2">
            {avantCours.length > 0 && (
              <details className="bg-white rounded-2xl border-2 border-blue-100 overflow-hidden shadow-sm">
                <summary className="bg-blue-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
                  <BookOpen size={14} className="text-blue-600" />
                  <span className="font-black text-blue-700 text-sm">📖 À voir avant le cours ({avantCours.length})</span>
                </summary>
                <ul className="divide-y divide-blue-50">
                  {avantCours.map(c => (
                    <li key={c.id} className="px-4 py-3">
                      <p className="font-bold text-gray-800 text-sm">{c.titre}</p>
                      {c.contenu && <p className="text-gray-500 text-xs mt-0.5">{c.contenu}</p>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {travaux.length > 0 && (
              <details className="bg-white rounded-2xl border-2 border-orange-100 overflow-hidden shadow-sm">
                <summary className="bg-orange-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
                  <ClipboardList size={14} className="text-orange-600" />
                  <span className="font-black text-orange-700 text-sm">📋 Travail à faire ({travaux.length})</span>
                </summary>
                <ul className="divide-y divide-orange-50">
                  {travaux.map(c => (
                    <li key={c.id} className="px-4 py-3">
                      <p className="font-bold text-gray-800 text-sm">{c.titre}</p>
                      {c.contenu && <p className="text-gray-500 text-xs mt-0.5">{c.contenu}</p>}
                      {c.date_limite && (
                        <p className="text-xs text-orange-500 font-semibold mt-1">
                          📅 Pour le {new Date(c.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {documents.length > 0 && (
              <details className="bg-white rounded-2xl border-2 border-purple-100 overflow-hidden shadow-sm">
                <summary className="bg-purple-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
                  <FileText size={14} className="text-purple-600" />
                  <span className="font-black text-purple-700 text-sm">📎 Documents ({documents.length})</span>
                </summary>
                <ul className="divide-y divide-purple-50">
                  {documents.map(doc => (
                    <li key={doc.id} className="px-4 py-3">
                      <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 group">
                        {iconeDoc(doc.type_fichier)}
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700 truncate flex-1">
                          {doc.nom}
                        </span>
                        <ExternalLink size={11} className="text-purple-300 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Comptines mobile */}
            {sections.includes('comptine') && comptines.length > 0 && (
              <details className="bg-white rounded-2xl border-2 border-pink-100 overflow-hidden shadow-sm" open>
                <summary className="bg-pink-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
                  <span className="font-black text-pink-700 text-sm">🎵 Comptine ({comptines.length})</span>
                </summary>
                {comptines.map(c => (
                  <div key={c.id} className="px-4 py-3 border-t border-pink-50 space-y-1.5">
                    <p className="font-bold text-gray-800 text-sm">{c.titre}</p>
                    {c.texte_paroles && <p className="text-gray-600 text-xs whitespace-pre-wrap">{c.texte_paroles}</p>}
                    {c.lien_url && (
                      <a href={c.lien_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-pink-500 text-xs">
                        <Music size={11} /> Écouter
                      </a>
                    )}
                  </div>
                ))}
              </details>
            )}

            {/* Sourates mobile */}
            {sections.includes('sourate') && sourates.length > 0 && (
              <details className="bg-white rounded-2xl border-2 border-green-100 overflow-hidden shadow-sm" open>
                <summary className="bg-green-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
                  <span className="font-black text-green-700 text-sm">🕌 Sourate ({sourates.length})</span>
                </summary>
                {sourates.map(s => (
                  <div key={s.id} className="px-4 py-3 border-t border-green-50 space-y-2">
                    <p className="font-bold text-gray-800 text-sm">{s.titre}</p>
                    {s.texte_arabe && (
                      <div className="bg-green-50 rounded-xl px-3 py-2">
                        <p className="text-right text-gray-800 text-base leading-loose" dir="rtl">{s.texte_arabe}</p>
                      </div>
                    )}
                    {s.traduction && <p className="text-gray-500 text-xs italic">{s.traduction}</p>}
                    {s.lien_url && (
                      <a href={s.lien_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 text-xs">
                        <Music size={11} /> Écouter
                      </a>
                    )}
                  </div>
                ))}
              </details>
            )}

            {/* Vidéos mobile */}
            {sections.includes('video') && videos.length > 0 && (
              <details className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden shadow-sm">
                <summary className="bg-red-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
                  <span className="font-black text-red-700 text-sm">🎬 Vidéos ({videos.length})</span>
                </summary>
                {videos.map(v => (
                  <div key={v.id} className="px-4 py-3 border-t border-red-50 space-y-1.5">
                    <p className="font-bold text-gray-800 text-sm">{v.titre}</p>
                    {v.lien_url && (
                      <a href={v.lien_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg">
                        <ExternalLink size={11} /> Voir la vidéo
                      </a>
                    )}
                  </div>
                ))}
              </details>
            )}
          </div>
        )}

        {/* ── Colonne droite : exercices ────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">
          {exercices.length === 0 ? (
            <EcouteProfesseur onLeverMain={leverMain} mainLevee={mainLevee} />
          ) : (
            exercices.map((exercice, idx) => (
              <CarteExercice
                key={exercice.id}
                numero={idx + 1}
                exercice={exercice}
                maReponse={mesReponses[exercice.id] || null}
                onEnvoyer={(contenu) => envoyerReponse(exercice.id, contenu)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Boutons flottants ─────────────────────────────────── */}
      {/* Bouton lever la main */}
      {!chatOuvert && (
        <button
          onClick={leverMain}
          disabled={mainLevee}
          className={`fixed bottom-6 right-24 z-30 w-14 h-14 rounded-full shadow-xl flex flex-col items-center justify-center transition-transform hover:scale-105 gap-0.5 ${
            mainLevee
              ? 'bg-orange-200 cursor-not-allowed'
              : 'bg-orange-400 hover:bg-orange-500'
          }`}
          title={mainLevee ? 'Main levée !' : 'Lever la main'}
        >
          <Hand size={20} className="text-white" />
          {mainLevee && <span className="text-white text-xs font-black leading-none">✓</span>}
        </button>
      )}

      {/* Bouton chat flottant */}
      <button
        onClick={() => { setChatOuvert(true); setNbNouveaux(0) }}
        className={`fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 ${
          nbNouveaux > 0 ? 'bg-orange-500' : 'bg-indigo-600'
        }`}
        style={{ display: chatOuvert ? 'none' : 'flex' }}
      >
        <MessageCircle size={24} className="text-white" />
        {nbNouveaux > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
            {nbNouveaux}
          </span>
        )}
      </button>

      {/* Drawer chat */}
      {chatOuvert && (
        <div className="fixed bottom-0 right-0 z-40 w-full sm:w-96 h-[70vh] bg-white rounded-t-3xl sm:rounded-tl-3xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-white" />
              <p className="text-white font-bold text-sm">Chat du cours</p>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <button onClick={() => setChatOuvert(false)}
              className="text-indigo-200 hover:text-white transition">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <ChatEleveInner
            sessionId={sessionId}
            messages={messages}
            userId={userId}
          />
        </div>
      )}
    </div>
  )
}

// ─── État d'attente ──────────────────────────────────────────────────────────

function EcouteProfesseur({ onLeverMain, mainLevee }: { onLeverMain: () => void; mainLevee: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-28 h-28 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
        <span className="text-5xl">👂</span>
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">Écoute ton professeur !</h2>
      <p className="text-gray-400 text-base">Les exercices apparaîtront ici dès que le prof en envoie un.</p>
      <div className="mt-6 flex justify-center gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2.5 h-2.5 bg-indigo-300 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>

      {/* Bouton lever la main proéminent */}
      <div className="mt-10">
        <button
          onClick={onLeverMain}
          disabled={mainLevee}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg transition shadow-lg ${
            mainLevee
              ? 'bg-orange-100 text-orange-400 shadow-none cursor-default'
              : 'bg-orange-400 hover:bg-orange-500 text-white shadow-orange-200 active:scale-95'
          }`}
        >
          <Hand size={24} />
          {mainLevee ? '✅ Main levée !' : '🖐 Lever la main'}
        </button>
        {!mainLevee && (
          <p className="text-gray-400 text-sm mt-3">Appuie pour signaler au professeur</p>
        )}
      </div>
    </div>
  )
}

// ─── Carte Exercice ──────────────────────────────────────────────────────────

const COULEURS = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
  { bg: 'bg-sky-50',    border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700'    },
  { bg: 'bg-emerald-50',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700'  },
]

function CarteExercice({
  numero, exercice, maReponse, onEnvoyer,
}: {
  numero: number
  exercice: Exercice
  maReponse: Reponse | null
  onEnvoyer: (contenu: string) => void
}) {
  const [texte, setTexte] = useState('')
  const [optionChoisie, setOptionChoisie] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const couleur = COULEURS[(numero - 1) % COULEURS.length]

  async function handleEnvoyer() {
    const contenu = exercice.type === 'qcm' ? (optionChoisie || '') : texte
    if (!contenu.trim()) return
    setEnvoi(true)
    await onEnvoyer(contenu)
    setEnvoi(false)
  }

  return (
    <div className={`rounded-3xl border-2 ${couleur.border} ${couleur.bg} overflow-hidden shadow-sm`}>
      {/* En-tête */}
      <div className="px-6 pt-5 pb-4">
        <span className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${couleur.badge}`}>
          Exercice {numero}
        </span>
        <h2 className="text-xl font-black text-gray-900 leading-snug">{exercice.question}</h2>
      </div>

      {/* Corps */}
      <div className="bg-white px-6 pb-6 pt-4">
        {/* Correction reçue */}
        {maReponse?.correction ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 font-semibold mb-1.5">Ta réponse</p>
              <p className="text-gray-700 font-medium">{maReponse.contenu}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <p className="text-green-700 font-bold text-sm">Correction du professeur</p>
                </div>
                {maReponse.note !== null && (
                  <div className="bg-yellow-400 text-white px-3 py-1 rounded-full flex items-baseline gap-0.5">
                    <span className="font-black text-lg leading-none">{maReponse.note}</span>
                    <span className="text-xs opacity-80">/20</span>
                  </div>
                )}
              </div>
              <p className="text-gray-800 font-semibold">{maReponse.correction}</p>
            </div>
          </div>

        ) : maReponse ? (
          /* En attente de correction */
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-indigo-700 font-black text-base">Réponse envoyée !</p>
            <div className="bg-white rounded-xl px-4 py-3 mt-3 text-left border border-indigo-100">
              <p className="text-xs text-gray-400 font-semibold mb-0.5">Ta réponse</p>
              <p className="text-gray-700 font-medium">{maReponse.contenu}</p>
            </div>
            <p className="text-indigo-400 text-xs mt-3 font-medium">⏳ En attente de la correction...</p>
          </div>

        ) : (
          /* Formulaire */
          <div>
            {exercice.type === 'qcm' && exercice.options ? (
              <div className="space-y-3 mb-5">
                {exercice.options.map((option, i) => {
                  const lettres = ['A', 'B', 'C', 'D']
                  return (
                    <button key={i} type="button" onClick={() => setOptionChoisie(option)}
                      className={`w-full text-left flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition font-semibold text-base ${
                        optionChoisie === option
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                        optionChoisie === option ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{lettres[i] || i + 1}</span>
                      {option}
                    </button>
                  )
                })}
              </div>
            ) : (
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3}
                placeholder="Écris ta réponse ici... ✏️"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base font-medium focus:outline-none focus:border-indigo-400 resize-none mb-5 placeholder-gray-300" />
            )}

            <button onClick={handleEnvoyer}
              disabled={envoi || (!texte && !optionChoisie)}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition shadow-md ${
                (!texte && !optionChoisie)
                  ? 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}>
              {envoi
                ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                : <><Send size={18} /> Envoyer ma réponse</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chat interne élève ───────────────────────────────────────────────────────

function ChatEleveInner({ sessionId, messages, userId }: {
  sessionId: string
  messages: (MessageSession & { auteur: Profile })[]
  userId: string | null
}) {
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [mainLevee, setMainLevee] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function envoyer(type: 'message' | 'main_levee' = 'message') {
    const contenu = type === 'main_levee' ? '🖐 Main levée' : texte.trim()
    if (!contenu) return
    setEnvoi(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEnvoi(false); return }
    await supabase.from('messages_session').insert({
      session_id: sessionId, auteur_id: user.id, contenu, type,
    })
    if (type === 'message') setTexte('')
    if (type === 'main_levee') setMainLevee(true)
    setEnvoi(false)
  }

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-gray-400 text-sm">Aucun message pour l&apos;instant.</p>
          </div>
        ) : (
          messages.map(msg => {
            const estMoi = msg.auteur_id === userId
            const estProf = msg.auteur?.role === 'enseignant'
            const estMainLevee = msg.type === 'main_levee'

            if (estMainLevee && !estMoi) return null

            if (estMainLevee) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">
                    🖐 Tu as levé la main
                  </span>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex gap-2 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ${estProf ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                  {estProf ? '👨‍🏫' : `${msg.auteur?.prenom?.[0]}${msg.auteur?.nom?.[0]}`}
                </div>
                <div className={`max-w-[78%] flex flex-col gap-0.5 ${estMoi ? 'items-end' : 'items-start'}`}>
                  {estProf && <span className="text-indigo-600 text-xs font-bold px-1">Professeur</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    estMoi
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : estProf
                        ? 'bg-indigo-100 text-indigo-900 rounded-tl-sm border border-indigo-200'
                        : 'bg-white text-gray-800 rounded-tl-sm border border-gray-200'
                  }`}>
                    {msg.contenu}
                  </div>
                  <span className="text-gray-400 text-xs px-1">
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Saisie */}
      <div className="border-t border-gray-100 p-3 space-y-2 bg-white shrink-0">
        <button
          onClick={() => envoyer('main_levee')}
          disabled={envoi || mainLevee}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition ${
            mainLevee
              ? 'bg-orange-50 text-orange-400 border-2 border-orange-200'
              : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-2 border-orange-200'
          }`}
        >
          <Hand size={15} />
          {mainLevee ? '✅ Main levée !' : 'Lever la main 🖐'}
        </button>
        <div className="flex gap-2">
          <input
            type="text"
            value={texte}
            onChange={e => setTexte(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); envoyer() } }}
            placeholder="Écris un message..."
            className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-400 placeholder-gray-400"
          />
          <button
            onClick={() => envoyer()}
            disabled={envoi || !texte.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl transition disabled:opacity-40 font-bold"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

function EcranChargement() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">📚</div>
        <p className="text-gray-400 font-semibold text-lg">Connexion au cours...</p>
        <div className="mt-4 flex justify-center gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-indigo-300 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
