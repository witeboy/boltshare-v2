export type ReceivedTransfer = {
  id: string
  token: string
  fileName: string
  fileType: string
  fileSize: number
  downloadedAt: string
}

const STORAGE_KEY = 'boltshare_received_transfers_v1'
const MAX_ITEMS = 100

export function getReceivedTransfers(): ReceivedTransfer[] {
  if (typeof window === 'undefined') return []
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ReceivedTransfer => {
      if (!item || typeof item !== 'object') return false
      const transfer = item as Partial<ReceivedTransfer>
      return typeof transfer.id === 'string' &&
        typeof transfer.token === 'string' &&
        typeof transfer.fileName === 'string' &&
        typeof transfer.fileType === 'string' &&
        typeof transfer.fileSize === 'number' &&
        typeof transfer.downloadedAt === 'string'
    }).slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

export function recordReceivedTransfer(transfer: Omit<ReceivedTransfer, 'downloadedAt'>) {
  if (typeof window === 'undefined') return
  const next: ReceivedTransfer = { ...transfer, downloadedAt: new Date().toISOString() }
  const existing = getReceivedTransfers().filter(item => item.id !== transfer.id)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...existing].slice(0, MAX_ITEMS)))
  } catch {
    // Browser privacy settings or quota limits must not interrupt a successful download.
  }
}
