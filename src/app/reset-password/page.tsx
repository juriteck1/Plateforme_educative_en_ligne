'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setChargement(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: motDePasse })

    if (error) {
      setErreur('Le lien a expiré ou est invalide. Recommence depuis la page de connexion.')
      setChargement(false)
      return
    }

    setSucces(true)
    setTimeout(() => router.push('/connexion'), 2500)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <BookOpen className="text-indigo-600" size={28} />
          <span className="text-xl font-bold text-gray-800">L&apos;École du Savoir</span>
        </div>

        {succes ? (
          <div className="text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe mis à jour !</h1>
            <p className="text-gray-500">Redirection vers la connexion...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Nouveau mot de passe</h1>
            <p className="text-gray-500 text-center mb-8 text-sm">
              Choisis un nouveau mot de passe sécurisé.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={visible ? 'text' : 'password'}
                    value={motDePasse}
                    onChange={e => setMotDePasse(e.target.value)}
                    required
                    minLength={6}
                    placeholder="6 caractères minimum"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-11 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type={visible ? 'text' : 'password'}
                  value={confirmation}
                  onChange={e => setConfirmation(e.target.value)}
                  required
                  placeholder="Répète ton mot de passe"
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
                Enregistrer le nouveau mot de passe
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
