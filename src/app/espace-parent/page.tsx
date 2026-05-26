'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, LogOut, GraduationCap, Calendar, ClipboardList,
  FileText, Star, Clock, CheckCircle, AlertCircle, TrendingUp,
  Eye, ChevronRight, User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Bulletin, BulletinMatiere, Classe, Session } from '@/types'

type Onglet = 'accueil' | 'bulletins' | 'presences' | 'exercices' | 'devoirs'

interface Presence {
  id: string
  session_id: string
  rejoint_a: string
  quitte_a: string | null
  statut_appel: 'present' | 'absent' | null
  session?: { titre: string; started_at: string | null; classe?: { nom: string } }
}

interface ReponseAvecExercice {
  id: string
  contenu: string
  correction: string | null
  note: number | null
  created_at: string
  exercice?: { question: string; type: string }
  session_titre?: string
}

interface ContenuClasse {
  id: string
  titre: string
  contenu: string | null
  date_limite: string | null
  type: string
  classe?: { nom: string }
}

export default function EspaceParentPage() {
  const router = useRouter()
  const [parent, setParent] = useState<Profile | null>(null)
  const [enfant, setEnfant] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Classe[]>([])
  const [bulletins, setBulletins] = useState<(Bulletin & { matieres?: BulletinMatiere[] })[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [reponses, setReponses] = useState<ReponseAvecExercice[]>([])
  const [devoirs, setDevoirs] = useState<ContenuClasse[]>([])
  const [onglet, setOnglet] = useState<Onglet>('accueil')
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    // Vérifier rôle parent
    const { data: profil } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profil || profil.role !== 'parent') { router.push('/connexion'); return }
    setParent(profil)

    // Trouver l'enfant lié
    const { data: lien } = await supabase
      .from('parent_eleve')
      .select('eleve_id')
      .eq('parent_id', user.id)
      .single()

    if (!lien) { setChargement(false); return }

    const eleveId = lien.eleve_id

    // Charger toutes les données en parallèle
    const [
      { data: enfantData },
      { data: classesData },
      { data: bulletinsData },
      { data: presencesData },
      { data: reponsesData },
      { data: devoirsData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', eleveId).single(),
      supabase.from('classes')
        .select('*')
        .in('id', (await supabase.from('inscriptions').select('classe_id').eq('eleve_id', eleveId)).data?.map((i: {classe_id: string}) => i.classe_id) || []),
      supabase.from('bulletins')
        .select('*, matieres:bulletin_matieres(*)')
        .eq('eleve_id', eleveId)
        .eq('statut', 'publie')
        .order('trimestre'),
      supabase.from('presences')
        .select('*, session:sessions(titre, started_at, classe:classes(nom))')
        .eq('eleve_id', eleveId)
        .order('rejoint_a', { ascending: false })
        .limit(20),
      supabase.from('reponses')
        .select('*, exercice:exercices(question, type)')
        .eq('eleve_id', eleveId)
        .not('note', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('contenus_classe')
        .select('*, classe:classes(nom)')
        .eq('type', 'travail_a_faire')
        .in('classe_id', (await supabase.from('inscriptions').select('classe_id').eq('eleve_id', eleveId)).data?.map((i: {classe_id: string}) => i.classe_id) || [])
        .order('created_at', { ascending: false }),
    ])

    setEnfant(enfantData)
    setClasses(classesData || [])
    setBulletins(bulletinsData || [])
    setPresences(presencesData || [])
    setReponses(reponsesData || [])
    setDevoirs(devoirsData || [])
    setChargement(false)
  }

  async function deconnecter() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  function moyenneGenerale(): number | null {
    const toutesNotes = bulletins.flatMap(b => (b.matieres || []).filter(m => m.note !== null).map(m => m.note!))
    if (toutesNotes.length === 0) return null
    return toutesNotes.reduce((a, b) => a + b, 0) / toutesNotes.length
  }

  function tauxPresence(): number {
    if (presences.length === 0) return 0
    const presents = presences.filter(p => p.statut_appel !== 'absent').length
    return Math.round((presents / presences.length) * 100)
  }

  function notesMoyenneExercices(): number | null {
    if (reponses.length === 0) return null
    const notées = reponses.filter(r => r.note !== null)
    if (notées.length === 0) return null
    return notées.reduce((a, r) => a + r.note!, 0) / notées.length
  }

  function mentionNote(note: number): { texte: string; classe: string } {
    if (note >= 16) return { texte: 'Très bien', classe: 'text-emerald-600 bg-emerald-50' }
    if (note >= 14) return { texte: 'Bien',       classe: 'text-blue-600 bg-blue-50' }
    if (note >= 12) return { texte: 'Assez bien', classe: 'text-indigo-600 bg-indigo-50' }
    if (note >= 10) return { texte: 'Passable',   classe: 'text-amber-600 bg-amber-50' }
    return                { texte: 'Insuffisant', classe: 'text-red-600 bg-red-50' }
  }

  if (chargement) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  if (!enfant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto p-8">
        <div className="text-6xl mb-4">👨‍👩‍👧</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Aucun enfant lié</h2>
        <p className="text-gray-500 mb-6">Votre compte parent n&apos;est lié à aucun élève. Contactez l&apos;administrateur ou recréez votre compte en renseignant l&apos;email de votre enfant.</p>
        <button onClick={deconnecter} className="text-indigo-600 hover:underline text-sm">Se déconnecter</button>
      </div>
    </div>
  )

  const moy = moyenneGenerale()
  const tauxP = tauxPresence()
  const moyEx = notesMoyenneExercices()

  const ONGLETS: { id: Onglet; label: string; icon: React.ReactNode }[] = [
    { id: 'accueil',   label: 'Accueil',    icon: <TrendingUp size={17} /> },
    { id: 'bulletins', label: 'Bulletins',  icon: <GraduationCap size={17} /> },
    { id: 'presences', label: 'Présences',  icon: <Calendar size={17} /> },
    { id: 'exercices', label: 'Exercices',  icon: <Star size={17} /> },
    { id: 'devoirs',   label: 'Devoirs',    icon: <ClipboardList size={17} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={22} />
            <span className="font-bold text-gray-800 text-sm">L&apos;École du Savoir</span>
            <span className="text-gray-300 mx-1">·</span>
            <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Espace Parents</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Bonjour, <strong>{parent?.prenom}</strong></span>
            <button onClick={deconnecter} className="text-gray-400 hover:text-gray-600 transition" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Bandeau enfant */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">
              {enfant.prenom[0]}{enfant.nom[0]}
            </div>
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Votre enfant</p>
              <h1 className="text-2xl font-black">{enfant.prenom} {enfant.nom}</h1>
              <p className="text-indigo-200 text-sm">{classes.length} classe{classes.length > 1 ? 's' : ''} · {classes.map(c => c.nom).join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Navigation onglets */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6 shadow-sm overflow-x-auto">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap flex-1 justify-center ${
                onglet === o.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>

        {/* ─── ONGLET ACCUEIL ──────────────────────────────────────── */}
        {onglet === 'accueil' && (
          <div className="space-y-6">
            {/* Indicateurs clés */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-black text-indigo-600">{moy !== null ? moy.toFixed(1) : '—'}</p>
                <p className="text-xs text-gray-400 mt-1">Moyenne générale /20</p>
                {moy !== null && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 inline-block ${mentionNote(moy).classe}`}>
                    {mentionNote(moy).texte}
                  </span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-black text-green-600">{tauxP}%</p>
                <p className="text-xs text-gray-400 mt-1">Taux de présence</p>
                <p className="text-xs text-gray-500 mt-2">{presences.length} cours</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-black text-amber-500">{moyEx !== null ? moyEx.toFixed(1) : '—'}</p>
                <p className="text-xs text-gray-400 mt-1">Moy. exercices /20</p>
                <p className="text-xs text-gray-500 mt-2">{reponses.length} exercice{reponses.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Derniers bulletins */}
            {bulletins.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <GraduationCap size={18} className="text-indigo-500" />
                    Dernier bulletin
                  </h2>
                  <button onClick={() => setOnglet('bulletins')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                    Tous les bulletins <ChevronRight size={14} />
                  </button>
                </div>
                {(() => {
                  const dernier = bulletins[bulletins.length - 1]
                  const moyB = dernier.matieres?.filter(m => m.note !== null) || []
                  const moyBVal = moyB.length ? moyB.reduce((a, m) => a + m.note!, 0) / moyB.length : null
                  return (
                    <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold text-indigo-800">
                          {dernier.trimestre === 1 ? '1er' : `${dernier.trimestre}e`} Trimestre {dernier.annee_scolaire}
                        </p>
                        <p className="text-sm text-indigo-500">{dernier.matieres?.length || 0} matières évaluées</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {moyBVal !== null && (
                          <span className="text-2xl font-black text-indigo-700">{moyBVal.toFixed(1)}<span className="text-sm font-normal text-indigo-400">/20</span></span>
                        )}
                        <Link href={`/bulletin/${dernier.id}`} target="_blank"
                          className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                          <Eye size={14} /> Voir
                        </Link>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Devoirs en cours */}
            {devoirs.filter(d => !d.date_limite || new Date(d.date_limite) >= new Date()).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <ClipboardList size={18} className="text-orange-500" />
                    Travaux à faire
                  </h2>
                  <button onClick={() => setOnglet('devoirs')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                    Tous <ChevronRight size={14} />
                  </button>
                </div>
                <ul className="space-y-2">
                  {devoirs.slice(0, 3).map(d => (
                    <li key={d.id} className="flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3">
                      <ClipboardList size={16} className="text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{d.titre}</p>
                        <p className="text-xs text-gray-400">{(d.classe as {nom: string} | undefined)?.nom}</p>
                      </div>
                      {d.date_limite && (
                        <span className="text-xs text-orange-600 font-medium shrink-0">
                          📅 {new Date(d.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET BULLETINS ────────────────────────────────────── */}
        {onglet === 'bulletins' && (
          <div className="space-y-4">
            {bulletins.length === 0 ? (
              <EmptyState icon={<GraduationCap size={40} />} titre="Aucun bulletin publié" desc="Les bulletins apparaîtront ici dès que l'enseignant les publiera." />
            ) : bulletins.map(b => {
              const matieres = b.matieres || []
              const notées = matieres.filter(m => m.note !== null)
              const moyB = notées.length ? notées.reduce((a, m) => a + m.note!, 0) / notées.length : null
              return (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {b.trimestre === 1 ? '1er' : `${b.trimestre}e`} Trimestre
                        <span className="text-gray-400 font-normal ml-2 text-sm">{b.annee_scolaire}</span>
                      </h3>
                      {moyB !== null && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xl font-black text-indigo-700">{moyB.toFixed(2)}<span className="text-sm text-gray-400">/20</span></span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mentionNote(moyB).classe}`}>{mentionNote(moyB).texte}</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/bulletin/${b.id}`} target="_blank"
                      className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                      <Eye size={14} /> Voir le bulletin PDF
                    </Link>
                  </div>
                  {/* Tableau notes résumé */}
                  {matieres.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                      {matieres.map((m, i) => (
                        <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <span className="text-sm font-medium text-gray-700">{m.matiere}</span>
                          <div className="flex items-center gap-3">
                            {m.appreciation && <span className="text-xs text-gray-400 italic hidden sm:block">{m.appreciation}</span>}
                            <span className={`text-sm font-bold ${m.note !== null ? 'text-indigo-700' : 'text-gray-300'}`}>
                              {m.note !== null ? `${m.note}/20` : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.appreciation_generale && (
                    <p className="mt-3 text-sm text-gray-600 italic bg-gray-50 rounded-lg px-4 py-3">
                      💬 {b.appreciation_generale}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── ONGLET PRÉSENCES ────────────────────────────────────── */}
        {onglet === 'presences' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">{presences.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Cours au total</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black text-green-600">{presences.filter(p => p.statut_appel !== 'absent').length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Présences</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black text-red-500">{presences.filter(p => p.statut_appel === 'absent').length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Absences</p>
              </div>
            </div>

            {presences.length === 0 ? (
              <EmptyState icon={<Calendar size={40} />} titre="Aucune présence enregistrée" desc="L'historique des cours apparaîtra ici." />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historique des cours</p>
                </div>
                <ul className="divide-y divide-gray-50">
                  {presences.map(p => {
                    const session = p.session as { titre: string; started_at: string | null; classe?: { nom: string } } | undefined
                    const absent = p.statut_appel === 'absent'
                    return (
                      <li key={p.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${absent ? 'bg-red-100' : 'bg-green-100'}`}>
                            {absent
                              ? <AlertCircle size={16} className="text-red-500" />
                              : <CheckCircle size={16} className="text-green-500" />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{session?.titre || 'Cours'}</p>
                            <p className="text-xs text-gray-400">{session?.classe?.nom}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${absent ? 'text-red-500' : 'text-green-600'}`}>
                            {absent ? 'Absent' : 'Présent'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(p.rejoint_a).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET EXERCICES ────────────────────────────────────── */}
        {onglet === 'exercices' && (
          <div>
            {moyEx !== null && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Moyenne des exercices notés</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-black text-amber-500">{moyEx.toFixed(1)}</span>
                    <span className="text-gray-400">/20</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mentionNote(moyEx).classe}`}>{mentionNote(moyEx).texte}</span>
                  </div>
                </div>
                <Star size={32} className="text-amber-300" />
              </div>
            )}

            {reponses.length === 0 ? (
              <EmptyState icon={<Star size={40} />} titre="Aucun exercice noté" desc="Les résultats des exercices apparaîtront ici après correction par l'enseignant." />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-50">
                  {reponses.map(r => {
                    const mention = r.note !== null ? mentionNote(r.note) : null
                    return (
                      <li key={r.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 mb-1">{r.exercice?.question}</p>
                            <p className="text-xs text-gray-400">Réponse : <span className="text-gray-600">{r.contenu}</span></p>
                            {r.correction && (
                              <p className="text-xs text-indigo-600 mt-1">✏️ Correction : {r.correction}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {r.note !== null && (
                              <>
                                <p className="text-lg font-black text-gray-900">{r.note}<span className="text-sm text-gray-400">/20</span></p>
                                {mention && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mention.classe}`}>{mention.texte}</span>}
                              </>
                            )}
                            <p className="text-xs text-gray-300 mt-1">
                              {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET DEVOIRS ──────────────────────────────────────── */}
        {onglet === 'devoirs' && (
          <div>
            {devoirs.length === 0 ? (
              <EmptyState icon={<ClipboardList size={40} />} titre="Aucun devoir" desc="Les devoirs et travaux à faire apparaîtront ici." />
            ) : (
              <div className="space-y-3">
                {devoirs.map(d => {
                  const enRetard = d.date_limite && new Date(d.date_limite) < new Date()
                  return (
                    <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-5 ${enRetard ? 'border-red-200' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{d.titre}</p>
                          {d.contenu && <p className="text-sm text-gray-500 mt-1">{d.contenu}</p>}
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <BookOpen size={12} />
                            {(d.classe as {nom: string} | undefined)?.nom}
                          </p>
                        </div>
                        {d.date_limite && (
                          <div className={`text-right shrink-0 ${enRetard ? 'text-red-500' : 'text-orange-500'}`}>
                            <p className="text-xs font-bold flex items-center gap-1 justify-end">
                              <Clock size={12} />
                              {enRetard ? 'En retard' : 'Pour le'}
                            </p>
                            <p className="text-sm font-semibold mt-0.5">
                              {new Date(d.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, titre, desc }: { icon: React.ReactNode; titre: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="text-gray-300 flex justify-center mb-4">{icon}</div>
      <p className="font-semibold text-gray-600 mb-1">{titre}</p>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  )
}
