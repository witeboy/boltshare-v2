import { Archive, FileText, Film, Image as ImageIcon } from 'lucide-react'

type FileTypeIconProps = {
  type?: string | null
  size?: number
}

export default function FileTypeIcon({ type = '', size = 24 }: FileTypeIconProps) {
  const normalized = (type ?? '').toLowerCase()
  if (normalized.includes('image')) return <ImageIcon size={size} aria-hidden="true" />
  if (normalized.includes('video')) return <Film size={size} aria-hidden="true" />
  if (normalized.includes('zip') || normalized.includes('archive') || normalized.includes('compressed')) {
    return <Archive size={size} aria-hidden="true" />
  }
  return <FileText size={size} aria-hidden="true" />
}
