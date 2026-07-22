const packageName = 'app.rcinc.boltshare'
const fingerprintPattern = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/

export const dynamic = 'force-dynamic'

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256_FINGERPRINTS ?? '')
    .split(',')
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter((fingerprint) => fingerprintPattern.test(fingerprint))

  const association = fingerprints.length > 0
    ? [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      }]
    : []

  return Response.json(association, {
    headers: {
      'Cache-Control': fingerprints.length > 0 ? 'public, max-age=300' : 'no-store',
    },
  })
}
