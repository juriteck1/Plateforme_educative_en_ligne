'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, Loader2, Video, Calendar, Zap, CheckSquare, Square } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SectionActive } from '@/types'

type ModeCreation = 'maintenant' | 'planifier'

interface SectionOption {
  id: SectionActive
  label: string
  emoji: string
  description: string
  couleur: string
}

const SECTIONS_OPTIONS: SectionOption[] = [
  { id: 'exercices',       label: 'Exercices / Quiz',      emoji: '📝', description: 'QCM et questions interactifs',      couleur: 'indigo' },
  { id: 'documents',       label: 'Documents',              emoji: '📎', description: 'PDF et images à consulter',          couleur: 'purple' },
  { id: 'avant_cours',     label: 'À voir avant le cours',  emoji: '👀', description: 'Ressources préparatoires',          couleur: 'blue'   },
  { id: 'travail_a_faire', label: 'Travail à faire',        emoji: '📋', description: 'Devoirs et activités',              couleur: 'orange' },
  { id: 'comptine',        label: 'Comptine',               emoji: '🎵', description: 'Chanson ou poème pour les enfants', couleur: 'pink'   },
  { id: 'sourate',         label: 'Sourate du Coran',       emoji: '🕌', description: 'Récitation et texte en arabe',      couleur: 'green'  },
  { id: 'video',           label: 'Vidéo',                  emoji: '🎬', description: 'Lien YouTube ou autre vidéo',       couleur: 'red'    },
]

const COULEUR_MAP: Record<string, { border: string; bg: string; text: string }> = {
  indigo: { border: 'border-indigo-400',  bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  purple: { border: 'border-purple-400',  bg: 'bg-purple-50',  text: 'text-purple-700' },
  blue:   { border: 'border-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700'   },
  orange: { border: 'border-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  pink:   { border: 'border-pink-400',    bg: 'bg-pink-50',    text: 'text-pink-700'   },
  green:  { border: 'border-green-400',   bg: 'bg-green-50',   text: 'text-green-700'  },
  red:    { border: 'border-red-400',     bg: 'bg-red-50',     text: 'text-red-700'    },
}

export default function NouvelleSessionPage() {
  const { id: classeId } = useParams<{ id: string }>()
  const router = useRouter()
  const [titre, setTitre] = useState('')
  const [lienVideo, setLienVideo] = useState('')
  const [mode, setMode] = useState<ModeCreation>('maintenant')
  const [sections, setSections] = useState<Set<SectionActive>>(
    new Set(['exercices', 'documents', 'avant_cours', 'travail_a_faire'])
  )
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  function toggleSection(id: SectionActive) {
    setSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSoumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    try {
      const supabase = createClient()
      const maintenant = mode === 'maintenant'

      // Générer automatiquement un lien Jitsi Meet (gratuit, illimité)
      let videoUrl = lienVideo.trim() || null
      if (!videoUrl) {
        const res = await fetch('/api/daily/create-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionTitre: titre }),
        })
        if (res.ok) {
          const data = await res.json()
          videoUrl = data.url
        }
      }

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          classe_id: classeId,
          titre,
          statut: maintenant ? 'en_cours' : 'en_attente',
          daily_room_url: videoUrl,
          daily_room_name: null,
          started_at: maintenant ? new Date().toISOString() : null,
          sections_actives: Array.from(sections),
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      if (maintenant) {
        router.push(`/session/${session.id}/enseignant`)
      } else {
        router.push(`/dashboard/classe/${classeId}`)
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.')
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Link
          href={`/dashboard/classe/${classeId}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition mb-8"
        >
          <ArrowLeft size={18} />
          Retour à la classe
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-4xl mb-4 text-center">🎬</div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Nouveau cours
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Crée un cours et choisis les sections à inclure.
          </p>

          <form onSubmit={handleSoumettre} className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre du cours *
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                placeholder="ex : Les fractions — Leçon 3"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Lien vidéo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Video size={14} />
                  Lien de visioconférence (optionnel)
                </span>
              </label>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-2 flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">🎥</span>
                <div>
                  <p className="text-xs font-semibold text-indigo-700">Jitsi Meet généré automatiquement</p>
                  <p className="text-xs text-indigo-500">Un lien de visio <strong>gratuit et illimité</strong> sera créé pour ce cours. Pas de coupure à 1h !</p>
                </div>
              </div>
              <input
                type="url"
                value={lienVideo}
                onChange={(e) => setLienVideo(e.target.value)}
                placeholder="Ou colle ton propre lien Google Meet, Zoom…"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Laisse vide pour utiliser Jitsi Meet automatiquement.
              </p>
            </div>

            {/* Sections / Types d'activités */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sections de ce cours
              </label>
              <p className="text-xs text-gray-400 mb-3">Coche les types d&apos;activités que tu veux inclure.</p>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS_OPTIONS.map(opt => {
                  const active = sections.has(opt.id)
                  const c = COULEUR_MAP[opt.couleur]
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleSection(opt.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                        active ? `${c.border} ${c.bg}` : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className="text-xl shrink-0">{opt.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-xs ${active ? c.text : 'text-gray-600'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{opt.description}</p>
                      </div>
                      <div className="shrink-0">
                        {active
                          ? <CheckSquare size={16} className={c.text} />
                          : <Square size={16} className="text-gray-300" />
                        }
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {sections.size} section{sections.size !== 1 ? 's' : ''} sélectionnée{sections.size !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Choix du mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quand se déroule ce cours ?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('maintenant')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    mode === 'maintenant'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    mode === 'maintenant' ? 'bg-green-500' : 'bg-gray-100'
                  }`}>
                    <Zap size={20} className={mode === 'maintenant' ? 'text-white' : 'text-gray-400'} />
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-sm ${mode === 'maintenant' ? 'text-green-700' : 'text-gray-700'}`}>
                      Maintenant
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Démarrer le cours tout de suite</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('planifier')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    mode === 'planifier'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    mode === 'planifier' ? 'bg-indigo-500' : 'bg-gray-100'
                  }`}>
                    <Calendar size={20} className={mode === 'planifier' ? 'text-white' : 'text-gray-400'} />
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-sm ${mode === 'planifier' ? 'text-indigo-700' : 'text-gray-700'}`}>
                      À venir
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Planifier pour plus tard</p>
                  </div>
                </button>
              </div>
            </div>

            {erreur && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{erreur}</p>
            )}

            <button
              type="submit"
              disabled={chargement || !titre}
              className={`w-full flex items-center justify-center gap-2 text-white py-4 rounded-xl font-semibold text-lg transition disabled:opacity-60 shadow-md ${
                mode === 'maintenant'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {chargement ? (
                <><Loader2 size={20} className="animate-spin" /> Préparation...</>
              ) : mode === 'maintenant' ? (
                <><Play size={20} /> Démarrer le cours</>
              ) : (
                <><Calendar size={20} /> Enregistrer pour plus tard</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
