'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft, Send, MessageCircle, Users, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

type MessageInterne = {
  id: string
  classe_id: string
  expediteur_id: string
  destinataire_id: string
  contenu: string
  lu: boolean
  created_at: string
  expediteur?: Profile
}

type Contact = {
  parent: Profile
  classe: { id: string; nom: string }
  dernierMessage: string | null
  nonLus: number
  lastAt: string | null
}

export default function MessageriePage() {
  const router = useRouter()
  const [moi, setMoi] = useState<Profile | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactActif, setContactActif] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<MessageInterne[]>([])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chargerDonnees()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!moi) return
    const supabase = createClient()
    const channel = supabase.channel(`messagerie-enseignant-${moi.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages_internes',
        filter: `destinataire_id=eq.${moi.id}`,
      }, async () => {
        await chargerDonnees()
        if (contactActif) await chargerConversation(moi.id, contactActif.parent.id, contactActif.classe.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [moi, contactActif])

  async function chargerDonnees() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setMoi(profile)

    // Charger les classes de l'enseignant
    const { data: classes } = await supabase
      .from('classes').select('id, nom')
      .eq('enseignant_id', user.id)

    if (!classes?.length) { setChargement(false); return }

    const classeIds = classes.map(c => c.id)

    // Récupérer les élèves inscrits dans ces classes
    const { data: inscriptions } = await supabase
      .from('inscriptions').select('eleve_id, classe_id')
      .in('classe_id', classeIds)

    if (!inscriptions?.length) { setChargement(false); return }

    const eleveIds = [...new Set(inscriptions.map(i => i.eleve_id))]

    // Trouver les parents de ces élèves
    const { data: liens } = await supabase
      .from('parent_eleve').select('parent_id, eleve_id')
      .in('eleve_id', eleveIds)

    if (!liens?.length) { setChargement(false); return }

    const parentIds = [...new Set(liens.map(l => l.parent_id))]

    // Charger les profils parents
    const { data: parents } = await supabase
      .from('profiles').select('*')
      .in('id', parentIds)

    // Charger tous les messages avec ces parents
    const { data: allMessages } = await supabase
      .from('messages_internes')
      .select('*')
      .or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
      .in('classe_id', classeIds)
      .order('created_at', { ascending: false })

    // Construire la liste de contacts
    const contactsMap = new Map<string, Contact>()

    for (const lien of liens) {
      const parent = parents?.find(p => p.id === lien.parent_id)
      if (!parent) continue

      // Trouver la classe de l'élève
      const insc = inscriptions.find(i => i.eleve_id === lien.eleve_id)
      if (!insc) continue
      const classe = classes.find(c => c.id === insc.classe_id)
      if (!classe) continue

      const key = `${parent.id}-${classe.id}`
      if (contactsMap.has(key)) continue

      const conv = (allMessages || []).filter(m =>
        m.classe_id === classe.id &&
        (m.expediteur_id === parent.id || m.destinataire_id === parent.id)
      )

      const nonLus = conv.filter(m => !m.lu && m.destinataire_id === user.id).length
      const dernier = conv[0]

      contactsMap.set(key, {
        parent,
        classe,
        dernierMessage: dernier?.contenu || null,
        nonLus,
        lastAt: dernier?.created_at || null,
      })
    }

    const sorted = Array.from(contactsMap.values()).sort((a, b) => {
      if (!a.lastAt && !b.lastAt) return 0
      if (!a.lastAt) return 1
      if (!b.lastAt) return -1
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    })

    setContacts(sorted)
    setChargement(false)
  }

  async function chargerConversation(moiId: string, parentId: string, classeId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages_internes')
      .select('*, expediteur:profiles!messages_internes_expediteur_id_fkey(*)')
      .eq('classe_id', classeId)
      .or(`and(expediteur_id.eq.${moiId},destinataire_id.eq.${parentId}),and(expediteur_id.eq.${parentId},destinataire_id.eq.${moiId})`)
      .order('created_at', { ascending: true })
    setMessages((data || []) as MessageInterne[])

    // Marquer les messages non lus comme lus
    await supabase.from('messages_internes')
      .update({ lu: true })
      .eq('destinataire_id', moiId)
      .eq('expediteur_id', parentId)
      .eq('classe_id', classeId)
      .eq('lu', false)
  }

  async function ouvrirContact(contact: Contact) {
    setContactActif(contact)
    if (!moi) return
    await chargerConversation(moi.id, contact.parent.id, contact.classe.id)
    setContacts(prev => prev.map(c =>
      c.parent.id === contact.parent.id && c.classe.id === contact.classe.id
        ? { ...c, nonLus: 0 }
        : c
    ))
  }

  async function envoyer() {
    if (!texte.trim() || !moi || !contactActif || envoi) return
    setEnvoi(true)
    const supabase = createClient()
    const { error } = await supabase.from('messages_internes').insert({
      classe_id: contactActif.classe.id,
      expediteur_id: moi.id,
      destinataire_id: contactActif.parent.id,
      contenu: texte.trim(),
    })
    if (!error) {
      setTexte('')
      await chargerConversation(moi.id, contactActif.parent.id, contactActif.classe.id)
      await chargerDonnees()
    }
    setEnvoi(false)
  }

  const contactsFiltres = contacts.filter(c => {
    const nom = `${c.parent.prenom} ${c.parent.nom}`.toLowerCase()
    return nom.includes(recherche.toLowerCase()) || c.classe.nom.toLowerCase().includes(recherche.toLowerCase())
  })

  const totalNonLus = contacts.reduce((s, c) => s + c.nonLus, 0)

  if (chargement) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft size={20} />
          </Link>
          <BookOpen className="text-indigo-600" size={22} />
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-indigo-500" />
            <span className="font-bold text-gray-800">Messagerie parents</span>
            {totalNonLus > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {totalNonLus}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex gap-6 items-start">

        {/* ── Liste contacts ── */}
        <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher un parent…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {contactsFiltres.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {contacts.length === 0
                  ? 'Aucun parent inscrit pour vos classes'
                  : 'Aucun résultat'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {contactsFiltres.map(c => (
                <li key={`${c.parent.id}-${c.classe.id}`}>
                  <button
                    onClick={() => ouvrirContact(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition ${
                      contactActif?.parent.id === c.parent.id && contactActif?.classe.id === c.classe.id
                        ? 'bg-indigo-50 border-r-2 border-indigo-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 font-black text-indigo-700 text-sm">
                        {c.parent.prenom?.[0]}{c.parent.nom?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {c.parent.prenom} {c.parent.nom}
                          </p>
                          {c.nonLus > 0 && (
                            <span className="bg-indigo-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-1">
                              {c.nonLus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-500 font-medium">{c.classe.nom}</p>
                        {c.dernierMessage && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{c.dernierMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Zone conversation ── */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
          {!contactActif ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageCircle size={48} className="text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-400 mb-1">Sélectionne un parent</h3>
              <p className="text-gray-300 text-sm">La conversation s&apos;affichera ici</p>
            </div>
          ) : (
            <>
              {/* Header conversation */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-black text-indigo-700 text-sm">
                  {contactActif.parent.prenom?.[0]}{contactActif.parent.nom?.[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{contactActif.parent.prenom} {contactActif.parent.nom}</p>
                  <p className="text-xs text-indigo-500">Parent · {contactActif.classe.nom}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-sm">
                    Démarrez la conversation avec ce parent
                  </div>
                )}
                {messages.map(m => {
                  const isMe = m.expediteur_id === moi?.id
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        <p>{m.contenu}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              {/* Saisie */}
              <div className="px-4 py-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={texte}
                    onChange={e => setTexte(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                    placeholder={`Message à ${contactActif.parent.prenom}…`}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    onClick={envoyer}
                    disabled={!texte.trim() || envoi}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-40"
                  >
                    {envoi ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
