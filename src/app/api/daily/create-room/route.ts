import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.DAILY_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Daily API key non configurée' }, { status: 500 })
  }

  try {
    const { sessionTitre } = await request.json()

    // Expiration dans 4 heures
    const exp = Math.floor(Date.now() / 1000) + 4 * 60 * 60

    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        properties: {
          exp,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          lang: 'fr',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Daily.co error:', err)
      return NextResponse.json({ error: 'Erreur Daily.co', details: err }, { status: 500 })
    }

    const room = await res.json()

    return NextResponse.json({
      url: room.url,
      name: room.name,
    })
  } catch (error) {
    console.error('Erreur create-room:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
