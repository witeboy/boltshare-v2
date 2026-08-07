const bundleId = 'com.boltshare.rcinc'
const defaultTeamId = '7F6X98KNQ6'
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
  const configuredTeamId = (process.env.APPLE_TEAM_ID ?? defaultTeamId).trim().toUpperCase()
  const teamId = /^[A-Z0-9]{10}$/.test(configuredTeamId) ? configuredTeamId : defaultTeamId

  return Response.json({
    applinks: {
      apps: [],
      details: [{ appID: `${teamId}.${bundleId}`, paths: associatedPaths }],
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/json',
    },
  })
}
