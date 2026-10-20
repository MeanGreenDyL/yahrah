import type { ReactNode } from 'react'

/** The chunky bordered box that frames almost everything in Yahrah. */
export function Panel({
  title,
  children,
  tone = 'default',
  id,
}: {
  title?: string
  children: ReactNode
  tone?: 'default' | 'warn' | 'good'
  id?: string
}) {
  const headingId = title && id ? `${id}-heading` : undefined
  return (
    <section className={`panel panel-${tone}`} aria-labelledby={headingId} id={id}>
      {title && <h2 id={headingId}>{title}</h2>}
      {children}
    </section>
  )
}
