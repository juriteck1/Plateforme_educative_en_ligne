import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Routes protégées (authentification requise)
  const protectedRoutes = [
    '/dashboard',
    '/classe',
    '/mes-classes',
    '/espace-parent',
    '/bulletin',
    '/admin',
    '/superadmin',
    '/profil',
  ]

  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    return NextResponse.redirect(url)
  }

  // Redirection selon le rôle si connecté mais mauvaise route
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Un parent ne peut pas accéder aux espaces enseignant ou élève
    if (
      role === 'parent' &&
      (request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/mes-classes'))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/espace-parent'
      return NextResponse.redirect(url)
    }

    // Un élève ne peut pas accéder au dashboard enseignant
    if (role === 'eleve' && request.nextUrl.pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/mes-classes'
      return NextResponse.redirect(url)
    }

    // Un AESH accède au même dashboard que les enseignants
    // (aucune restriction supplémentaire nécessaire)

    // Seul le superadmin peut accéder à /superadmin
    if (role !== 'superadmin' && request.nextUrl.pathname.startsWith('/superadmin')) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin' : role === 'enseignant' ? '/dashboard' : role === 'parent' ? '/espace-parent' : '/mes-classes'
      return NextResponse.redirect(url)
    }

    // Un admin peut accéder à /admin seulement
    if (!['admin', 'superadmin'].includes(role) && request.nextUrl.pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'enseignant' ? '/dashboard' : role === 'parent' ? '/espace-parent' : '/mes-classes'
      return NextResponse.redirect(url)
    }

    // Un enseignant n'a pas accès à l'espace parent
    if (role === 'enseignant' && request.nextUrl.pathname.startsWith('/espace-parent')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
