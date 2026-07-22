const bundleId = 'app.rcinc.boltshare'
const associatedPaths = [
  '/receive/*',
  '/receive-code',
  '/dashboard',
  '/history',
  '/upload',
  '/team',
  '/settings',
]

export const dynamic = 'force-dynamic'

export function GET() {
  const teamId = (process.env.APPLE_TEAM_ID ?? '').trim().toUpperCase()
  const validTeamId = /^[A-Z0-9]{10}$/.test(teamId)

  return Response.json({
    applinks: {
      apps: [],
      details: validTeamId
        ? [{ appID: `${teamId}.${bundleId}`, paths: associatedPaths }]
        : [],
    },
  }, {
    headers: {
      'Cache-Control': validTeamId ? 'public, max-age=300' : 'no-store',
    },
  })
}
