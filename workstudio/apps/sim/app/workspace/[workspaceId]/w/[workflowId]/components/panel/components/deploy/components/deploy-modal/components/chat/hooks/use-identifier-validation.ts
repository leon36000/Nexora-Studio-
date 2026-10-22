import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { requestJson } from '@/lib/api/client/request'
import { validateChatIdentifierContract } from '@/lib/api/contracts/chats'

const IDENTIFIER_PATTERN = /^[a-z0-9-]+$/
const DEBOUNCE_MS = 500

interface IdentifierValidationState {
  isChecking: boolean
  error: string | null
  isValid: boolean
}

/**
 * Hook for validating chat identifier availability with debounced API checks
 * @param identifier - The identifier to validate
 * @param originalIdentifier - The original identifier when editing an existing chat
 * @param isEditingExisting - Whether we're editing an existing chat deployment
 */
export function useIdentifierValidation(
  identifier: string,
  originalIdentifier?: string,
  isEditingExisting?: boolean
): IdentifierValidationState {
  const t = useTranslations('editor.deploy.chat.identifier')
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setError(null)
    setIsValid(false)
    setIsChecking(false)

    if (!identifier.trim()) {
      return
    }

    if (originalIdentifier && identifier === originalIdentifier) {
      setIsValid(true)
      return
    }

    if (isEditingExisting && !originalIdentifier) {
      setIsValid(true)
      return
    }

    if (!IDENTIFIER_PATTERN.test(identifier)) {
      setError(t('invalidPattern'))
      return
    }

    setIsChecking(true)
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await requestJson(validateChatIdentifierContract, {
          query: { identifier },
        })

        if (!data.available) {
          setError(data.error || t('inUse'))
          setIsValid(false)
        } else {
          setError(null)
          setIsValid(true)
        }
      } catch {
        setError(t('checkFailed'))
        setIsValid(false)
      } finally {
        setIsChecking(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [identifier, originalIdentifier, isEditingExisting, t])

  return { isChecking, error, isValid }
}
