import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  icon: LucideIcon
  value: number | string
  label: string
}

export default function StatCard({ icon: Icon, value, label }: StatCardProps) {
  return (
    <article className="bolt-stat-card">
      <Icon aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  )
}
