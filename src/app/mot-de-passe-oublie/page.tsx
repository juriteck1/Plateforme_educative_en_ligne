'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [chargement, setChargement] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setErreur('Une erreur est survenue. Vérifie ton adresse email.')
      setChargement(false)
      return
    }

    setEnvoye(true)
    setChargement(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <BookOpen className="text-indigo-600" size={28} />
          <span className="text-xl font-bold text-gray-800">L&apos;École du Savoir</span>
        </div>

        {envoye ? (
          <div className="text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé !</h1>
            <p className="text-gray-500 mb-6">
              Consulte ta boîte mail — un lien de réinitialisation t&apos;a été envoyé à <strong>{email}</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Vérifie aussi tes spams si tu ne vois rien dans les 2 minutes.
            </p>
            <Link href="/connexion" className="text-indigo-600 font-medium hover:underline text-sm">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Mot de passe oublié</h1>
            <p className="text-gray-500 text-center mb-8 text-sm">
              Entre ton adresse email et on t&apos;envoie un lien pour réinitialiser ton mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ton@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {erreur && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>
              )}

              <button
                type="submit"
                disabled={chargement}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {chargement && <Loader2 size={18} className="animate-spin" />}
                Envoyer le lien
              </button>
            </form>

            <p className="text-center text-gray-500 mt-6 text-sm">
              <Link href="/connexion" className="text-indigo-600 font-medium hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
