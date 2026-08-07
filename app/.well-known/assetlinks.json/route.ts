const packageName = 'com.boltshare.rcinc'
const fingerprintPattern = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/
const releaseUploadFingerprint = '83:11:CD:23:3F:69:DF:74:89:46:98:B9:61:29:98:9D:C6:54:F2:18:55:32:F4:94:5E:06:72:31:B1:59:A3:F4'

export const dynamic = 'force-dynamic'

export function GET() {
  const environmentFingerprints = (process.env.ANDROID_APP_SHA256_FINGERPRINTS ?? '')
    .split(',')
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter((fingerprint) => fingerprintPattern.test(fingerprint))
  const fingerprints = [...new Set([releaseUploadFingerprint, ...environmentFingerprints])]

  const association = [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      }]

  return Response.json(association, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  })
}
