'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer, Download, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Bulletin, BulletinMatiere, Profile, Classe } from '@/types'

const TRIMESTRES_LABELS: Record<number, string> = {
  1: '1er Trimestre',
  2: '2ème Trimestre',
  3: '3ème Trimestre',
}

function noteMention(note: number | null): { texte: string; couleur: string } {
  if (note === null) return { texte: '—', couleur: 'text-gray-400' }
  if (note >= 16)  return { texte: 'Très bien',    couleur: 'text-emerald-700' }
  if (note >= 14)  return { texte: 'Bien',          couleur: 'text-blue-700' }
  if (note >= 12)  return { texte: 'Assez bien',    couleur: 'text-indigo-700' }
  if (note >= 10)  return { texte: 'Passable',      couleur: 'text-amber-700' }
  return              { texte: 'Insuffisant',    couleur: 'text-red-700' }
}

export default function BulletinPage() {
  const { id: bulletinId } = useParams<{ id: string }>()
  const [bulletin, setBulletin] = useState<Bulletin | null>(null)
  const [matieres, setMatieres] = useState<BulletinMatiere[]>([])
  const [eleve, setEleve] = useState<Profile | null>(null)
  const [enseignant, setEnseignant] = useState<Profile | null>(null)
  const [classe, setClasse] = useState<Classe | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    chargerBulletin()
  }, [bulletinId])

  async function chargerBulletin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: bData, error } = await supabase
      .from('bulletins')
      .select('*')
      .eq('id', bulletinId)
      .single()

    if (error || !bData) {
      setErreur('Bulletin introuvable ou accès refusé.')
      setChargement(false)
      return
    }

    setBulletin(bData)

    const [{ data: matieresData }, { data: eleveData }, { data: enseignantData }, { data: classeData }] = await Promise.all([
      supabase.from('bulletin_matieres').select('*').eq('bulletin_id', bulletinId).order('ordre'),
      supabase.from('profiles').select('*').eq('id', bData.eleve_id).single(),
      supabase.from('profiles').select('*').eq('id', bData.enseignant_id).single(),
      supabase.from('classes').select('*').eq('id', bData.classe_id).single(),
    ])

    setMatieres(matieresData || [])
    setEleve(eleveData)
    setEnseignant(enseignantData)
    setClasse(classeData)
    setChargement(false)
  }

  function moyenne(): number | null {
    const notées = matieres.filter(m => m.note !== null)
    if (notées.length === 0) return null
    return notées.reduce((acc, m) => acc + m.note!, 0) / notées.length
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (erreur || !bulletin || !eleve) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">{erreur || 'Bulletin introuvable.'}</p>
          <button onClick={() => history.back()} className="text-indigo-600 hover:underline flex items-center gap-1 mx-auto">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </div>
    )
  }

  const moy = moyenne()
  const moyMention = noteMention(moy)
  const dateGeneration = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Barre d'actions (masquée à l'impression) */}
      <div className="no-print bg-indigo-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => history.back()}
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white transition text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <span className="text-indigo-400">·</span>
          <span className="text-sm font-medium">
            Bulletin — {eleve.prenom} {eleve.nom} — {TRIMESTRES_LABELS[bulletin.trimestre]}
          </span>
          {bulletin.statut === 'brouillon' && (
            <span className="text-xs bg-amber-400 text-amber-900 font-bold px-2 py-0.5 rounded-full">BROUILLON</span>
          )}
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white text-indigo-700 font-semibold px-5 py-2 rounded-lg hover:bg-indigo-50 transition text-sm"
        >
          <Printer size={16} />
          Imprimer / Télécharger PDF
        </button>
      </div>

      {/* Contenu du bulletin */}
      <div className="min-h-screen bg-gray-100 py-8 px-4 no-print-bg">
        <div className="bulletin-page mx-auto bg-white shadow-xl">

          {/* ─── EN-TÊTE ──────────────────────────────────────────────── */}
          <header className="bulletin-header">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h1 className="text-2xl font-black text-indigo-900 tracking-tight">
                  📚 L&apos;École du Savoir
                </h1>
                <p className="text-sm text-indigo-400 font-medium mt-0.5">ecole-du-savoir.vercel.app</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Généré le {dateGeneration}</p>
                {bulletin.statut === 'brouillon' && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded mt-1 inline-block">
                    BROUILLON — NON OFFICIEL
                  </span>
                )}
              </div>
            </div>

            <div className="header-divider" />

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Bulletin de notes</p>
                <h2 className="text-xl font-black text-gray-900">
                  {TRIMESTRES_LABELS[bulletin.trimestre]}
                </h2>
                <p className="text-sm text-gray-500">Année scolaire {bulletin.annee_scolaire}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Classe</p>
                <p className="text-base font-bold text-gray-800">{classe?.nom || '—'}</p>
                <p className="text-sm text-gray-400">Enseignant : {enseignant?.prenom} {enseignant?.nom}</p>
              </div>
            </div>
          </header>

          {/* ─── IDENTITÉ ÉLÈVE ───────────────────────────────────────── */}
          <section className="eleve-section">
            <div className="eleve-card">
              <div className="eleve-avatar">
                {eleve.prenom[0]}{eleve.nom[0]}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Élève</p>
                <p className="text-xl font-black text-gray-900">{eleve.prenom} {eleve.nom}</p>
                <p className="text-sm text-gray-400">{eleve.email}</p>
              </div>
            </div>
            {moy !== null && (
              <div className="moyenne-globale">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Moyenne générale</p>
                <p className="text-4xl font-black text-indigo-700">{moy.toFixed(2)}<span className="text-lg font-semibold text-gray-400">/20</span></p>
                <p className={`text-sm font-bold mt-1 ${moyMention.couleur}`}>{moyMention.texte}</p>
              </div>
            )}
          </section>

          {/* ─── TABLEAU DES NOTES ────────────────────────────────────── */}
          <section className="notes-section">
            <h3 className="section-title">Résultats par matière</h3>

            <table className="notes-table">
              <thead>
                <tr>
                  <th className="th-matiere">Matière</th>
                  <th className="th-note">Note</th>
                  <th className="th-mention">Mention</th>
                  <th className="th-appreciation">Appréciation de l&apos;enseignant</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m, i) => {
                  const mention = noteMention(m.note)
                  return (
                    <tr key={m.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="td-matiere">{m.matiere}</td>
                      <td className="td-note">
                        {m.note !== null
                          ? <><span className="note-value">{m.note.toFixed(1)}</span><span className="note-max">/20</span></>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className={`td-mention ${mention.couleur}`}>
                        {mention.texte}
                      </td>
                      <td className="td-appreciation">{m.appreciation || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
              {moy !== null && (
                <tfoot>
                  <tr className="row-moyenne">
                    <td className="td-matiere-total">Moyenne générale</td>
                    <td className="td-note-total">
                      <span className="note-value">{moy.toFixed(2)}</span>
                      <span className="note-max">/20</span>
                    </td>
                    <td className={`td-mention-total ${moyMention.couleur}`}>{moyMention.texte}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </section>

          {/* ─── APPRÉCIATION GÉNÉRALE ────────────────────────────────── */}
          {bulletin.appreciation_generale && (
            <section className="appreciation-section">
              <h3 className="section-title">Appréciation générale</h3>
              <div className="appreciation-box">
                <p className="appreciation-text">{bulletin.appreciation_generale}</p>
                <div className="signature-area">
                  <div className="signature-line">
                    <p className="text-xs text-gray-400">Signature de l&apos;enseignant</p>
                    <div className="sign-space" />
                    <p className="text-xs font-medium text-gray-600">{enseignant?.prenom} {enseignant?.nom}</p>
                  </div>
                  <div className="signature-line">
                    <p className="text-xs text-gray-400">Signature des parents</p>
                    <div className="sign-space" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── PIED DE PAGE ─────────────────────────────────────────── */}
          <footer className="bulletin-footer">
            <p>L&apos;École du Savoir · {classe?.nom} · {bulletin.annee_scolaire} · {TRIMESTRES_LABELS[bulletin.trimestre]}</p>
            <p>Document généré le {dateGeneration}</p>
          </footer>
        </div>
      </div>

      {/* ─── STYLES ─────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

        body { font-family: 'Inter', sans-serif; margin: 0; background: #f1f5f9; }

        .bulletin-page {
          width: 210mm;
          min-height: 297mm;
          padding: 14mm 16mm;
          box-sizing: border-box;
        }

        /* ── Header ── */
        .bulletin-header { margin-bottom: 20px; }
        .header-divider {
          height: 3px;
          background: linear-gradient(90deg, #4f46e5, #818cf8, transparent);
          margin: 10px 0;
          border-radius: 2px;
        }

        /* ── Eleve ── */
        .eleve-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%);
          border: 1.5px solid #c7d2fe;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 22px;
        }
        .eleve-card { display: flex; align-items: center; gap: 14px; }
        .eleve-avatar {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 18px;
        }
        .moyenne-globale { text-align: right; }

        /* ── Notes table ── */
        .notes-section { margin-bottom: 22px; }
        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #6366f1;
          margin-bottom: 8px;
        }
        .notes-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .th-matiere { width: 22%; text-align: left; padding: 9px 10px; background: #1e3a5f; color: white; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 0 0 0; }
        .th-note { width: 10%; text-align: center; padding: 9px 8px; background: #1e3a5f; color: white; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .th-mention { width: 14%; text-align: center; padding: 9px 8px; background: #1e3a5f; color: white; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .th-appreciation { width: 54%; text-align: left; padding: 9px 10px; background: #1e3a5f; color: white; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0 6px 0 0; }

        .row-even { background: #f8fafc; }
        .row-odd  { background: white; }

        .td-matiere { padding: 8px 10px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
        .td-note { padding: 8px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
        .td-mention { padding: 8px 8px; text-align: center; font-weight: 600; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; }
        .td-appreciation { padding: 8px 10px; color: #475569; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; font-style: italic; }

        .note-value { font-weight: 800; font-size: 14px; color: #1e3a5f; }
        .note-max { font-size: 10px; color: #94a3b8; margin-left: 2px; }

        .row-moyenne td { background: #eef2ff; font-weight: 700; border-top: 2px solid #6366f1; }
        .td-matiere-total { padding: 10px 10px; color: #1e3a5f; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .td-note-total { padding: 10px 8px; text-align: center; }
        .td-mention-total { padding: 10px 8px; text-align: center; font-weight: 700; font-size: 12px; }

        /* ── Appréciation ── */
        .appreciation-section { margin-bottom: 20px; }
        .appreciation-box {
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px 16px;
          background: #fafafa;
        }
        .appreciation-text {
          font-size: 13px;
          color: #374151;
          line-height: 1.7;
          margin-bottom: 18px;
          font-style: italic;
        }
        .signature-area { display: flex; gap: 30px; }
        .signature-line { flex: 1; }
        .sign-space {
          height: 42px;
          border-bottom: 1px dashed #cbd5e1;
          margin: 8px 0 6px;
        }

        /* ── Footer ── */
        .bulletin-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9.5px;
          color: #94a3b8;
          margin-top: 20px;
        }

        /* ── Print ── */
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .no-print-bg { background: white !important; padding: 0 !important; }
          .bulletin-page {
            width: 100%;
            min-height: auto;
            box-shadow: none;
            padding: 10mm 14mm;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }

        @media screen {
          .no-print-bg { min-height: 100vh; }
        }
      `}</style>
    </>
  )
}
