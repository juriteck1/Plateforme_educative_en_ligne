'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  titre: string
  message: string | null
  session_id: string | null
  classe_id: string | null
  lu: boolean
  created_at: string
}

export default function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const nonLues = notifications.filter(n => !n.lu).length

  useEffect(() => {
    chargerNotifications()
    const supabase = createClient()

    // Realtime : nouvelles notifications en temps réel
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 30))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Fermer le dropdown en cliquant dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function chargerNotifications() {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
  }

  async function marquerLue(notif: Notification) {
    const supabase = createClient()
    await supabase.from('notifications').update({ lu: true }).eq('id', notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, lu: true } : n))

    // Naviguer vers la session si disponible
    if (notif.session_id) {
      setOuvert(false)
      router.push(`/session/${notif.session_id}/eleve`)
    }
  }

  async function toutMarquerLu() {
    const supabase = createClient()
    const ids = notifications.filter(n => !n.lu).map(n => n.id)
    if (ids.length === 0) return
    await supabase.from('notifications').update({ lu: true }).in('id', ids)
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
  }

  function tempsRelatif(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return "À l'instant"
    if (min < 60) return `Il y a ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `Il y a ${h}h`
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bouton cloche */}
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
      >
        <Bell size={20} />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {ouvert && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
            {nonLues > 0 && (
              <button
                onClick={toutMarquerLu}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <CheckCheck size={14} />
                Tout lire
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => marquerLue(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3 ${
                    !notif.lu ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  {/* Icône */}
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${
                    notif.type === 'session_demarree'
                      ? 'bg-green-100'
                      : 'bg-indigo-100'
                  }`}>
                    {notif.type === 'session_demarree'
                      ? <Play size={16} className="text-green-600" fill="currentColor" />
                      : <Bell size={16} className="text-indigo-600" />
                    }
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.lu ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notif.titre}
                    </p>
                    {notif.message && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{tempsRelatif(notif.created_at)}</p>
                  </div>

                  {/* Point non-lu */}
                  {!notif.lu ? (
                    <span className="shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                  ) : (
                    <Check size={14} className="shrink-0 text-gray-300 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
