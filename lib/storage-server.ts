import type { createAdminClient } from '@/lib/supabase/server'
import { TRANSFER_BUCKET } from '@/lib/config'

type AdminClient = ReturnType<typeof createAdminClient>

export type StoredFile = {
  bunny_path?: string | null
  file_url?: string | null
  storage_path?: string | null
  storage_provider?: string | null
}

function httpsHost(value: string) {
  const url = new URL(value.includes('://') ? value : `https://${value}`)
  if (url.protocol !== 'https:') throw new Error('Storage host must use HTTPS')
  return url.host
}

function providerFor(file: StoredFile) {
  return file.storage_provider || (file.bunny_path ? 'bunny' : 'supabase')
}

export async function deleteStoredFile(admin: AdminClient, file: StoredFile) {
  if (providerFor(file) === 'supabase') {
    if (!file.storage_path) throw new Error('Supabase storage path is missing')
    const { error } = await admin.storage.from(TRANSFER_BUCKET).remove([file.storage_path])
    if (error) throw error
    return
  }

  const storageZone = process.env.BUNNY_STORAGE_ZONE
  const storageHost = process.env.BUNNY_STORAGE_HOST
  const storagePassword = process.env.BUNNY_STORAGE_PASSWORD
  if (!storageZone || !storageHost || !storagePassword) {
    throw new Error('Bunny storage is not configured')
  }

  let bunnyPath = file.bunny_path
  if (!bunnyPath && file.file_url) {
    const legacyUrl = new URL(file.file_url)
    const allowedCdn = process.env.BUNNY_CDN_HOSTNAME
    if (legacyUrl.protocol !== 'https:' || (allowedCdn && legacyUrl.host !== httpsHost(allowedCdn))) {
      throw new Error('Stored Bunny file URL is invalid')
    }
    bunnyPath = legacyUrl.pathname
  }
  if (!bunnyPath) return

  const deleteUrl = `https://${httpsHost(storageHost)}/${encodeURIComponent(storageZone)}${bunnyPath}`
  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { AccessKey: storagePassword },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Bunny delete failed with ${response.status}`)
  }
}

export async function createDirectDownloadUrl(
  admin: AdminClient,
  file: StoredFile,
  downloadName: string,
) {
  if (providerFor(file) === 'supabase') {
    if (!file.storage_path) throw new Error('Supabase storage path is missing')
    const { data, error } = await admin.storage
      .from(TRANSFER_BUCKET)
      .createSignedUrl(file.storage_path, 60, { download: downloadName })
    if (error || !data?.signedUrl) throw error || new Error('Signed download URL was not created')
    return data.signedUrl
  }

  const allowedCdn = process.env.BUNNY_CDN_HOSTNAME
  if (!allowedCdn || !file.file_url) throw new Error('Bunny CDN is not configured')

  const fileUrl = new URL(file.file_url)
  if (fileUrl.protocol !== 'https:' || fileUrl.host !== httpsHost(allowedCdn)) {
    throw new Error('Stored Bunny file URL is invalid')
  }

  return fileUrl.toString()
}
