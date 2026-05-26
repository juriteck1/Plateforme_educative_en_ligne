'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, Send, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, BulletinMatiere } from '@/types'

const ANNEE_EN_COURS = '2025-2026'

const MATIERES_DEFAUT = [
  'Français',
  'Mathématiques',
  'Arabe',
  'Éducation islamique',
  'Sciences',
  'Histoire-Géo',
  'Anglais',
  'Arts',
]

const TRIMESTRES_LABELS: Record<number, string> = {
  1: '1er Trimestre',
  2: '2e Trimestre',
  3: '3e Trimestre',
}

interface LigneMatiere {
  id?: string
  matiere: string
  note: string       // string pour le champ input
  appreciation: string
  ordre: number
}

function ligneVide(ordre: number): LigneMatiere {
  return { matiere: '', note: '', appreciation: '', ordre }
}

export default function NouveauBulletinPage() {
  return (
    <Suspense fallback={<EcranChargement />}>
      <NouveauBulletinForm />
    </Suspense>
  )
}

function NouveauBulletinForm() {
  const { id: classeId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const eleveId   = searchParams.get('eleveId') || ''
  const trimestre = Number(searchParams.get('trimestre') || '1') as 1 | 2 | 3
  const bulletinId = searchParams.get('bulletinId') || ''

  const [eleve, setEleve] = useState<Profile | null>(null)
  const [lignes, setLignes] = useState<LigneMatiere[]>([])
  const [appreciationGenerale, setAppreciationGenerale] = useState('')
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [bId, setBId] = useState(bulletinId) // id du bulletin créé/existant

  useEffect(() => {
    chargerDonnees()
  }, [eleveId, bulletinId])

  async function chargerDonnees() {
    const supabase = createClient()

    // Charger le profil de l'élève
    const { data: eleveData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', eleveId)
      .single()
    setEleve(eleveData)

    // Si bulletin existant, charger ses données
    if (bulletinId) {
      const { data: bData } = await supabase
        .from('bulletins')
        .select('*')
        .eq('id', bulletinId)
        .single()
      if (bData) setAppreciationGenerale(bData.appreciation_generale || '')

      const { data: matieresData } = await supabase
        .from('bulletin_matieres')
        .select('*')
        .eq('bulletin_id', bulletinId)
        .order('ordre')

      if (matieresData && matieresData.length > 0) {
        setLignes(matieresData.map((m: BulletinMatiere) => ({
          id: m.id,
          matiere: m.matiere,
          note: m.note !== null ? String(m.note) : '',
          appreciation: m.appreciation || '',
          ordre: m.ordre,
        })))
      } else {
        setLignes(MATIERES_DEFAUT.map((m, i) => ({ matiere: m, note: '', appreciation: '', ordre: i })))
      }
    } else {
      setLignes(MATIERES_DEFAUT.map((m, i) => ({ matiere: m, note: '', appreciation: '', ordre: i })))
    }

    setChargement(false)
  }

  function updateLigne(index: number, field: keyof LigneMatiere, value: string) {
    setLignes(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function ajouterLigne() {
    setLignes(prev => [...prev, ligneVide(prev.length)])
  }

  function supprimerLigne(index: number) {
    setLignes(prev => prev.filter((_, i) => i !== index))
  }

  function noteValide(note: string): boolean {
    if (note === '') return true
    const n = parseFloat(note)
    return !isNaN(n) && n >= 0 && n <= 20
  }

  function moyenne(): string {
    const notées = lignes.filter(l => l.note !== '' && noteValide(l.note))
    if (notées.length === 0) return '—'
    const sum = notées.reduce((acc, l) => acc + parseFloat(l.note), 0)
    return (sum / notées.length).toFixed(2)
  }

  async function sauvegarder(publier = false) {
    setErreur('')
    setSauvegarde(true)

    // Vérifier les notes
    const lignesInvalides = lignes.filter(l => l.note !== '' && !noteValide(l.note))
    if (lignesInvalides.length > 0) {
      setErreur('Certaines notes sont invalides (doit être entre 0 et 20).')
      setSauvegarde(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/connexion'); return }

      let currentBId = bId

      if (!currentBId) {
        // Créer le bulletin
        const { data, error } = await supabase
          .from('bulletins')
          .insert({
            classe_id: classeId,
            eleve_id: eleveId,
            enseignant_id: user.id,
            trimestre,
            annee_scolaire: ANNEE_EN_COURS,
            appreciation_generale: appreciationGenerale || null,
            statut: publier ? 'publie' : 'brouillon',
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        currentBId = data.id
        setBId(data.id)
      } else {
        // Mettre à jour le bulletin
        const { error } = await supabase
          .from('bulletins')
          .update({
            appreciation_generale: appreciationGenerale || null,
            statut: publier ? 'publie' : 'brouillon',
          })
          .eq('id', currentBId)
        if (error) throw new Error(error.message)
      }

      // Supprimer les anciennes matières et réinsérer
      await supabase.from('bulletin_matieres').delete().eq('bulletin_id', currentBId)

      const matieresInsert = lignes
        .filter(l => l.matiere.trim() !== '')
        .map((l, i) => ({
          bulletin_id: currentBId,
          matiere: l.matiere.trim(),
          note: l.note !== '' ? parseFloat(l.note) : null,
          appreciation: l.appreciation.trim() || null,
          ordre: i,
        }))

      if (matieresInsert.length > 0) {
        const { error } = await supabase.from('bulletin_matieres').insert(matieresInsert)
        if (error) throw new Error(error.message)
      }

      if (publier) {
        setSucces('Bulletin publié avec succès !')
        setTimeout(() => router.push(`/bulletin/${currentBId}`), 1200)
      } else {
        setSucces('Brouillon sauvegardé.')
        setTimeout(() => setSucces(''), 3000)
      }
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setSauvegarde(false)
    }
  }

  if (chargement) return <EcranChargement />

  const moy = moyenne()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Retour */}
        <Link
          href={`/dashboard/classe/${classeId}/bulletins`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition mb-6"
        >
          <ArrowLeft size={18} />
          Retour aux bulletins
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Bulletin — {TRIMESTRES_LABELS[trimestre]}
              </h1>
              {eleve && (
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                  <span className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {eleve.prenom[0]}{eleve.nom[0]}
                  </span>
                  {eleve.prenom} {eleve.nom}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-600">{moy}</p>
              <p className="text-xs text-gray-400">Moyenne / 20</p>
            </div>
          </div>
        </div>

        {/* Tableau des notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Notes par matière</h2>
            <button
              onClick={ajouterLigne}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition"
            >
              <Plus size={16} />
              Ajouter une matière
            </button>
          </div>

          {/* En-têtes */}
          <div className="grid grid-cols-[1fr_100px_1fr_40px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Matière</span>
            <span className="text-center">Note / 20</span>
            <span>Appréciation</span>
            <span></span>
          </div>

          <div className="divide-y divide-gray-50">
            {lignes.map((ligne, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_1fr_40px] gap-2 px-4 py-3 items-center">
                {/* Matière */}
                <input
                  type="text"
                  value={ligne.matiere}
                  onChange={e => updateLigne(i, 'matiere', e.target.value)}
                  placeholder="Matière..."
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {/* Note */}
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={ligne.note}
                  onChange={e => updateLigne(i, 'note', e.target.value)}
                  placeholder="—"
                  className={`border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                    ligne.note !== '' && !noteValide(ligne.note)
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200'
                  }`}
                />
                {/* Appréciation */}
                <input
                  type="text"
                  value={ligne.appreciation}
                  onChange={e => updateLigne(i, 'appreciation', e.target.value)}
                  placeholder="Très bien, des progrès à faire..."
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {/* Supprimer */}
                <button
                  onClick={() => supprimerLigne(i)}
                  className="text-gray-300 hover:text-red-400 transition flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Moyenne */}
          <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-700">Moyenne générale</span>
            <span className="text-xl font-bold text-indigo-700">{moy}{moy !== '—' ? ' / 20' : ''}</span>
          </div>
        </div>

        {/* Appréciation générale */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Appréciation générale de l&apos;enseignant
          </label>
          <textarea
            rows={4}
            value={appreciationGenerale}
            onChange={e => setAppreciationGenerale(e.target.value)}
            placeholder="Élève sérieux et appliqué. De bons résultats dans l'ensemble. Continue comme ça..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        {/* Messages */}
        {erreur && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            {erreur}
          </div>
        )}
        {succes && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-600 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            {succes}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {/* Aperçu si bulletin existant */}
          {bId && (
            <Link
              href={`/bulletin/${bId}`}
              target="_blank"
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-3 rounded-xl font-medium hover:border-indigo-300 hover:text-indigo-600 transition"
            >
              <Eye size={18} />
              Aperçu PDF
            </Link>
          )}

          {/* Sauvegarder brouillon */}
          <button
            onClick={() => sauvegarder(false)}
            disabled={sauvegarde}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-3 rounded-xl font-medium hover:border-indigo-300 hover:text-indigo-600 transition disabled:opacity-60"
          >
            {sauvegarde ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Sauvegarder
          </button>

          {/* Publier */}
          <button
            onClick={() => sauvegarder(true)}
            disabled={sauvegarde}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {sauvegarde ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Publier le bulletin
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          Le bulletin publié sera visible par l&apos;élève et exportable en PDF.
        </p>
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
