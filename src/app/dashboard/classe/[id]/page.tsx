'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Play, Users, Copy, Check, Plus, Trash2, BookOpen, ClipboardList,
  FileText, ImageIcon, File, Upload, ExternalLink, GraduationCap, Megaphone,
  Bell, StickyNote, Pin, ChevronDown, ChevronUp, Pencil, X, Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Classe, Session, Profile, ContenuClasse, DocumentClasse } from '@/types'

type AnnonceType = 'annonce' | 'rappel' | 'note'
type Annonce = {
  id: string
  type: AnnonceType
  titre: string
  contenu: string | null
  epingler: boolean
  created_at: string
}

export default function GererClassePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [classe, setClasse] = useState<Classe | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [eleves, setEleves] = useState<Profile[]>([])
  const [contenus, setContenus] = useState<ContenuClasse[]>([])
  const [documents, setDocuments] = useState<DocumentClasse[]>([])
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [copie, setCopie] = useState(false)
  const [chargement, setChargement] = useState(true)

  useEffect(() => { chargerDonnees() }, [id])

  async function chargerDonnees() {
    const supabase = createClient()
    const [
      { data: classeData },
      { data: sessionsData },
      { data: elevesData },
      { data: contenusData },
      { data: documentsData },
      { data: annoncesData },
    ] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id).single(),
      supabase.from('sessions').select('*').eq('classe_id', id).order('created_at', { ascending: false }),
      supabase.from('inscriptions').select('eleve:profiles(*)').eq('classe_id', id),
      supabase.from('contenus_classe').select('*').eq('classe_id', id).order('created_at', { ascending: false }),
      supabase.from('documents_classe').select('*').eq('classe_id', id).order('created_at', { ascending: false }),
      supabase.from('annonces_classe').select('*').eq('classe_id', id).order('epingler', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setClasse(classeData)
    setSessions(sessionsData || [])
    setEleves((elevesData || []).map((i: { eleve: any }) => i.eleve).filter((e: any) => e?.role === 'eleve'))
    setContenus(contenusData || [])
    setDocuments(documentsData || [])
    setAnnonces(annoncesData || [])
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Retour */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition mb-6">
          <ArrowLeft size={18} /> Retour au tableau de bord
        </Link>

        {/* Header classe */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classe.nom}</h1>
              {classe.description && <p className="text-gray-500 mt-1">{classe.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/dashboard/classe/${id}/bulletins`}
                className="flex items-center gap-2 border border-indigo-200 text-indigo-600 px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-50 transition text-sm">
                <GraduationCap size={16} /> Bulletins
              </Link>
              <Link href={`/dashboard/classe/${id}/nouvelle-session`}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-indigo-700 transition">
                <Play size={16} /> Lancer un cours
              </Link>
            </div>
          </div>
          <div className="mt-4 bg-indigo-50 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600 font-medium mb-0.5">Code d&apos;accès pour les élèves</p>
              <p className="font-mono font-bold text-2xl text-indigo-800 tracking-widest">{classe.code_acces.toUpperCase()}</p>
              <p className="text-xs text-indigo-400 mt-1">Les élèves entrent ce code sur <strong>ecole-du-savoir.vercel.app/rejoindre</strong></p>
            </div>
            <button onClick={copierCode} className="text-indigo-400 hover:text-indigo-700 transition p-2">
              {copie ? <Check size={22} className="text-green-500" /> : <Copy size={22} />}
            </button>
          </div>
        </div>

        {/* ── Annonces ── */}
        <SectionAnnonces
          classeId={id as string}
          annonces={annonces}
          onAjoute={(a) => setAnnonces([a, ...annonces])}
          onSupprime={(aid) => setAnnonces(annonces.filter(a => a.id !== aid))}
          onTogglePin={(aid) => setAnnonces(annonces.map(a => a.id === aid ? { ...a, epingler: !a.epingler } : a))}
        />

        {/* Sections avant_cours + travail_a_faire (rattachés à la classe) */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <SectionContenu
            classeId={id as string}
            type="avant_cours"
            titre="À voir avant le cours"
            icon={<BookOpen size={16} className="text-blue-500" />}
            couleur="blue"
            contenus={contenus.filter(c => c.type === 'avant_cours' && !c.session_id)}
            onAjoute={(c) => setContenus([c, ...contenus])}
            onSupprime={(cid) => setContenus(contenus.filter(c => c.id !== cid))}
          />
          <SectionContenu
            classeId={id as string}
            type="travail_a_faire"
            titre="Travail à faire"
            icon={<ClipboardList size={16} className="text-orange-500" />}
            couleur="orange"
            contenus={contenus.filter(c => c.type === 'travail_a_faire' && !c.session_id)}
            onAjoute={(c) => setContenus([c, ...contenus])}
            onSupprime={(cid) => setContenus(contenus.filter(c => c.id !== cid))}
          />
        </div>

        {/* Section Documents */}
        <SectionDocuments
          classeId={id as string}
          documents={documents}
          onAjoute={(d) => setDocuments([d, ...documents])}
          onSupprime={(did) => setDocuments(documents.filter(d => d.id !== did))}
        />

        <div className="grid md:grid-cols-3 gap-6">
          {/* Élèves inscrits */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800">Élèves inscrits ({eleves.length})</h2>
            </div>
            {eleves.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun élève encore. Partage le code !</p>
            ) : (
              <ul className="space-y-2">
                {eleves.map((eleve) => (
                  <li key={eleve.id} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      {eleve.prenom[0]}{eleve.nom[0]}
                    </div>
                    <span className="text-gray-700 text-sm flex-1">{eleve.prenom} {eleve.nom}</span>
                    <button
                      onClick={async () => {
                        if (!confirm(`Désinscrire ${eleve.prenom} ${eleve.nom} ?`)) return
                        const supabase = createClient()
                        await supabase.from('inscriptions').delete().eq('classe_id', id).eq('eleve_id', eleve.id)
                        setEleves(eleves.filter(e => e.id !== eleve.id))
                      }}
                      className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-400 p-1"
                      title="Désinscrire"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cours */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800">Cours ({sessions.length})</h2>
              <Link href={`/dashboard/classe/${id}/nouvelle-session`}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                <Plus size={14} /> Nouveau cours
              </Link>
            </div>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-4">Aucun cours pour l&apos;instant.</p>
                <Link href={`/dashboard/classe/${id}/nouvelle-session`}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                  Créer le premier cours
                </Link>
              </div>
            ) : (
              <SessionsGroupees
                sessions={sessions}
                classeId={id as string}
                contenus={contenus}
                onSupprime={(sid) => setSessions(sessions.filter(s => s.id !== sid))}
                onDemarre={(sid) => setSessions(sessions.map(s => s.id === sid ? { ...s, statut: 'en_cours' } : s))}
                onContenusChange={setContenus}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section Annonces ─────────────────────────────────────────────────────────
function SectionAnnonces({ classeId, annonces, onAjoute, onSupprime, onTogglePin }: {
  classeId: string
  annonces: Annonce[]
  onAjoute: (a: Annonce) => void
  onSupprime: (id: string) => void
  onTogglePin: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<AnnonceType>('annonce')
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [epingler, setEpingler] = useState(false)
  const [saving, setSaving] = useState(false)

  const TYPE_CONFIG = {
    annonce: { label: 'Annonce', icon: <Megaphone size={14} />, color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    rappel:  { label: 'Rappel',  icon: <Bell size={14} />,      color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
    note:    { label: 'Note',    icon: <StickyNote size={14} />, color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
  }

  async function handleAjouter(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('annonces_classe').insert({
      classe_id: classeId, enseignant_id: user.id, type, titre, contenu: contenu || null, epingler,
    }).select().single()
    if (data) { onAjoute(data); setTitre(''); setContenu(''); setEpingler(false); setShowForm(false) }
    setSaving(false)
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return
    const supabase = createClient()
    await supabase.from('annonces_classe').delete().eq('id', id)
    onSupprime(id)
  }

  async function togglePin(annonce: Annonce) {
    const supabase = createClient()
    await supabase.from('annonces_classe').update({ epingler: !annonce.epingler }).eq('id', annonce.id)
    onTogglePin(annonce.id)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-rose-500" />
          <h2 className="font-semibold text-gray-800">Annonces & Rappels</h2>
          {annonces.length > 0 && <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">{annonces.length}</span>}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-rose-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-600 transition">
          <Plus size={14} /> Publier
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAjouter} className="bg-rose-50 rounded-xl p-4 mb-4 space-y-3">
          {/* Type */}
          <div className="flex gap-2">
            {(Object.entries(TYPE_CONFIG) as [AnnonceType, typeof TYPE_CONFIG.annonce][]).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setType(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  type === k ? `${v.color} ${v.border}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} required placeholder="Titre de l'annonce..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={2} placeholder="Détails (optionnel)..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={epingler} onChange={e => setEpingler(e.target.checked)} className="rounded" />
            Épingler en haut
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={saving || !titre} className="flex-1 bg-rose-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-rose-600 disabled:opacity-60">
              {saving ? '...' : 'Publier'}
            </button>
          </div>
        </form>
      )}

      {annonces.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Aucune annonce. Publie un message pour toute la classe !</p>
      ) : (
        <ul className="space-y-2">
          {annonces.map(a => {
            const cfg = TYPE_CONFIG[a.type]
            return (
              <li key={a.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${cfg.border} bg-white group`}>
                {a.epingler && <Pin size={13} className="text-gray-400 mt-0.5 shrink-0" />}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 mt-0.5 ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{a.titre}</p>
                  {a.contenu && <p className="text-gray-500 text-xs mt-0.5">{a.contenu}</p>}
                  <p className="text-gray-300 text-xs mt-1">{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => togglePin(a)} className="p-1 text-gray-300 hover:text-indigo-500 transition" title={a.epingler ? 'Désépingler' : 'Épingler'}>
                    <Pin size={13} className={a.epingler ? 'text-indigo-400' : ''} />
                  </button>
                  <button onClick={() => supprimer(a.id)} className="p-1 text-gray-300 hover:text-red-400 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─── Sessions groupées ────────────────────────────────────────────────────────
function SessionsGroupees({ sessions, classeId, contenus, onSupprime, onDemarre, onContenusChange }: {
  sessions: Session[]
  classeId: string
  contenus: ContenuClasse[]
  onSupprime: (id: string) => void
  onDemarre: (id: string) => void
  onContenusChange: (c: ContenuClasse[]) => void
}) {
  const enCours  = sessions.filter(s => s.statut === 'en_cours' || s.statut === 'pause')
  const aVenir   = sessions.filter(s => s.statut === 'en_attente')
  const terminees = sessions.filter(s => s.statut === 'terminee')

  const [sessionEditSections, setSessionEditSections] = useState<Session | null>(null)
  const [sessionEditContenus, setSessionEditContenus] = useState<Session | null>(null)

  async function demarrer(s: Session) {
    const supabase = createClient()
    await supabase.from('sessions').update({ statut: 'en_cours', started_at: new Date().toISOString() }).eq('id', s.id)
    onDemarre(s.id)
    window.location.href = `/session/${s.id}/enseignant`
  }

  async function supprimer(s: Session) {
    if (!confirm(`Supprimer "${s.titre}" ?`)) return
    const supabase = createClient()
    await supabase.from('sessions').delete().eq('id', s.id)
    onSupprime(s.id)
  }

  async function rouvrir(s: Session) {
    if (!confirm(`Rouvrir le cours "${s.titre}" ?`)) return
    const supabase = createClient()
    await supabase.from('sessions').update({ statut: 'en_attente', ended_at: null }).eq('id', s.id)
    window.location.reload()
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function SessionItem({ s, actions }: { s: Session; actions: React.ReactNode }) {
    return (
      <li className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800 truncate">{s.titre}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {s.started_at ? `Démarré le ${formatDate(s.started_at)}` : s.ended_at ? `Terminé le ${formatDate(s.ended_at)}` : `Créé le ${formatDate(s.created_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">{actions}</div>
      </li>
    )
  }

  const ALL_SECTIONS: { id: string; label: string }[] = [
    { id: 'exercice', label: 'Exercices' }, { id: 'comptine', label: 'Comptine' },
    { id: 'sourate', label: 'Sourate' }, { id: 'video', label: 'Vidéo' },
  ]

  return (
    <div className="space-y-5">
      {/* En cours */}
      {enCours.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h3 className="text-xs font-black text-green-600 uppercase tracking-widest">En cours</h3>
          </div>
          <ul className="space-y-2">
            {enCours.map(s => (
              <SessionItem key={s.id} s={s} actions={
                <>
                  <StatutBadge statut={s.statut} />
                  <Link href={`/session/${s.id}/enseignant`}
                    className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 transition">
                    Reprendre
                  </Link>
                </>
              } />
            ))}
          </ul>
        </div>
      )}

      {/* À venir */}
      {aVenir.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full" />
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">À venir</h3>
          </div>
          <ul className="space-y-2">
            {aVenir.map(s => (
              <SessionItem key={s.id} s={s} actions={
                <>
                  <button onClick={() => setSessionEditSections(s)}
                    className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="Modifier les sections">
                    <Settings size={14} />
                  </button>
                  <button onClick={() => setSessionEditContenus(s)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Gérer le contenu du cours">
                    <BookOpen size={14} />
                  </button>
                  <button onClick={() => demarrer(s)}
                    className="flex items-center gap-1 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                    <Play size={12} /> Démarrer
                  </button>
                  <button onClick={() => supprimer(s)} className="p-1.5 text-gray-300 hover:text-red-400 transition">
                    <Trash2 size={14} />
                  </button>
                </>
              } />
            ))}
          </ul>
        </div>
      )}

      {/* Terminés */}
      {terminees.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Terminés ({terminees.length})</h3>
          </div>
          <ul className="space-y-2">
            {terminees.map(s => (
              <SessionItem key={s.id} s={s} actions={
                <>
                  <StatutBadge statut={s.statut} />
                  <button onClick={() => rouvrir(s)}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-2 py-1 rounded-lg transition">
                    <Play size={11} /> Rouvrir
                  </button>
                  <button onClick={() => supprimer(s)} className="p-1.5 text-gray-300 hover:text-red-400 transition">
                    <Trash2 size={14} />
                  </button>
                </>
              } />
            ))}
          </ul>
        </div>
      )}

      {/* Modal : Modifier les sections du cours */}
      {sessionEditSections && (
        <ModalEditSections
          session={sessionEditSections}
          allSections={ALL_SECTIONS}
          onSave={(updated) => {
            setSessionEditSections(null)
            // Rafraîchir via reload pour simplifier
            window.location.reload()
          }}
          onClose={() => setSessionEditSections(null)}
        />
      )}

      {/* Modal : Gérer le contenu rattaché au cours */}
      {sessionEditContenus && (
        <ModalContenusSession
          session={sessionEditContenus}
          classeId={classeId}
          contenus={contenus.filter(c => c.session_id === sessionEditContenus.id)}
          onClose={() => setSessionEditContenus(null)}
          onContenusChange={onContenusChange}
          allContenus={contenus}
        />
      )}
    </div>
  )
}

// ─── Modal : Modifier sections d'un cours ─────────────────────────────────────
function ModalEditSections({ session, allSections, onSave, onClose }: {
  session: Session
  allSections: { id: string; label: string }[]
  onSave: (updated: Session) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string[]>(session.sections_actives || [])
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function sauvegarder() {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('sessions').update({ sections_actives: selected }).eq('id', session.id).select().single()
    if (data) onSave(data)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Sections du cours</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-gray-500 text-sm mb-4">Coche les sections à activer pour ce cours :</p>
        <div className="space-y-2 mb-5">
          {allSections.map(s => (
            <label key={s.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-gray-700 text-sm font-medium">{s.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
          <button onClick={sauvegarder} disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal : Contenus rattachés à un cours ────────────────────────────────────
function ModalContenusSession({ session, classeId, contenus, allContenus, onClose, onContenusChange }: {
  session: Session
  classeId: string
  contenus: ContenuClasse[]
  allContenus: ContenuClasse[]
  onClose: () => void
  onContenusChange: (c: ContenuClasse[]) => void
}) {
  const [titre, setTitre] = useState('')
  const [contenuText, setContenuText] = useState('')
  const [type, setType] = useState<'avant_cours' | 'travail_a_faire'>('avant_cours')
  const [saving, setSaving] = useState(false)

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('contenus_classe').insert({
      classe_id: classeId, enseignant_id: user.id, type, titre,
      contenu: contenuText || null, session_id: session.id,
    }).select().single()
    if (data) { onContenusChange([data, ...allContenus]); setTitre(''); setContenuText('') }
    setSaving(false)
  }

  async function supprimer(id: string) {
    const supabase = createClient()
    await supabase.from('contenus_classe').delete().eq('id', id)
    onContenusChange(allContenus.filter(c => c.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Contenu du cours</h2>
            <p className="text-xs text-gray-400 mt-0.5">{session.titre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Liste existante */}
        {contenus.length > 0 && (
          <ul className="space-y-2 mb-4">
            {contenus.map(c => (
              <li key={c.id} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${c.type === 'avant_cours' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {c.type === 'avant_cours' ? 'Avant' : 'Devoir'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{c.titre}</p>
                  {c.contenu && <p className="text-xs text-gray-500 mt-0.5">{c.contenu}</p>}
                </div>
                <button onClick={() => supprimer(c.id)} className="text-gray-300 hover:text-red-400 transition p-1 shrink-0">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Formulaire ajout */}
        <form onSubmit={ajouter} className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ajouter un contenu à ce cours</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('avant_cours')}
              className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition ${type === 'avant_cours' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              📖 À voir avant
            </button>
            <button type="button" onClick={() => setType('travail_a_faire')}
              className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition ${type === 'travail_a_faire' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              📋 Travail à faire
            </button>
          </div>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} required placeholder="Titre..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <textarea value={contenuText} onChange={e => setContenuText(e.target.value)} rows={2} placeholder="Description (optionnel)..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Fermer</button>
            <button type="submit" disabled={saving || !titre}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {saving ? '...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Section Contenu (classe générale) ───────────────────────────────────────
function SectionContenu({ classeId, type, titre, icon, couleur, contenus, onAjoute, onSupprime }: {
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
      session_id: null,
    }).select().single()
    if (data) { onAjoute(data); setTitreSaisi(''); setContenuSaisi(''); setDateLimite(''); setShowForm(false) }
    setChargement(false)
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer cet élément ?')) return
    const supabase = createClient()
    await supabase.from('contenus_classe').delete().eq('id', id)
    onSupprime(id)
  }

  return (
    <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">{icon}<h2 className="font-semibold text-gray-800">{titre}</h2></div>
        <button onClick={() => setShowForm(!showForm)} className="p-1.5 text-gray-400 hover:text-gray-600 transition"><Plus size={18} /></button>
      </div>
      {showForm && (
        <form onSubmit={handleAjouter} className={`${bgColor} rounded-xl p-4 mb-4 space-y-3`}>
          <input type="text" value={titreSaisi} onChange={e => setTitreSaisi(e.target.value)} required placeholder="Titre..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <textarea value={contenuSaisi} onChange={e => setContenuSaisi(e.target.value)} rows={2} placeholder="Description (optionnel)..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          {type === 'travail_a_faire' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date limite (optionnel)</label>
              <input type="date" value={dateLimite} onChange={e => setDateLimite(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={chargement || !titreSaisi}
              className={`flex-1 ${btnColor} text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60`}>
              {chargement ? '...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
      {contenus.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Aucun contenu encore.</p>
      ) : (
        <ul className="space-y-2">
          {contenus.map(c => (
            <li key={c.id} className={`${bgColor} rounded-xl px-4 py-3`}>
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
                <button onClick={() => supprimer(c.id)} className="text-gray-300 hover:text-red-400 transition shrink-0"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Section Documents ────────────────────────────────────────────────────────
function SectionDocuments({ classeId, documents, onAjoute, onSupprime }: {
  classeId: string
  documents: DocumentClasse[]
  onAjoute: (d: DocumentClasse) => void
  onSupprime: (id: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function iconeType(type: string) {
    if (type === 'pdf') return <FileText size={18} className="text-red-500" />
    if (type === 'image') return <ImageIcon size={18} className="text-blue-500" />
    return <File size={18} className="text-gray-400" />
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
    if (storageError) { setErreur(`Erreur upload : ${storageError.message}`); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storageData.path)
    const { data: doc, error: dbError } = await supabase.from('documents_classe').insert({
      classe_id: classeId, enseignant_id: user.id, nom: file.name,
      fichier_url: urlData.publicUrl, fichier_path: storageData.path, type_fichier: type, taille: file.size,
    }).select().single()
    if (dbError) setErreur(`Erreur base de données : ${dbError.message}`)
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
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-purple-500" />
          <h2 className="font-semibold text-gray-800">Documents partagés ({documents.length})</h2>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-60">
          {uploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</> : <><Plus size={14} /> Ajouter</>}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFichier} />
      </div>
      {erreur && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2 mb-3">{erreur}</p>}
      {documents.length === 0 ? (
        <button onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-purple-200 rounded-xl py-8 flex flex-col items-center gap-2 text-purple-400 hover:border-purple-400 hover:text-purple-600 transition">
          <Upload size={28} /><p className="text-sm font-medium">Cliquer pour uploader un PDF ou une image</p>
          <p className="text-xs opacity-70">Max 10 Mo — PDF, PNG, JPG, GIF</p>
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
                <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-700 transition"><ExternalLink size={15} /></a>
                <button onClick={() => supprimer(doc)} className="text-gray-300 hover:text-red-400 transition"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    en_attente: 'bg-gray-100 text-gray-500', en_cours: 'bg-green-100 text-green-700',
    pause: 'bg-yellow-100 text-yellow-700', terminee: 'bg-blue-100 text-blue-600',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', en_cours: 'En cours', pause: 'Pause', terminee: 'Terminée',
  }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[statut] || ''}`}>{labels[statut] || statut}</span>
}

function EcranChargement() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}
