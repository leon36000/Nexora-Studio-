// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { OrchestrationError } from '@/lib/core/orchestration/types'
import { SCIM_ERROR_SCHEMA } from '@/ee/scim/lib/protocol/constants'

/** `scimType` values enumerated by RFC 7644 §3.12. */
export type ScimType =
  | 'invalidFilter'
  | 'tooMany'
  | 'uniqueness'
  | 'mutability'
  | 'invalidSyntax'
  | 'invalidPath'
  | 'noTarget'
  | 'invalidValue'
  | 'invalidVers'
  | 'sensitive'

export interface ScimErrorBody {
  schemas: string[]
  status: string
  scimType?: ScimType
  detail?: string
}

export function scimErrorBody(status: number, scimType?: ScimType, detail?: string): ScimErrorBody {
  return {
    schemas: [SCIM_ERROR_SCHEMA],
    status: String(status),
    ...(scimType ? { scimType } : {}),
    ...(detail ? { detail } : {}),
  }
}

export class ScimError extends Error {
  constructor(
    readonly status: number,
    readonly scimType: ScimType | undefined,
    detail: string,
    readonly headers?: Record<string, string>
  ) {
    super(detail)
    this.name = 'ScimError'
  }

  get body(): ScimErrorBody {
    return scimErrorBody(this.status, this.scimType, this.message)
  }
}

export function notFound(detail: string): ScimError {
  return new ScimError(404, undefined, detail)
}

const STATUS_BY_CODE: Record<string, number> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  locked: 423,
  payload_too_large: 413,
}

export function toScimError(error: unknown): ScimError {
  if (error instanceof ScimError) return error
  if (error instanceof OrchestrationError) {
    const status = STATUS_BY_CODE[error.code] ?? 500
    return new ScimError(
      status,
      status === 409 ? 'uniqueness' : status === 400 ? 'invalidValue' : undefined,
      status >= 500 ? 'Internal server error' : error.message
    )
  }
  return new ScimError(500, undefined, 'Internal server error')
}
