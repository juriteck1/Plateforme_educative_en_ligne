'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Users, GraduationCap, Play, LogOut,
  TrendingUp, FileText, Calendar, ChevronRight, School, UserCircle, Building2,
  BarChart2, CheckCircle, XCircle, Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Classe, Session } from '@/types'

interface StatGlobale {
  nbEnseignants: number
  nbEleves: number
  nbParents: number
  nbClasses: number
  nbSessionsTotal: number
  nbSessionsActives: number
  nbBulletinsPublies: number
}

interface Etablissement {
  id: string
  nom: string
  adresse: string | null
  code_acces: string
}

interface EnseignantAvecClasses extends Profile {
  classes: { id: string; nom: string; nb_eleves: number }[]
}

interface SessionRecente extends Omit<Session, 'classe'> {
  classe?: { nom: string }
}

interface StatClasse {
  id: string
  nom: string
  nb_eleves: number
  nb_sessions: number
  nb_presences: number
  nb_absences: number
  nb_retards: number
  taux_presence: number
  moyenne_bulletins: number | null
}

export default function AdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null)
  const [stats, setStats] = useState<StatGlobale | null>(null)
  const [enseignants, setEnseignants] = useState<EnseignantAvecClasses[]>([])
  const [sessionsRecentes, setSessionsRecentes] = useState<SessionRecente[]>([])
  const [statsClasses, setStatsClasses] = useState<StatClasse[]>([])
  const [onglet, setOnglet] = useState<'apercu' | 'enseignants' | 'sessions' | 'statistiques'>('apercu')
  const [chargement, setChargement] = useState(true)

  useEffect(() => { chargerDonnees() }, [])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (!prof || (prof.role !== 'admin' && prof.role !== 'superadmin')) {
      router.push('/connexion')
      return
    }
    setProfile(prof)

    if (prof.etablissement_id) {
      const { data: etab } = await supabase
        .from('etablissements')
        .select('*')
        .eq('id', prof.etablissement_id)
        .single()
      setEtablissement(etab)
    }

    const etabId = prof.etablissement_id

    if (!etabId) {
      setStats({ nbEnseignants: 0, nbEleves: 0, nbParents: 0, nbClasses: 0, nbSessionsTotal: 0, nbSessionsActives: 0, nbBulletinsPublies: 0 })
      setChargement(false)
      return
    }

    const { data: classesEtab } = await supabase
      .from('classes')
      .select('id')
      .eq('etablissement_id', etabId)
    const classeIds = (classesEtab || []).map((c: { id: string }) => c.id)

    const [
      { count: nbEnseignants },
      { count: nbEleves },
      { count: nbParents },
      { count: nbClasses },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'enseignant').eq('etablissement_id', etabId),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'eleve').eq('etablissement_id', etabId),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent').eq('etablissement_id', etabId),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('etablissement_id', etabId),
    ])

    let nbSessionsTotal = 0
    let nbSessionsActives = 0
    let nbBulletinsPublies = 0

    if (classeIds.length > 0) {
      const [
        { count: sessTotal },
        { count: sessActives },
        { count: bulletins },
      ] = await Promise.all([
        supabase.from('sessions').select('*', { count: 'exact', head: true }).in('classe_id', classeIds),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).in('classe_id', classeIds).eq('statut', 'en_cours'),
        supabase.from('bulletins').select('*', { count: 'exact', head: true }).in('classe_id', classeIds).eq('statut', 'publie'),
      ])
      nbSessionsTotal = sessTotal || 0
      nbSessionsActives = sessActives || 0
      nbBulletinsPublies = bulletins || 0
    }

    setStats({
      nbEnseignants: nbEnseignants || 0,
      nbEleves: nbEleves || 0,
      nbParents: nbParents || 0,
      nbClasses: nbClasses || 0,
      nbSessionsTotal,
      nbSessionsActives,
      nbBulletinsPublies,
    })

    const { data: profsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'enseignant')
      .eq('etablissement_id', etabId)
      .order('nom')

    const enseignantsAvecClasses = await Promise.all(
      (profsData || []).map(async (p: Profile) => {
        const { data: classesData } = await supabase
          .from('classes').select('id, nom').eq('enseignant_id', p.id)

        const classesAvecEleves = await Promise.all(
          (classesData || []).map(async (c: { id: string; nom: string }) => {
            const { count } = await supabase
              .from('inscriptions').select('*', { count: 'exact', head: true }).eq('classe_id', c.id)
            return { ...c, nb_eleves: count || 0 }
          })
        )
        return { ...p, classes: classesAvecEleves }
      })
    )
    setEnseignants(enseignantsAvecClasses)

    if (classeIds.length > 0) {
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*, classe:classes(nom)')
        .in('classe_id', classeIds)
        .order('created_at', { ascending: false })
        .limit(15)
      setSessionsRecentes(sessionsData || [])
    }

    if (classeIds.length > 0) {
      const { data: classesDetail } = await supabase
        .from('classes')
        .select('id, nom')
        .eq('etablissement_id', etabId)

      const statsParClasse = await Promise.all(
        (classesDetail || []).map(async (c: { id: string; nom: string }) => {
          const { count: nbEleves } = await supabase
            .from('inscriptions').select('*', { count: 'exact', head: true }).eq('classe_id', c.id)

          const { data: sessions } = await supabase
            .from('sessions').select('id').eq('classe_id', c.id)
          const sessionIds = (sessions || []).map((s: { id: string }) => s.id)

          let nbPresences = 0, nbAbsences = 0, nbRetards = 0

          if (sessionIds.length > 0) {
            const [
              { count: pres },
              { count: abs },
              { count: ret },
            ] = await Promise.all([
              supabase.from('presences').select('*', { count: 'exact', head: true }).in('session_id', sessionIds).eq('statut', 'present'),
              supabase.from('presences').select('*', { count: 'exact', head: true }).in('session_id', sessionIds).eq('statut', 'absent'),
              supabase.from('presences').select('*', { count: 'exact', head: true }).in('session_id', sessionIds).eq('statut', 'retard'),
            ])
            nbPresences = pres || 0
            nbAbsences = abs || 0
            nbRetards = ret || 0
          }

          const totalPresences = nbPresences + nbAbsences + nbRetards
          const tauxPresence = totalPresences > 0 ? Math.round((nbPresences / totalPresences) * 100) : 0

          const { data: bulletinsData } = await supabase
            .from('bulletins')
            .select('id')
            .eq('classe_id', c.id)
            .eq('statut', 'publie')

          let moyenneBulletins: number | null = null
          if (bulletinsData && bulletinsData.length > 0) {
            const bulletinIds = bulletinsData.map((b: { id: string }) => b.id)
            const { data: matieres } = await supabase
              .from('bulletin_matieres')
              .select('note_obtenue, note_sur')
              .in('bulletin_id', bulletinIds)

            if (matieres && matieres.length > 0) {
              const notes = matieres
                .filter((m: { note_obtenue: number | null; note_sur: number }) => m.note_obtenue !== null && m.note_sur > 0)
                .map((m: { note_obtenue: number; note_sur: number }) => (m.note_obtenue / m.note_sur) * 20)
              if (notes.length > 0) {
                moyenneBulletins = Math.round((notes.reduce((a: number, b: number) => a + b, 0) / notes.length) * 10) / 10
              }
            }
          }

          return {
            id: c.id,
            nom: c.nom,
            nb_eleves: nbEleves || 0,
            nb_sessions: sessionIds.length,
            nb_presences: nbPresences,
            nb_absences: nbAbsences,
            nb_retards: nbRetards,
            taux_presence: tauxPresence,
            moyenne_bulletins: moyenneBulletins,
          }
        })
      )
      setStatsClasses(statsParClasse)
    }

    setChargement(false)
  }

  async function handleDeconnexion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="text-indigo-600" size={24} />
            <span className="font-bold text-gray-800">L&apos;École du Savoir</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">{profile?.prenom} {profile?.nom}</span>
            <Link href="/profil" className="text-gray-400 hover:text-indigo-600 transition"><UserCircle size={20} /></Link>
            <button onClick={handleDeconnexion} className="text-gray-400 hover:text-gray-600 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Tableau de bord</h1>
          {etablissement ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <Building2 size={16} className="text-indigo-500" />
                <span className="font-semibold text-gray-800">{etablissement.nom}</span>
                {etablissement.adresse && (
                  <span className="text-gray-400 text-sm">— {etablissement.adresse}</span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                <School size={14} className="text-indigo-500" />
                <span className="text-xs font-mono font-bold text-indigo-700 tracking-widest">{etablissement.code_acces}</span>
                <span className="text-xs text-indigo-400">code école</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
              Votre compte n&apos;est pas encore lié à un établissement. Contactez votre super-administrateur.
            </div>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Enseignants', value: stats.nbEnseignants, icon: <School size={20} />, color: 'bg-indigo-500' },
              { label: 'Élèves', value: stats.nbEleves, icon: <GraduationCap size={20} />, color: 'bg-green-500' },
              { label: 'Parents', value: stats.nbParents, icon: <Users size={20} />, color: 'bg-purple-500' },
              { label: 'Classes', value: stats.nbClasses, icon: <BookOpen size={20} />, color: 'bg-blue-500' },
              { label: 'Sessions total', value: stats.nbSessionsTotal, icon: <Calendar size={20} />, color: 'bg-orange-500' },
              { label: 'En direct', value: stats.nbSessionsActives, icon: <Play size={20} />, color: 'bg-red-500' },
              { label: 'Bulletins publiés', value: stats.nbBulletinsPublies, icon: <FileText size={20} />, color: 'bg-teal-500' },
              { label: 'Taux présence', value: (() => { const tot = statsClasses.reduce((s,c)=>s+c.nb_presences+c.nb_absences+c.nb_retards,0); const pres = statsClasses.reduce((s,c)=>s+c.nb_presences,0); return tot > 0 ? `${Math.round((pres/tot)*100)}%` : '—' })(), icon: <TrendingUp size={20} />, color: 'bg-yellow-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {([
            { id: 'apercu', label: 'Aperçu' },
            { id: 'enseignants', label: 'Enseignants' },
            { id: 'sessions', label: 'Sessions' },
            { id: 'statistiques', label: '📊 Statistiques' },
          ] as const).map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                onglet === o.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {onglet === 'apercu' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Enseignants</h2>
                <button onClick={() => setOnglet('enseignants')} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                  Voir tout <ChevronRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {enseignants.slice(0, 5).map(e => (
                  <div key={e.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {e.prenom?.[0]}{e.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-gray-400">{e.email}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
                      {e.classes.length} classe{e.classes.length > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
                {enseignants.length === 0 && (
                  <p className="px-6 py-8 text-gray-400 text-sm text-center">Aucun enseignant dans cet établissement</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Sessions récentes</h2>
                <button onClick={() => setOnglet('sessions')} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                  Voir tout <ChevronRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {sessionsRecentes.slice(0, 6).map(s => (
                  <div key={s.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.titre}</p>
                      <p className="text-xs text-gray-400">{(s.classe as { nom: string } | undefined)?.nom || '—'}</p>
                    </div>
                    <StatutBadge statut={s.statut} />
                  </div>
                ))}
                {sessionsRecentes.length === 0 && (
                  <p className="px-6 py-8 text-gray-400 text-sm text-center">Aucune session</p>
                )}
              </div>
            </div>
          </div>
        )}

        {onglet === 'enseignants' && (
          <div className="space-y-4">
            {enseignants.map(e => (
              <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                      {e.prenom?.[0]}{e.nom?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{e.prenom} {e.nom}</p>
                      <p className="text-sm text-gray-400">{e.email}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{e.classes.length} classe{e.classes.length > 1 ? 's' : ''}</span>
                </div>
                {e.classes.length > 0 && (
                  <div className="px-6 py-3 flex flex-wrap gap-2">
                    {e.classes.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                        {c.nom}
                        <span className="text-xs text-gray-400">{c.nb_eleves} élève{c.nb_eleves > 1 ? 's' : ''}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {enseignants.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400">Aucun enseignant inscrit dans cet établissement</div>
            )}
          </div>
        )}

        {onglet === 'sessions' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Session</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Classe</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessionsRecentes.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900 text-sm">{s.titre}</td>
                    <td className="px-6 py-3 text-gray-500 text-sm">{(s.classe as { nom: string } | undefined)?.nom || '—'}</td>
                    <td className="px-6 py-3"><StatutBadge statut={s.statut} /></td>
                    <td className="px-6 py-3 text-gray-400 text-sm">
                      {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessionsRecentes.length === 0 && (
              <p className="text-center py-12 text-gray-400">Aucune session dans cet établissement</p>
            )}
          </div>
        )}

        {onglet === 'statistiques' && (
          <div className="space-y-6">
            {statsClasses.length > 0 && (() => {
              const totalPres = statsClasses.reduce((s, c) => s + c.nb_presences, 0)
              const totalAbs  = statsClasses.reduce((s, c) => s + c.nb_absences, 0)
              const totalRet  = statsClasses.reduce((s, c) => s + c.nb_retards, 0)
              const total = totalPres + totalAbs + totalRet
              const tauxGlobal = total > 0 ? Math.round((totalPres / total) * 100) : 0

              return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <BarChart2 size={18} className="text-indigo-500" />
                    Présence globale — tous cours confondus
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-4xl font-black text-indigo-600">{tauxGlobal}%</p>
                      <p className="text-xs text-gray-400 mt-1">Taux de présence</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle size={22} />{totalPres}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Présences</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-red-500 flex items-center justify-center gap-1">
                        <XCircle size={22} />{totalAbs}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Absences</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-orange-500 flex items-center justify-center gap-1">
                        <Clock size={22} />{totalRet}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Retards</p>
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="h-4 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 transition-all" style={{ width: `${(totalPres/total)*100}%` }} />
                      <div className="bg-orange-400 transition-all" style={{ width: `${(totalRet/total)*100}%` }} />
                      <div className="bg-red-400 transition-all" style={{ width: `${(totalAbs/total)*100}%` }} />
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Présent</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Retard</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Absent</span>
                  </div>
                </div>
              )
            })()}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Détail par classe</h2>
              </div>
              {statsClasses.length === 0 ? (
                <p className="text-center py-12 text-gray-400">Aucune donnée disponible</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {statsClasses.map(c => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900">{c.nom}</p>
                          <p className="text-xs text-gray-400">
                            {c.nb_eleves} élève{c.nb_eleves > 1 ? 's' : ''} · {c.nb_sessions} session{c.nb_sessions > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className={`text-xl font-black ${c.taux_presence >= 80 ? 'text-green-600' : c.taux_presence >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                              {c.nb_presences + c.nb_absences + c.nb_retards > 0 ? `${c.taux_presence}%` : '—'}
                            </p>
                            <p className="text-xs text-gray-400">présence</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xl font-black ${
                              c.moyenne_bulletins === null ? 'text-gray-300'
                              : c.moyenne_bulletins >= 14 ? 'text-green-600'
                              : c.moyenne_bulletins >= 10 ? 'text-orange-500'
                              : 'text-red-500'
                            }`}>
                              {c.moyenne_bulletins !== null ? `${c.moyenne_bulletins}/20` : '—'}
                            </p>
                            <p className="text-xs text-gray-400">moyenne</p>
                          </div>
                        </div>
                      </div>
                      {(c.nb_presences + c.nb_absences + c.nb_retards) > 0 && (
                        <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
                          <div className="bg-green-500" style={{ width: `${(c.nb_presences/(c.nb_presences+c.nb_absences+c.nb_retards))*100}%` }} />
                          <div className="bg-orange-400" style={{ width: `${(c.nb_retards/(c.nb_presences+c.nb_absences+c.nb_retards))*100}%` }} />
                          <div className="bg-red-400" style={{ width: `${(c.nb_absences/(c.nb_presences+c.nb_absences+c.nb_retards))*100}%` }} />
                        </div>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>✓ {c.nb_presences} présents</span>
                        <span>⏰ {c.nb_retards} retards</span>
                        <span>✗ {c.nb_absences} absents</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {statsClasses.filter(c => c.nb_presences + c.nb_absences + c.nb_retards > 0).length > 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Classement des classes par présence</h2>
                <div className="space-y-3">
                  {[...statsClasses]
                    .filter(c => c.nb_presences + c.nb_absences + c.nb_retards > 0)
                    .sort((a, b) => b.taux_presence - a.taux_presence)
                    .map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${
                          i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-600'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-700 w-32 truncate">{c.nom}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${c.taux_presence >= 80 ? 'bg-green-500' : c.taux_presence >= 60 ? 'bg-orange-400' : 'bg-red-400'}`}
                            style={{ width: `${c.taux_presence}%` }}
                          />
                        </div>
                        <span className={`text-sm font-black w-10 text-right ${c.taux_presence >= 80 ? 'text-green-600' : c.taux_presence >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                          {c.taux_presence}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    en_cours: 'bg-green-100 text-green-700',
    pause: 'bg-yellow-100 text-yellow-700',
    terminee: 'bg-gray-100 text-gray-500',
    en_attente: 'bg-blue-100 text-blue-700',
  }
  const labels: Record<string, string> = {
    en_cours: '🔴 En direct',
    pause: '⏸ Pause',
    terminee: 'Terminée',
    en_attente: 'En attente',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[statut] || 'bg-gray-100 text-gray-500'}`}>
      {labels[statut] || statut}
    </span>
  )
}
