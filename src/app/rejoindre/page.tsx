'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RejoindreClassePage() {
  const router = useRouter()
  const [codeAcces, setCodeAcces] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  async function handleRejoindre(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const supabase = createClient()

    // Vérifier que l'utilisateur est connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/connexion?redirect=/rejoindre&code=${codeAcces}`)
      return
    }

    // Chercher la classe par code (insensible à la casse)
    const code = codeAcces.toLowerCase().trim()
    const { data: classe, error } = await supabase
      .from('classes')
      .select('id, nom')
      .or(`code_acces.eq.${code},code_acces.eq.${code.toUpperCase()}`)
      .single()

    if (error || !classe) {
      setErreur('Code incorrect. Vérifie le code donné par ton professeur.')
      setChargement(false)
      return
    }

    // Inscrire l'élève
    await supabase.from('inscriptions').upsert({
      classe_id: classe.id,
      eleve_id: user.id,
    })

    router.push('/mes-classes')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md text-center">
        <div className="flex items-center gap-2 justify-center mb-8">
          <BookOpen className="text-indigo-600" size={28} />
          <span className="text-xl font-bold text-gray-800">L&apos;École du Savoir</span>
        </div>

        <div className="text-5xl mb-4">🎓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rejoindre une classe</h1>
        <p className="text-gray-500 mb-8">
          Tape le code que t&apos;a donné ton professeur
        </p>

        <form onSubmit={handleRejoindre} className="space-y-4">
          <input
            type="text"
            value={codeAcces}
            onChange={(e) => setCodeAcces(e.target.value)}
            required
            placeholder="ex : ab12cd34"
            maxLength={8}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest text-gray-900 focus:outline-none focus:border-indigo-400 uppercase"
          />

          {erreur && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={chargement || codeAcces.length < 6}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {chargement && <Loader2 size={20} className="animate-spin" />}
            Entrer dans la classe
          </button>
        </form>
      </div>
    </main>
  )
}
