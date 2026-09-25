import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Botão no padrão Material Design 3 (Filled / Tonal / Outlined / Text / Elevated).
 * Tipografia: label-large (Google Sans Flex).
 */
const buttonVariants = cva(
  'md-label-large inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-[background-color,box-shadow,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-md-primary text-md-on-primary shadow-[var(--md-sys-elevation-1)] hover:shadow-[var(--md-sys-elevation-2)] hover:brightness-110',
        tonal:
          'bg-md-secondary-container text-md-on-secondary-container hover:brightness-95',
        destructive:
          'bg-md-error text-md-on-error shadow-[var(--md-sys-elevation-1)] hover:brightness-110',
        outline:
          'border border-md-outline bg-transparent text-md-primary hover:bg-md-primary/8',
        elevated:
          'bg-md-surface-container-low text-md-primary shadow-[var(--md-sys-elevation-1)] hover:shadow-[var(--md-sys-elevation-2)] hover:bg-md-surface-container',
        secondary:
          'bg-md-secondary-container text-md-on-secondary-container hover:brightness-95',
        ghost: 'bg-transparent text-md-primary hover:bg-md-primary/8',
        link: 'rounded-none text-md-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 min-w-16 px-6',
        sm: 'h-8 min-w-12 px-4 text-xs',
        lg: 'h-12 min-w-20 px-8',
        icon: 'h-10 w-10 min-w-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
