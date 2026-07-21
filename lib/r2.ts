import 'server-only'

import {
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const MIB = 1024 * 1024
const GIB = 1024 * MIB
const TIB = 1024 * GIB

export const R2_MAX_OBJECT_BYTES = 5 * TIB - 5 * GIB
export const R2_MAX_PARTS = 10_000
export const R2_MIN_PART_BYTES = 32 * MIB
export const R2_MAX_PART_BYTES = 5 * GIB
export const MAX_PENDING_UPLOADS_PER_USER = 5

let client: S3Client | undefined

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  const bucket = process.env.R2_BUCKET_NAME?.trim()

  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error('R2 account ID is not configured')
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2 API credentials are not configured')
  }
  if (!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error('R2 bucket name is not configured')
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  }
}

export function getR2Client() {
  if (!client) {
    const config = getR2Config()
    client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }
  return client
}

export function getMaxTransferBytes() {
  const configured = Number(process.env.MAX_TRANSFER_BYTES)
  if (Number.isSafeInteger(configured) && configured > 0) {
    return Math.min(configured, R2_MAX_OBJECT_BYTES)
  }
  return R2_MAX_OBJECT_BYTES
}

export function chooseR2PartSize(fileSize: number) {
  const minimumForPartCount = Math.ceil(fileSize / R2_MAX_PARTS)
  const roundedToMiB = Math.ceil(minimumForPartCount / MIB) * MIB
  const partSize = Math.max(R2_MIN_PART_BYTES, roundedToMiB)
  if (partSize > R2_MAX_PART_BYTES) {
    throw new Error('The file exceeds the R2 multipart upload limit')
  }
  return partSize
}

export function isR2ObjectPath(value: string, userId?: string) {
  const [ownerId, objectId, ...extra] = value.split('/')
  return (
    (!userId || ownerId === userId) &&
    /^[0-9a-f-]{36}$/i.test(ownerId || '') &&
    /^[0-9a-f-]{36}$/i.test(objectId || '') &&
    extra.length === 0
  )
}

export async function deleteR2Object(objectPath: string) {
  const { bucket } = getR2Config()
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectPath }))
}

export async function abortR2MultipartUpload(objectPath: string, uploadId: string) {
  const { bucket } = getR2Config()
  try {
    await getR2Client().send(new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: objectPath,
      UploadId: uploadId,
    }))
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name !== 'NoSuchUpload') throw error
  }
}

function contentDisposition(downloadName: string) {
  const ascii = downloadName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'download'
  const encoded = encodeURIComponent(downloadName).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export async function createR2DownloadUrl(objectPath: string, downloadName: string) {
  const { bucket } = getR2Config()
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectPath,
      ResponseContentDisposition: contentDisposition(downloadName),
    }),
    { expiresIn: 60 },
  )
}
