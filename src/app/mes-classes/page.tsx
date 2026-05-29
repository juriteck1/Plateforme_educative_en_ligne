'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Play, LogOut, Star, Calendar, TrendingUp, FileText, ImageIcon, File, ExternalLink, X, UserCircle, Upload, CheckCircle, Loader2, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Classe, Session, Profile, ContenuClasse, DocumentClasse } from '@/types'
import NotificationBell from '@/components/NotificationBell'

type StatClasse = {
  nbSessionsTotal: number
  nbPresences: number
  noteMoyenne: number | null
  dernieresNotes: { note: number; question: string; created_at: string }[]
}

type ClasseAvecSession = Classe & {
  sessionActive: Session | null
  contenus: ContenuClasse[]
  documents: DocumentClasse[]
  stats: StatClasse
}

interface Toast {
  id: string
  titre: string
  message: string
  sessionId: string
}

export default function MesClassesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<ClasseAvecSession[]>([])
  const [chargement, setChargement] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const classeIdsRef = useRef<string[]>([])

  useEffect(() => {
    chargerDonnees()
  }, [])

  // Subscription Realtime sur les sessions des classes de l'élève
  useEffect(() => {
    if (classeIdsRef.current.length === 0) return
    const supabase = createClient()

    const channel = supabase
      .channel('sessions-en-cours')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions' },
        (payload: any) => {
          const session = payload.new as Session
          if (
            session.statut === 'en_cours' &&
            classeIdsRef.current.includes(session.classe_id)
          ) {
            // Mettre à jour la carte de la classe
            setClasses(prev => prev.map(c =>
              c.id === session.classe_id
                ? { ...c, sessionActive: session }
                : c
            ))
            // Afficher le toast
            const toast: Toast = {
              id: session.id,
              titre: '🔴 Cours en direct !',
              message: session.titre,
              sessionId: session.id,
            }
            setToasts(prev => [toast, ...prev])
            // Auto-dismiss après 8 secondes
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toast.id))
            }, 8000)
          }
          // Si la session se termine, retirer le badge En direct
          if (session.statut === 'terminee') {
            setClasses(prev => prev.map(c =>
              c.sessionActive?.id === session.id
                ? { ...c, sessionActive: null }
                : c
            ))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classes.length]) // se (re)lance après le premier chargement

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const [{ data: prof }, { data: inscriptions }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('inscriptions').select('classe:classes(*)').eq('eleve_id', user.id),
    ])

    setProfile(prof)

    const classesAvecSessions = await Promise.all(
      (inscriptions || []).map(async (insc: { classe: any }) => {
        const [{ data: sessions }, { data: contenus }, { data: toutesSessionsData }, { data: docsData }] = await Promise.all([
          supabase.from('sessions').select('*')
            .eq('classe_id', insc.classe.id)
            .in('statut', ['en_cours', 'pause'])
            .order('started_at', { ascending: false }).limit(1),
          supabase.from('contenus_classe').select('*')
            .eq('classe_id', insc.classe.id)
            .order('created_at', { ascending: false }),
          supabase.from('sessions').select('id')
            .eq('classe_id', insc.classe.id)
            .eq('statut', 'terminee'),
          supabase.from('documents_classe').select('*')
            .eq('classe_id', insc.classe.id)
            .order('created_at', { ascending: false }),
        ])

        const sessionIds = (toutesSessionsData || []).map((s: { id: string }) => s.id)
        const nbSessionsTotal = sessionIds.length

        let nbPresences = 0
        let noteMoyenne: number | null = null
        let dernieresNotes: { note: number; question: string; created_at: string }[] = []

        if (sessionIds.length > 0) {
          const [{ data: presData }, { data: exercicesData }] = await Promise.all([
            supabase.from('presences').select('id, statut_appel')
              .eq('eleve_id', user.id)
              .in('session_id', sessionIds),
            supabase.from('exercices').select('id, question')
              .in('session_id', sessionIds),
          ])

          nbPresences = (presData || []).filter((p: { statut_appel: string | null }) =>
            p.statut_appel !== 'absent'
          ).length

          const exerciceIds = (exercicesData || []).map((e: { id: string }) => e.id)
          if (exerciceIds.length > 0) {
            const { data: reponsesData } = await supabase
              .from('reponses').select('note, exercice_id, created_at')
              .eq('eleve_id', user.id)
              .in('exercice_id', exerciceIds)
              .not('note', 'is', null)
              .order('created_at', { ascending: false })

            const notesAvecQuestion = (reponsesData || []).map((r: { note: number; exercice_id: string; created_at: string }) => ({
              note: r.note,
              question: (exercicesData || []).find((e: { id: string }) => e.id === r.exercice_id)?.question || '',
              created_at: r.created_at,
            }))

            dernieresNotes = notesAvecQuestion.slice(0, 5)
            if (notesAvecQuestion.length > 0) {
              noteMoyenne = notesAvecQuestion.reduce((s: number, r: { note: number }) => s + r.note, 0) / notesAvecQuestion.length
            }
          }
        }

        return {
          ...insc.classe,
          sessionActive: sessions?.[0] || null,
          contenus: contenus || [],
          documents: docsData || [],
          stats: { nbSessionsTotal, nbPresences, noteMoyenne, dernieresNotes },
        }
      })
    )

    setClasses(classesAvecSessions)
    classeIdsRef.current = classesAvecSessions.map((c: { id: string }) => c.id)
    setChargement(false)
  }

  async function handleDeconnexion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (chargement) return <EcranChargement />

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      {/* Toasts de notification */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-white border border-green-100 shadow-xl rounded-2xl px-4 py-3 w-80 animate-in slide-in-from-right-4"
          >
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <Play size={16} className="text-green-600" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{toast.titre}</p>
              <p className="text-xs text-gray-500 truncate">{toast.message}</p>
              <button
                onClick={() => router.push(`/session/${toast.sessionId}/eleve`)}
                className="mt-1.5 text-xs font-semibold text-green-600 hover:text-green-700"
              >
                Rejoindre maintenant →
              </button>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-gray-300 hover:text-gray-500 transition shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            <span className="font-bold text-gray-800">L&apos;École du Savoir</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm">
              Bonjour, <strong>{profile?.prenom}</strong> 👋
            </span>
            <Link href="/profil" className="text-gray-400 hover:text-indigo-600 transition"><UserCircle size={20} /></Link>
            <NotificationBell />
            <button onClick={handleDeconnexion} className="text-gray-400 hover:text-gray-600 transition">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes cours</h1>
          <Link href="/rejoindre" className="text-indigo-600 font-medium text-sm hover:underline">
            + Rejoindre une classe
          </Link>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Tu n&apos;es inscrit dans aucune classe
            </h2>
            <p className="text-gray-400 mb-6">Demande le code de ta classe à ton professeur.</p>
            <Link href="/rejoindre"
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition">
              Rejoindre une classe
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {classes.map((classe) => (
              <CarteClasseEleve key={classe.id} classe={classe} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Carte classe élève ───────────────────────────────────────────────────────

type RenduEleve = {
  id: string
  titre: string
  fichier_url: string
  type_fichier: string
  created_at: string
}

function CarteClasseEleve({ classe }: { classe: ClasseAvecSession }) {
  const avantCours = classe.contenus.filter(c => c.type === 'avant_cours')
  const travaux = classe.contenus.filter(c => c.type === 'travail_a_faire')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadEnCours, setUploadEnCours] = useState(false)
  const [uploadOk, setUploadOk] = useState(false)
  const [uploadErreur, setUploadErreur] = useState('')
  const [rendus, setRendus] = useState<RenduEleve[]>([])
  const [rendusTitre, setRendusTitre] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

  useEffect(() => {
    chargerRendus()
  }, [classe.id])

  async function chargerRendus() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('rendus_eleves')
      .select('id, titre, fichier_url, type_fichier, created_at')
      .eq('classe_id', classe.id)
      .eq('eleve_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRendus(data)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    if (!rendusTitre.trim()) {
      setUploadErreur('Ajoute un titre pour ton rendu')
      return
    }
    setUploadEnCours(true)
    setUploadErreur('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadEnCours(false); return }

    const ext = fichier.name.split('.').pop()?.toLowerCase() || ''
    const typeMap: Record<string, string> = { pdf: 'pdf', png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image' }
    const typeFichier = typeMap[ext] || 'autre'

    const filePath = `${user.id}/${classe.id}/${Date.now()}_${fichier.name}`
    const { error: uploadErr } = await supabase.storage
      .from('rendus-eleves')
      .upload(filePath, fichier)

    if (uploadErr) {
      setUploadErreur('Erreur lors de l\'envoi. Vérifie la taille du fichier.')
      setUploadEnCours(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('rendus-eleves')
      .getPublicUrl(filePath)

    await supabase.from('rendus_eleves').insert({
      eleve_id: user.id,
      classe_id: classe.id,
      titre: rendusTitre.trim(),
      fichier_url: publicUrl,
      fichier_path: filePath,
      type_fichier: typeFichier,
      taille: fichier.size,
    })

    setUploadOk(true)
    setShowUploadForm(false)
    setRendusTitre('')
    setTimeout(() => setUploadOk(false), 3000)
    await chargerRendus()
    setUploadEnCours(false)
  }

  function iconeDoc(type: string) {
    if (type === 'pdf') return <FileText size={14} className="text-red-500 shrink-0" />
    if (type === 'image') return <ImageIcon size={14} className="text-blue-500 shrink-0" />
    return <File size={14} className="text-gray-400 shrink-0" />
  }
  const { stats } = classe

  const tauxPresence = stats.nbSessionsTotal > 0
    ? Math.round((stats.nbPresences / stats.nbSessionsTotal) * 100)
    : null

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-gray-50">
        <div>
          <h3 className="font-bold text-gray-900 text-xl">{classe.nom}</h3>
          {classe.description && <p className="text-gray-500 text-sm mt-1">{classe.description}</p>}
        </div>
        {classe.sessionActive && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full shrink-0 ml-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            En direct !
          </span>
        )}
      </div>

      <div className="p-6 grid md:grid-cols-3 gap-6">

        {/* ── Col 1 : Stats globales ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Mon bilan</h4>

          {/* Note moyenne */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
              <Star size={22} className="text-white" fill="white" />
            </div>
            <div>
              <p className="text-xs text-yellow-700 font-semibold">Note moyenne</p>
              {stats.noteMoyenne !== null ? (
                <p className="text-2xl font-black text-yellow-800 leading-none">
                  {stats.noteMoyenne.toFixed(1)}
                  <span className="text-sm font-semibold text-yellow-600">/20</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-yellow-600 mt-0.5">Pas encore de note</p>
              )}
            </div>
          </div>

          {/* Présences */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <p className="text-xs text-indigo-700 font-semibold">Présences</p>
            </div>
            {stats.nbSessionsTotal > 0 ? (
              <>
                <p className="text-2xl font-black text-indigo-800 leading-none">
                  {stats.nbPresences}
                  <span className="text-sm font-semibold text-indigo-500"> / {stats.nbSessionsTotal} cours</span>
                </p>
                <div className="mt-2 bg-indigo-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${tauxPresence}%` }}
                  />
                </div>
                <p className="text-xs text-indigo-400 mt-1">{tauxPresence}% de présence</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-indigo-400">Pas encore de cours</p>
            )}
          </div>
        </div>

        {/* ── Col 2 : Dernières notes ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Dernières notes</h4>
          {stats.dernieresNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-2xl text-center">
              <span className="text-3xl mb-2">📝</span>
              <p className="text-gray-400 text-xs">Pas encore de notes reçues</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {stats.dernieresNotes.map((n, i) => (
                <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                    n.note >= 14 ? 'bg-green-100 text-green-700'
                    : n.note >= 10 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {n.note}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-xs font-medium truncate">{n.question}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Col 3 : Actions + ressources ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Ressources</h4>

          {classe.sessionActive ? (
            <Link href={`/session/${classe.sessionActive.id}/eleve`}
              className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-2xl font-bold hover:bg-green-600 transition shadow-md shadow-green-100 w-full">
              <Play size={18} fill="white" /> Rejoindre le cours en direct
            </Link>
          ) : (
            <div className="text-center text-gray-400 text-sm py-3 border-2 border-dashed border-gray-200 rounded-2xl">
              Pas de cours en ce moment
            </div>
          )}

          {avantCours.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
              <p className="text-xs font-black text-blue-600 uppercase tracking-wide mb-2">📖 À voir</p>
              <ul className="space-y-1.5">
                {avantCours.map(c => (
                  <li key={c.id}>
                    <p className="text-sm font-semibold text-gray-800">{c.titre}</p>
                    {c.contenu && <p className="text-xs text-gray-500">{c.contenu}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {travaux.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
              <p className="text-xs font-black text-orange-600 uppercase tracking-wide mb-2">📋 À faire</p>
              <ul className="space-y-1.5">
                {travaux.map(c => (
                  <li key={c.id}>
                    <p className="text-sm font-semibold text-gray-800">{c.titre}</p>
                    {c.date_limite && (
                      <div className="flex items-center gap-1 mt-0.5">
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
          {classe.documents.length > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3">
              <p className="text-xs font-black text-purple-600 uppercase tracking-wide mb-2">📎 Documents</p>
              <ul className="space-y-1.5">
                {classe.documents.map(doc => (
                  <li key={doc.id}>
                    <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:bg-purple-100 rounded-lg px-1 py-0.5 transition group">
                      {iconeDoc(doc.type_fichier)}
                      <span className="text-sm font-medium text-gray-700 truncate flex-1 group-hover:text-purple-700">
                        {doc.nom}
                      </span>
                      <ExternalLink size={11} className="text-purple-300 group-hover:text-purple-500 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Rendre un devoir ── */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">📤 Mes rendus</p>
              {uploadOk && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <CheckCircle size={12} /> Envoyé !
                </span>
              )}
            </div>

            {/* Liste des rendus existants */}
            {rendus.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {rendus.map(r => (
                  <li key={r.id}>
                    <a href={r.fichier_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:bg-emerald-100 rounded-lg px-1 py-0.5 transition group">
                      {iconeDoc(r.type_fichier)}
                      <span className="text-xs font-medium text-gray-700 truncate flex-1 group-hover:text-emerald-700">
                        {r.titre}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Formulaire upload */}
            {showUploadForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={rendusTitre}
                  onChange={e => setRendusTitre(e.target.value)}
                  placeholder="Nom du devoir (ex: Exercices ch.3)"
                  className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    uploadEnCours ? 'bg-gray-100 text-gray-400' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}>
                    {uploadEnCours
                      ? <><Loader2 size={13} className="animate-spin" /> Envoi…</>
                      : <><Paperclip size={13} /> Choisir un fichier</>}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                      onChange={handleUpload}
                      disabled={uploadEnCours}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => { setShowUploadForm(false); setRendusTitre(''); setUploadErreur('') }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
                  >
                    Annuler
                  </button>
                </div>
                {uploadErreur && <p className="text-xs text-red-500">{uploadErreur}</p>}
              </div>
            ) : (
              <button
                onClick={() => setShowUploadForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-dashed border-emerald-300 transition"
              >
                <Upload size={13} /> Déposer un devoir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EcranChargement() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📚</div>
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}
