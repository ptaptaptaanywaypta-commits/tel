export function reportError(context: string, error: unknown) {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const name = error instanceof Error ? error.name : 'UnknownError'
  console.error('[safe-error]', { context, name })
}
