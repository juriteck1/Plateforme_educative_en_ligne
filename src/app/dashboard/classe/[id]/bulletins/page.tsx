'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, Eye, Pencil, BookOpen, GraduationCap, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Bulletin, Profile, Classe } from '@/types'

const ANNEE_EN_COURS = '2025-2026'
const TRIMESTRES = [
  { num: 1 as const, label: '1er Trimestre', periode: 'Sept. — Déc.' },
  { num: 2 as const, label: '2e Trimestre',  periode: 'Janv. — Mars' },
  { num: 3 as const, label: '3e Trimestre',  periode: 'Avr. — Juin' },
]

export default function BulletinsClassePage() {
  const { id: classeId } = useParams<{ id: string }>()
  const router = useRouter()
  const [classe, setClasse] = useState<Classe | null>(null)
  const [eleves, setEleves] = useState<Profile[]>([])
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [chargement, setChargement] = useState(true)
  const [trimestreActif, setTrimestreActif] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    chargerDonnees()
  }, [classeId])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const [{ data: classeData }, { data: elevesData }, { data: bulletinsData }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', classeId).single(),
      supabase.from('inscriptions').select('eleve:profiles(*)').eq('classe_id', classeId),
      supabase.from('bulletins').select('*').eq('classe_id', classeId).eq('annee_scolaire', ANNEE_EN_COURS),
    ])

    setClasse(classeData)
    setEleves((elevesData || []).map((i: { eleve: unknown }) => i.eleve as Profile))
    setBulletins(bulletinsData || [])
    setChargement(false)
  }

  function getBulletin(eleveId: string, trimestre: 1 | 2 | 3) {
    return bulletins.find(b => b.eleve_id === eleveId && b.trimestre === trimestre)
  }

  const trimestreInfo = TRIMESTRES.find(t => t.num === trimestreActif)!
  const bulletinsTrimestre = bulletins.filter(b => b.trimestre === trimestreActif)
  const publiés = bulletinsTrimestre.filter(b => b.statut === 'publie').length

  if (chargement) return <EcranChargement />

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Retour */}
        <Link
          href={`/dashboard/classe/${classeId}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition mb-6"
        >
          <ArrowLeft size={18} />
          Retour à la classe
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <GraduationCap size={24} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bulletins de notes</h1>
                <p className="text-gray-500 text-sm">{classe?.nom} · Année {ANNEE_EN_COURS}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{eleves.length}</p>
              <p className="text-xs text-gray-400">élève{eleves.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Sélecteur trimestre */}
        <div className="flex gap-3 mb-6">
          {TRIMESTRES.map(t => (
            <button
              key={t.num}
              onClick={() => setTrimestreActif(t.num)}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-center transition ${
                trimestreActif === t.num
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className={`font-bold text-sm ${trimestreActif === t.num ? 'text-indigo-700' : 'text-gray-700'}`}>{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.periode}</p>
              {bulletins.filter(b => b.trimestre === t.num).length > 0 && (
                <p className="text-xs font-medium text-indigo-500 mt-1">
                  {bulletins.filter(b => b.trimestre === t.num).length} / {eleves.length} créé{bulletins.filter(b => b.trimestre === t.num).length > 1 ? 's' : ''}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Stats rapides */}
        {eleves.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{bulletinsTrimestre.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Bulletin{bulletinsTrimestre.length !== 1 ? 's' : ''} créé{bulletinsTrimestre.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{publiés}</p>
              <p className="text-xs text-gray-400 mt-0.5">Publié{publiés !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{eleves.length - bulletinsTrimestre.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">En attente</p>
            </div>
          </div>
        )}

        {/* Liste des élèves */}
        {eleves.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucun élève inscrit dans cette classe.</p>
            <p className="text-gray-400 text-sm mt-1">Les élèves doivent rejoindre la classe avant que vous puissiez créer leurs bulletins.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                {trimestreInfo.label} — {trimestreInfo.periode}
              </h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {eleves.map(eleve => {
                const bulletin = getBulletin(eleve.id, trimestreActif)
                return (
                  <li key={eleve.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
                    {/* Élève */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {eleve.prenom[0]}{eleve.nom[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{eleve.prenom} {eleve.nom}</p>
                        <p className="text-xs text-gray-400">{eleve.email}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {bulletin ? (
                        <>
                          {/* Badge statut */}
                          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                            bulletin.statut === 'publie'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {bulletin.statut === 'publie'
                              ? <><CheckCircle size={12} /> Publié</>
                              : <><Clock size={12} /> Brouillon</>
                            }
                          </span>
                          {/* Voir */}
                          <Link
                            href={`/bulletin/${bulletin.id}`}
                            target="_blank"
                            className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition"
                          >
                            <Eye size={14} />
                            Voir
                          </Link>
                          {/* Modifier */}
                          <Link
                            href={`/dashboard/classe/${classeId}/bulletins/nouveau?eleveId=${eleve.id}&trimestre=${trimestreActif}&bulletinId=${bulletin.id}`}
                            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                          >
                            <Pencil size={14} />
                            Modifier
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/dashboard/classe/${classeId}/bulletins/nouveau?eleveId=${eleve.id}&trimestre=${trimestreActif}`}
                          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                        >
                          <Plus size={14} />
                          Créer le bulletin
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
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
