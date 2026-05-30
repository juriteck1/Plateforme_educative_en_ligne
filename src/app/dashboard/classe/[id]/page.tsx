'use client'

import { useEffect, useState, useRef } from 'react'
import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Play, Users, Copy, Check, Plus, Trash2,
  BookOpen, ClipboardList, FileText, ImageIcon, File, Upload,
  ExternalLink, GraduationCap, MessageCircle, FolderOpen,
  ClipboardCheck, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Classe, Session, Profile, ContenuClasse, DocumentClasse } from '@/types'

type OngletActif = 'eleves' | 'exercices' | 'contenu' | 'documents' | 'rendus' | 'messagerie'

type RenduEnseignant = {
  id: string
  titre: string
  fichier_url: string
  type_fichier: string
  created_at: string
  eleve_id: string
  eleve?: { prenom: string; nom: string }
}

const ONGLETS: { id: OngletActif; label: string; icon: React.ReactNode }[] = [
  { id: 'eleves',      label: 'Élèves',      icon: <Users size={16} /> },
  { id: 'exercices',   label: 'Exercices',   icon: <Play size={16} /> },
  { id: 'contenu',     label: 'Contenu',     icon: <BookOpen size={16} /> },
  { id: 'documents',   label: 'Documents',   icon: <FolderOpen size={16} /> },
  { id: 'rendus',      label: 'Rendus',      icon: <ClipboardCheck size={16} /> },
  { id: 'messagerie',  label: 'Messagerie',  icon: <MessageCircle size={16} /> },
]

export default function GererClassePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [classe, setClasse] = useState<Classe | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [eleves, setEleves] = useState<Profile[]>([])
  const [contenus, setContenus] = useState<ContenuClasse[]>([])
  const [documents, setDocuments] = useState<DocumentClasse[]>([])
  const [rendus, setRendus] = useState<RenduEnseignant[]>([])
  const [copie, setCopie] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [onglet, setOnglet] = useState<OngletActif>('eleves')

  useEffect(() => {
    chargerDonnees()
  }, [id])

  async function chargerDonnees() {
    const supabase = createClient()

    const [
      { data: classeData },
      { data: sessionsData },
      { data: inscriptionsData },
      { data: contenusData },
      { data: documentsData },
      { data: rendusData },
    ] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id).single(),
      supabase.from('sessions').select('*').eq('classe_id', id).order('created_at', { ascending: false }),
      supabase.from('inscriptions').select('eleve:profiles(*)').eq('classe_id', id),
      supabase.from('contenus_classe').select('*').eq('classe_id', id).order('created_at', { ascending: false }),
      supabase.from('documents_classe').select('*').eq('classe_id', id).order('created_at', { ascending: false }),
      supabase.from('rendus_eleves').select('*, eleve:profiles(prenom, nom)').eq('classe_id', id).order('created_at', { ascending: false }),
    ])

    setClasse(classeData)
    setSessions(sessionsData || [])
    // ✅ Filtrer uniquement les élèves (exclure parents, profs, admins)
    const elevesOnly = (inscriptionsData || [])
      .map((i: { eleve: any }) => i.eleve)
      .filter((e: any) => e?.role === 'eleve')
    setEleves(elevesOnly)
    setContenus(contenusData || [])
    setDocuments(documentsData || [])
    setRendus(rendusData || [])
    setChargement(false)
  }

  function copierCode() {
    if (!classe) return
    navigator.clipboard.writeText(classe.code_acces)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  if (chargement) return <EcranChargement />
  if (!classe) return <div className="p-8 text-gray-500">Classe introuvable.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Retour */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition mb-5 text-sm">
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>

        {/* Header classe */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{classe.nom}</h1>
              {classe.description && <p className="text-gray-400 text-sm mt-0.5">{classe.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/classe/${id}/bulletins`}
                className="flex items-center gap-1.5 border border-indigo-200 text-indigo-600 px-3 py-2 rounded-xl font-medium hover:bg-indigo-50 transition text-sm"
              >
                <GraduationCap size={15} /> Bulletins
              </Link>
              <Link
                href={`/dashboard/classe/${id}/nouvelle-session`}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition text-sm"
              >
                <Play size={15} /> Lancer un cours
              </Link>
            </div>
          </div>

          {/* Code d'accès */}
          <div className="mt-4 bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-500 font-medium mb-0.5">Code d&apos;accès</p>
              <p className="font-mono font-bold text-xl text-indigo-800 tracking-widest">{classe.code_acces.toUpperCase()}</p>
              <p className="text-xs text-indigo-300 mt-0.5">ecole-du-savoir.vercel.app/rejoindre</p>
            </div>
            <button onClick={copierCode} className="text-indigo-400 hover:text-indigo-700 transition p-2">
              {copie ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        {/* Layout sidebar + contenu */}
        <div className="flex gap-4">

          {/* ── Sidebar navigation ── */}
          <aside className="w-48 shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-0.5 sticky top-4">
              {ONGLETS.map(o => (
                <button
                  key={o.id}
                  onClick={() => {
                    if (o.id === 'messagerie') {
                      router.push('/dashboard/messagerie')
                      return
                    }
                    setOnglet(o.id)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    onglet === o.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {o.icon}
                  {o.label}
                  {o.id === 'eleves' && eleves.length > 0 && (
                    <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${onglet === 'eleves' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                      {eleves.length}
                    </span>
                  )}
                  {o.id === 'rendus' && rendus.length > 0 && (
                    <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${onglet === 'rendus' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {rendus.length}
                    </span>
                  )}
                  {o.id === 'messagerie' && (
                    <ExternalLink size={12} className="ml-auto opacity-50" />
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Zone contenu ── */}
          <main className="flex-1 min-w-0">
            {onglet === 'eleves' && (
              <PanneauEleves eleves={eleves} />
            )}
            {onglet === 'exercices' && (
              <PanneauExercices sessions={sessions} classeId={id as string}
                onSupprime={(sid) => setSessions(sessions.filter(s => s.id !== sid))}
                onDemarre={(sid) => setSessions(sessions.map(s => s.id === sid ? { ...s, statut: 'en_cours' } : s))}
              />
            )}
            {onglet === 'contenu' && (
              <div className="grid md:grid-cols-2 gap-4">
                <SectionContenu
                  classeId={id as string} type="avant_cours" titre="À voir avant le cours"
                  icon={<BookOpen size={15} className="text-blue-500" />} couleur="blue"
                  contenus={contenus.filter(c => c.type === 'avant_cours')}
                  onAjoute={(c) => setContenus([c, ...contenus])}
                  onSupprime={(cid) => setContenus(contenus.filter(c => c.id !== cid))}
                />
                <SectionContenu
                  classeId={id as string} type="travail_a_faire" titre="Travail à faire"
                  icon={<ClipboardList size={15} className="text-orange-500" />} couleur="orange"
                  contenus={contenus.filter(c => c.type === 'travail_a_faire')}
                  onAjoute={(c) => setContenus([c, ...contenus])}
                  onSupprime={(cid) => setContenus(contenus.filter(c => c.id !== cid))}
                />
              </div>
            )}
            {onglet === 'documents' && (
              <SectionDocuments
                classeId={id as string} documents={documents}
                onAjoute={(d) => setDocuments([d, ...documents])}
                onSupprime={(did) => setDocuments(documents.filter(d => d.id !== did))}
              />
            )}
            {onglet === 'rendus' && (
              <PanneauRendus rendus={rendus} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// ─── Panneau Élèves ───────────────────────────────────────────────────────────
function PanneauEleves({ eleves }: { eleves: Profile[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Users size={18} className="text-indigo-500" />
        <h2 className="font-semibold text-gray-800">Élèves inscrits</h2>
        <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{eleves.length}</span>
      </div>
      {eleves.length === 0 ? (
        <div className="text-center py-12">
          <Users size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun élève encore inscrit.</p>
          <p className="text-gray-300 text-xs mt-1">Partage le code d&apos;accès !</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {eleves.map((eleve) => (
            <div key={eleve.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                {eleve.prenom?.[0]}{eleve.nom?.[0]}
              </div>
              <div>
                <p className="text-gray-800 text-sm font-medium">{eleve.prenom} {eleve.nom}</p>
                <p className="text-gray-400 text-xs">{eleve.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Panneau Exercices / Cours ────────────────────────────────────────────────
function PanneauExercices({
  sessions, classeId, onSupprime, onDemarre,
}: {
  sessions: Session[]
  classeId: string
  onSupprime: (id: string) => void
  onDemarre: (id: string) => void
}) {
  const enCours = sessions.filter(s => s.statut === 'en_cours' || s.statut === 'pause')
  const aVenir = sessions.filter(s => s.statut === 'en_attente')
  const terminees = sessions.filter(s => s.statut === 'terminee')

  async function demarrer(session: Session) {
    const supabase = createClient()
    await supabase.from('sessions').update({ statut: 'en_cours', started_at: new Date().toISOString() }).eq('id', session.id)
    onDemarre(session.id)
    window.location.href = `/session/${session.id}/enseignant`
  }

  async function supprimer(session: Session) {
    if (!confirm(`Supprimer "${session.titre}" ?`)) return
    const supabase = createClient()
    await supabase.from('sessions').delete().eq('id', session.id)
    onSupprime(session.id)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Play size={18} className="text-indigo-500" />
          <h2 className="font-semibold text-gray-800">Cours & Exercices</h2>
          <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{sessions.length}</span>
        </div>
        <Link
          href={`/dashboard/classe/${classeId}/nouvelle-session`}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={14} /> Nouveau cours
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Play size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-4">Aucun cours pour l&apos;instant.</p>
          <Link href={`/dashboard/classe/${classeId}/nouvelle-session`}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            Créer le premier cours
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {enCours.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-black text-green-600 uppercase tracking-widest">En cours</h3>
              </div>
              <ul className="space-y-2">
                {enCours.map(s => (
                  <li key={s.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{s.titre}</p>
                      <p className="text-xs text-gray-400">{s.started_at ? `Démarré le ${formatDate(s.started_at)}` : ''}</p>
                    </div>
                    <Link href={`/session/${s.id}/enseignant`}
                      className="bg-green-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 transition">
                      Reprendre
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aVenir.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">À venir</h3>
              </div>
              <ul className="space-y-2">
                {aVenir.map(s => (
                  <li key={s.id} className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{s.titre}</p>
                      <p className="text-xs text-gray-400">Créé le {formatDate(s.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => demarrer(s)}
                        className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                        <Play size={13} /> Démarrer
                      </button>
                      <button onClick={() => supprimer(s)} className="text-gray-300 hover:text-red-400 transition p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {terminees.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Terminés ({terminees.length})</h3>
              </div>
              <ul className="space-y-2">
                {terminees.map(s => (
                  <li key={s.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition">
                    <div>
                      <p className="font-medium text-gray-700">{s.titre}</p>
                      <p className="text-xs text-gray-400">{s.ended_at ? `Terminé le ${formatDate(s.ended_at)}` : formatDate(s.created_at)}</p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-600">Terminée</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Panneau Rendus ───────────────────────────────────────────────────────────
function PanneauRendus({ rendus }: { rendus: RenduEnseignant[] }) {
  function icone(type: string) {
    if (type === 'pdf') return <FileText size={16} className="text-red-400" />
    if (type === 'image') return <ImageIcon size={16} className="text-blue-400" />
    return <File size={16} className="text-gray-400" />
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <ClipboardCheck size={18} className="text-orange-500" />
        <h2 className="font-semibold text-gray-800">Rendus des élèves</h2>
        <span className="ml-1 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{rendus.length}</span>
      </div>
      {rendus.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun rendu pour l&apos;instant.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rendus.map(r => (
            <li key={r.id} className="flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3">
              <div className="shrink-0">{icone(r.type_fichier)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.titre}</p>
                <p className="text-xs text-gray-400">
                  {r.eleve ? `${r.eleve.prenom} ${r.eleve.nom} · ` : ''}
                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </p>
              </div>
              <a href={r.fichier_url} target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-700 transition shrink-0" title="Ouvrir">
                <ExternalLink size={15} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Section Contenu ──────────────────────────────────────────────────────────
function SectionContenu({
  classeId, type, titre, icon, couleur, contenus, onAjoute, onSupprime,
}: {
  classeId: string
  type: 'avant_cours' | 'travail_a_faire'
  titre: string
  icon: React.ReactNode
  couleur: 'blue' | 'orange'
  contenus: ContenuClasse[]
  onAjoute: (c: ContenuClasse) => void
  onSupprime: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [titreSaisi, setTitreSaisi] = useState('')
  const [contenuSaisi, setContenuSaisi] = useState('')
  const [dateLimite, setDateLimite] = useState('')
  const [chargement, setChargement] = useState(false)

  const borderColor = couleur === 'blue' ? 'border-blue-100' : 'border-orange-100'
  const bgColor = couleur === 'blue' ? 'bg-blue-50' : 'bg-orange-50'
  const btnColor = couleur === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'

  async function handleAjouter(e: React.FormEvent) {
    e.preventDefault()
    setChargement(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('contenus_classe').insert({
      classe_id: classeId, enseignant_id: user.id, type,
      titre: titreSaisi, contenu: contenuSaisi || null,
      date_limite: dateLimite ? new Date(dateLimite).toISOString() : null,
    }).select().single()
    if (data) { onAjoute(data); setTitreSaisi(''); setContenuSaisi(''); setDateLimite(''); setShowForm(false) }
    setChargement(false)
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ?')) return
    const supabase = createClient()
    await supabase.from('contenus_classe').delete().eq('id', id)
    onSupprime(id)
  }

  return (
    <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">{icon}<h2 className="font-semibold text-gray-800 text-sm">{titre}</h2></div>
        <button onClick={() => setShowForm(!showForm)} className="p-1.5 text-gray-400 hover:text-gray-600 transition"><Plus size={16} /></button>
      </div>
      {showForm && (
        <form onSubmit={handleAjouter} className={`${bgColor} rounded-xl p-3 mb-3 space-y-2`}>
          <input type="text" value={titreSaisi} onChange={e => setTitreSaisi(e.target.value)} required placeholder="Titre..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <textarea value={contenuSaisi} onChange={e => setContenuSaisi(e.target.value)} rows={2} placeholder="Description (optionnel)..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          {type === 'travail_a_faire' && (
            <input type="date" value={dateLimite} onChange={e => setDateLimite(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={chargement || !titreSaisi} className={`flex-1 ${btnColor} text-white py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-60`}>
              {chargement ? '...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
      {contenus.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Aucun contenu encore.</p>
      ) : (
        <ul className="space-y-2">
          {contenus.map(c => (
            <li key={c.id} className={`${bgColor} rounded-xl px-3 py-2.5`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{c.titre}</p>
                  {c.contenu && <p className="text-gray-500 text-xs mt-0.5">{c.contenu}</p>}
                  {c.date_limite && (
                    <p className="text-xs text-orange-500 mt-1 font-medium">
                      📅 Pour le {new Date(c.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </p>
                  )}
                </div>
                <button onClick={() => supprimer(c.id)} className="text-gray-300 hover:text-red-400 transition shrink-0"><Trash2 size={13} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Section Documents ────────────────────────────────────────────────────────
function SectionDocuments({
  classeId, documents, onAjoute, onSupprime,
}: {
  classeId: string
  documents: DocumentClasse[]
  onAjoute: (d: DocumentClasse) => void
  onSupprime: (id: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function iconeType(type: string) {
    if (type === 'pdf') return <FileText size={16} className="text-red-500" />
    if (type === 'image') return <ImageIcon size={16} className="text-blue-500" />
    return <File size={16} className="text-gray-400" />
  }

  function formatTaille(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  async function handleFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setErreur('Fichier trop lourd (max 10 Mo)'); return }
    setUploading(true); setErreur(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const path = `classes/${classeId}/${Date.now()}-${file.name}`
    const type: DocumentClasse['type_fichier'] = file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'autre'
    const { data: storageData, error: storageError } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type, upsert: false })
    if (storageError) { setErreur(`Erreur : ${storageError.message}`); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storageData.path)
    const { data: doc, error: dbError } = await supabase.from('documents_classe').insert({
      classe_id: classeId, enseignant_id: user.id, nom: file.name,
      fichier_url: urlData.publicUrl, fichier_path: storageData.path, type_fichier: type, taille: file.size,
    }).select().single()
    if (dbError) setErreur(`Erreur DB : ${dbError.message}`)
    else if (doc) onAjoute(doc)
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
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-purple-500" />
          <h2 className="font-semibold text-gray-800">Documents partagés</h2>
          <span className="ml-1 bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">{documents.length}</span>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-60">
          {uploading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</> : <><Plus size={13} /> Ajouter</>}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFichier} />
      </div>
      {erreur && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2 mb-3">{erreur}</p>}
      {documents.length === 0 ? (
        <button onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-purple-200 rounded-xl py-10 flex flex-col items-center gap-2 text-purple-400 hover:border-purple-400 hover:text-purple-600 transition">
          <Upload size={28} />
          <p className="text-sm font-medium">Cliquer pour uploader un PDF ou une image</p>
          <p className="text-xs opacity-70">Max 10 Mo</p>
        </button>
      ) : (
        <ul className="space-y-2">
          {documents.map(doc => (
            <li key={doc.id} className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
              <div className="shrink-0">{iconeType(doc.type_fichier)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.nom}</p>
                <p className="text-xs text-gray-400">{formatTaille(doc.taille)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-700 transition"><ExternalLink size={14} /></a>
                <button onClick={() => supprimer(doc)} className="text-gray-300 hover:text-red-400 transition"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Écran chargement ─────────────────────────────────────────────────────────
function EcranChargement() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}
