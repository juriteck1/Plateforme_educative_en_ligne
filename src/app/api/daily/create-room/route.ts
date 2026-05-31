import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { sessionTitre } = await request.json()

    // Générer un nom de salle unique basé sur le titre + timestamp
    const slug = (sessionTitre || 'cours')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // retirer accents
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)

    const roomName = `ecole-${slug}-${Date.now()}`
    const url = `https://meet.jit.si/${roomName}`

    return NextResponse.json({ url, name: roomName })
  } catch (error) {
    console.error('Erreur create-room:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
