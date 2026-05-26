'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, Pencil, Trash2, ArrowLeft, Search, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ExerciceModele } from '@/types'

const MATIERES = ['Mathématiques', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais', 'Arts', 'EPS', 'Arabe', 'Éducation islamique', 'Éducation religieuse', 'Autre']
const NIVEAUX = ['Maternelle', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', 'Lycée']

export default function BibliothequePage() {
  const router = useRouter()
  const [modeles, setModeles] = useState<ExerciceModele[]>([])
  const [chargement, setChargement] = useState(true)
  const [showCreer, setShowCreer] = useState(false)
  const [modeleEdite, setModeleEdite] = useState<ExerciceModele | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtreMatiere, setFiltreMatiere] = useState('')

  useEffect(() => {
    chargerModeles()
  }, [])

  async function chargerModeles() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data } = await supabase
      .from('exercices_modeles')
      .select('*')
      .eq('enseignant_id', user.id)
      .order('created_at', { ascending: false })

    setModeles(data || [])
    setChargement(false)
  }

  async function supprimerModele(id: string) {
    if (!confirm('Supprimer cet exercice de la bibliothèque ?')) return
    const supabase = createClient()
    await supabase.from('exercices_modeles').delete().eq('id', id)
    setModeles(modeles.filter(m => m.id !== id))
  }

  const modelesFiltres = modeles.filter(m => {
    const matchRecherche = !recherche ||
      m.titre.toLowerCase().includes(recherche.toLowerCase()) ||
      m.question.toLowerCase().includes(recherche.toLowerCase())
    const matchMatiere = !filtreMatiere || m.matiere === filtreMatiere
    return matchRecherche && matchMatiere
  })

  if (chargement) return <EcranChargement />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft size={20} />
            </Link>
            <BookOpen className="text-indigo-600" size={22} />
            <span className="font-bold text-gray-800">Bibliothèque d&apos;exercices</span>
          </div>
          <button
            onClick={() => { setModeleEdite(null); setShowCreer(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition text-sm"
          >
            <Plus size={16} />
            Nouvel exercice
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Filtres */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher un exercice..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="relative">
            <select
              value={filtreMatiere}
              onChange={e => setFiltreMatiere(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">Toutes les matières</option>
              {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Compteur */}
        <p className="text-sm text-gray-400 mb-4">
          {modelesFiltres.length} exercice{modelesFiltres.length > 1 ? 's' : ''}
        </p>

        {/* Liste */}
        {modelesFiltres.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {modeles.length === 0 ? 'Bibliothèque vide' : 'Aucun résultat'}
            </h2>
            <p className="text-gray-400 mb-6">
              {modeles.length === 0
                ? 'Crée tes premiers exercices modèles à réutiliser en cours.'
                : 'Essaie un autre terme de recherche.'}
            </p>
            {modeles.length === 0 && (
              <button
                onClick={() => { setModeleEdite(null); setShowCreer(true) }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                Créer mon premier exercice
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {modelesFiltres.map(modele => (
              <CarteModele
                key={modele.id}
                modele={modele}
                onEditer={() => { setModeleEdite(modele); setShowCreer(true) }}
                onSupprimer={() => supprimerModele(modele.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal créer/éditer */}
      {showCreer && (
        <ModalExercice
          modele={modeleEdite}
          onClose={() => { setShowCreer(false); setModeleEdite(null) }}
          onSauvegarde={(m) => {
            if (modeleEdite) {
              setModeles(modeles.map(x => x.id === m.id ? m : x))
            } else {
              setModeles([m, ...modeles])
            }
            setShowCreer(false)
            setModeleEdite(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Carte modèle ────────────────────────────────────────────────────────────

function CarteModele({
  modele,
  onEditer,
  onSupprimer,
}: {
  modele: ExerciceModele
  onEditer: () => void
  onSupprimer: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {modele.matiere && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                {modele.matiere}
              </span>
            )}
            {modele.niveau && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {modele.niveau}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              modele.type === 'qcm'
                ? 'bg-purple-50 text-purple-600'
                : 'bg-green-50 text-green-600'
            }`}>
              {modele.type === 'qcm' ? 'QCM' : 'Réponse libre'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{modele.titre}</h3>
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <button
            onClick={onEditer}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onSupprimer}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <p className="text-gray-600 text-sm line-clamp-2">{modele.question}</p>
      {modele.type === 'qcm' && modele.options && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modele.options.map((opt, i) => (
            <span key={i} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-lg">
              {opt}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal créer/éditer ───────────────────────────────────────────────────────

function ModalExercice({
  modele,
  onClose,
  onSauvegarde,
}: {
  modele: ExerciceModele | null
  onClose: () => void
  onSauvegarde: (m: ExerciceModele) => void
}) {
  const [titre, setTitre] = useState(modele?.titre || '')
  const [question, setQuestion] = useState(modele?.question || '')
  const [type, setType] = useState<'reponse_courte' | 'qcm'>(modele?.type || 'reponse_courte')
  const [options, setOptions] = useState<string[]>(modele?.options || ['', '', ''])
  const [matiere, setMatiere] = useState(modele?.matiere || '')
  const [niveau, setNiveau] = useState(modele?.niveau || '')
  const [chargement, setChargement] = useState(false)

  async function handleSauvegarder(e: React.FormEvent) {
    e.preventDefault()
    setChargement(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      enseignant_id: user.id,
      titre,
      question,
      type,
      options: type === 'qcm' ? options.filter(o => o.trim()) : null,
      matiere: matiere || null,
      niveau: niveau || null,
    }

    let data: ExerciceModele | null = null

    if (modele) {
      const { data: updated } = await supabase
        .from('exercices_modeles')
        .update(payload)
        .eq('id', modele.id)
        .select()
        .single()
      data = updated
    } else {
      const { data: created } = await supabase
        .from('exercices_modeles')
        .insert(payload)
        .select()
        .single()
      data = created
    }

    if (data) onSauvegarde(data)
    setChargement(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl p-7 w-full max-w-lg shadow-xl my-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {modele ? 'Modifier l\'exercice' : 'Nouvel exercice modèle'}
        </h2>

        <form onSubmit={handleSauvegarder} className="space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre (pour la bibliothèque) *
            </label>
            <input
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              required
              placeholder="ex : Tables de multiplication — x7"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
            />
          </div>

          {/* Matière + Niveau */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
              <select
                value={matiere}
                onChange={e => setMatiere(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 bg-white"
              >
                <option value="">— Choisir —</option>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={niveau}
                onChange={e => setNiveau(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 bg-white"
              >
                <option value="">— Choisir —</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex gap-2">
              {[
                { id: 'reponse_courte', label: 'Réponse libre' },
                { id: 'qcm', label: 'QCM' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as 'reponse_courte' | 'qcm')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition ${
                    type === t.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              required
              rows={3}
              placeholder="Quelle est la capitale de la France ?"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
            />
          </div>

          {/* Options QCM */}
          {type === 'qcm' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {options.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={e => {
                    const newOpts = [...options]
                    newOpts[i] = e.target.value
                    setOptions(newOpts)
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-900"
                />
              ))}
              <button
                type="button"
                onClick={() => setOptions([...options, ''])}
                className="text-sm text-indigo-600 hover:underline"
              >
                + Ajouter une option
              </button>
            </div>
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
              disabled={chargement || !titre || !question}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {chargement ? 'Enregistrement...' : modele ? 'Enregistrer' : 'Ajouter'}
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
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}
