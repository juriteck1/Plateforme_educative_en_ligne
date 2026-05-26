import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // 1. Vérifier que l'appelant est bien superadmin (via sa session)
  const cookieStore = await cookies()
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // 2. Créer l'utilisateur avec la clé service (bypasse RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { prenom, nom, email, password, etablissement_id } = await request.json()

  if (!prenom || !nom || !email || !password || !etablissement_id) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  // Créer le compte Auth
  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom, role: 'admin' },
  })

  if (authError || !newUser.user) {
    return NextResponse.json(
      { error: authError?.message || 'Erreur création compte' },
      { status: 400 }
    )
  }

  // Créer le profil (service role bypasse RLS)
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: newUser.user.id,
    email,
    prenom,
    nom,
    role: 'admin',
    etablissement_id,
  }, { onConflict: 'id' })

  if (profileError) {
    // Rollback : supprimer le compte auth si le profil échoue
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
