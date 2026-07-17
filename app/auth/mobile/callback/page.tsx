import { AuthConfirmForm } from '@/components/AuthConfirmForm'

interface CallbackSearchParams {
  token_hash?: string | string[]
  code?: string | string[]
  next?: string | string[]
  error?: string | string[]
  error_description?: string | string[]
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function safeNextPath(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard'
}

export default async function MobileAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<CallbackSearchParams>
}) {
  const params = await searchParams
  const tokenHash = first(params.token_hash) ?? null
  const code = first(params.code) ?? null
  const nextPath = safeNextPath(first(params.next))
  const initialError =
    first(params.error_description) ??
    first(params.error) ??
    (!tokenHash && !code
      ? 'This sign-in link is missing its verification information.'
      : null)

  return (
    <AuthConfirmForm
      tokenHash={tokenHash}
      code={code}
      nextPath={nextPath}
      initialError={initialError}
    />
  )
}
