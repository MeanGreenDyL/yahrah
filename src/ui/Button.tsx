import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'danger'
  full?: boolean
}

/** Every tap target is at least 44px tall; see the aesthetic rules. */
export function Button({ children, variant = 'primary', full, className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={['btn', `btn-${variant}`, full ? 'btn-full' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
