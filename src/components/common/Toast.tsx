import { Toaster } from 'sonner'

export function Toast() {
  return (
    <Toaster
      position="top-right"
      expand
      richColors
      theme="light"
      closeButton
    />
  )
}
