'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft, Send, MessageCircle, Loader2 } from 'lucide-react'
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
}

type Contact = {
  enseignant: Profile
  classe: { id: string; nom: string }
  dernierMessage: string | null
  nonLus: number
  lastAt: string | null
}

export default function ParentMessageriePage() {
  const router = useRouter()
  const [moi, setMoi] = useState<Profile | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactActif, setContactActif] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<MessageInterne[]>([])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [chargement, setChargement] = useState(true)
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
    const channel = supabase.channel(`messagerie-parent-${moi.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages_internes',
        filter: `destinataire_id=eq.${moi.id}`,
      }, async () => {
        await chargerDonnees()
        if (contactActif) await chargerConversation(moi.id, contactActif.enseignant.id, contactActif.classe.id)
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

    // Trouver l'enfant du parent
    const { data: liens } = await supabase
      .from('parent_eleve').select('eleve_id').eq('parent_id', user.id)

    if (!liens?.length) { setChargement(false); return }

    const eleveIds = liens.map(l => l.eleve_id)

    // Trouver les classes de l'enfant
    const { data: inscriptions } = await supabase
      .from('inscriptions').select('classe_id').in('eleve_id', eleveIds)

    if (!inscriptions?.length) { setChargement(false); return }

    const classeIds = [...new Set(inscriptions.map(i => i.classe_id))]

    // Charger les classes avec leurs enseignants
    const { data: classes } = await supabase
      .from('classes').select('id, nom, enseignant_id')
      .in('id', classeIds)

    if (!classes?.length) { setChargement(false); return }

    const enseignantIds = [...new Set(classes.map(c => c.enseignant_id).filter(Boolean))]

    const { data: enseignants } = await supabase
      .from('profiles').select('*').in('id', enseignantIds)

    // Charger les messages
    const { data: allMessages } = await supabase
      .from('messages_internes')
      .select('*')
      .or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
      .in('classe_id', classeIds)
      .order('created_at', { ascending: false })

    // Construire les contacts
    const contactsList: Contact[] = []
    for (const classe of classes) {
      const enseignant = enseignants?.find(e => e.id === classe.enseignant_id)
      if (!enseignant) continue

      const conv = (allMessages || []).filter(m => m.classe_id === classe.id)
      const nonLus = conv.filter(m => !m.lu && m.destinataire_id === user.id).length
      const dernier = conv[0]

      contactsList.push({
        enseignant,
        classe: { id: classe.id, nom: classe.nom },
        dernierMessage: dernier?.contenu || null,
        nonLus,
        lastAt: dernier?.created_at || null,
      })
    }

    contactsList.sort((a, b) => {
      if (!a.lastAt && !b.lastAt) return 0
      if (!a.lastAt) return 1
      if (!b.lastAt) return -1
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    })

    setContacts(contactsList)
    setChargement(false)
  }

  async function chargerConversation(parentId: string, enseignantId: string, classeId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages_internes')
      .select('*')
      .eq('classe_id', classeId)
      .or(`and(expediteur_id.eq.${parentId},destinataire_id.eq.${enseignantId}),and(expediteur_id.eq.${enseignantId},destinataire_id.eq.${parentId})`)
      .order('created_at', { ascending: true })
    setMessages((data || []) as MessageInterne[])

    // Marquer comme lu
    await supabase.from('messages_internes')
      .update({ lu: true })
      .eq('destinataire_id', parentId)
      .eq('expediteur_id', enseignantId)
      .eq('classe_id', classeId)
      .eq('lu', false)
  }

  async function ouvrirContact(contact: Contact) {
    setContactActif(contact)
    if (!moi) return
    await chargerConversation(moi.id, contact.enseignant.id, contact.classe.id)
    setContacts(prev => prev.map(c =>
      c.enseignant.id === contact.enseignant.id && c.classe.id === contact.classe.id
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
      destinataire_id: contactActif.enseignant.id,
      contenu: texte.trim(),
    })
    if (!error) {
      setTexte('')
      await chargerConversation(moi.id, contactActif.enseignant.id, contactActif.classe.id)
      await chargerDonnees()
    }
    setEnvoi(false)
  }

  const totalNonLus = contacts.reduce((s, c) => s + c.nonLus, 0)

  if (chargement) return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-amber-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-amber-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/espace-parent" className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft size={20} />
          </Link>
          <BookOpen className="text-amber-500" size={22} />
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-amber-500" />
            <span className="font-bold text-gray-800">Messages avec les professeurs</span>
            {totalNonLus > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {totalNonLus}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex gap-5 items-start">

        {/* ── Liste professeurs ── */}
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-50 bg-amber-50">
            <p className="text-xs font-black text-amber-700 uppercase tracking-wide">Professeurs</p>
          </div>

          {contacts.length === 0 ? (
            <div className="py-12 text-center px-4">
              <MessageCircle size={28} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucune classe trouvée</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {contacts.map(c => (
                <li key={`${c.enseignant.id}-${c.classe.id}`}>
                  <button
                    onClick={() => ouvrirContact(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-amber-50 transition ${
                      contactActif?.enseignant.id === c.enseignant.id && contactActif?.classe.id === c.classe.id
                        ? 'bg-amber-50 border-r-2 border-amber-400'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 font-black text-amber-700 text-sm">
                        {c.enseignant.prenom?.[0]}{c.enseignant.nom?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {c.enseignant.prenom} {c.enseignant.nom}
                          </p>
                          {c.nonLus > 0 && (
                            <span className="bg-red-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-1">
                              {c.nonLus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-600 font-medium">📚 {c.classe.nom}</p>
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
        <div className="flex-1 bg-white rounded-2xl border border-amber-100 shadow-sm flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
          {!contactActif ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-gray-500 mb-1">Choisissez un professeur</h3>
              <p className="text-gray-300 text-sm">Envoyez un message directement à l&apos;enseignant de votre enfant</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-amber-50 flex items-center gap-3 bg-amber-50">
                <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center font-black text-amber-800 text-sm">
                  {contactActif.enseignant.prenom?.[0]}{contactActif.enseignant.nom?.[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {contactActif.enseignant.prenom} {contactActif.enseignant.nom}
                  </p>
                  <p className="text-xs text-amber-600">Professeur · {contactActif.classe.nom}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-gray-300 text-sm">
                    Écrivez votre premier message
                  </div>
                )}
                {messages.map(m => {
                  const isMe = m.expediteur_id === moi?.id
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-amber-500 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        <p>{m.contenu}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-amber-100' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              {/* Saisie */}
              <div className="px-4 py-4 border-t border-amber-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={texte}
                    onChange={e => setTexte(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                    placeholder={`Message à ${contactActif.enseignant.prenom}…`}
                    className="flex-1 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={envoyer}
                    disabled={!texte.trim() || envoi}
                    className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center hover:bg-amber-600 transition disabled:opacity-40"
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
