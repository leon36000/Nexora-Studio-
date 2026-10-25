import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  defaultTableColumnName,
  defaultTableViewName,
  generateUniqueTableName,
  getBillingDisabledTableLimits,
  getDeleteSnapshotBatchSize,
  getMaxRowSizeBytes,
  NAME_PATTERN,
  TABLE_LIMITS,
} from '@/lib/table/constants'

const UNSET_TABLE_ENV = {
  FREE_TABLES_LIMIT: undefined,
  FREE_TABLE_ROWS_LIMIT: undefined,
  TABLE_MAX_ROW_SIZE_BYTES: undefined,
}

afterAll(resetEnvMock)

describe('getBillingDisabledTableLimits', () => {
  beforeEach(() => {
    setEnv(UNSET_TABLE_ENV)
  })

  it('opts each cap back in independently when its env var is explicitly set', () => {
    setEnv({ FREE_TABLES_LIMIT: '7' })

    expect(getBillingDisabledTableLimits()).toEqual({
      maxTables: 7,
      maxRowsPerTable: Number.MAX_SAFE_INTEGER,
    })

    setEnv({ FREE_TABLE_ROWS_LIMIT: '2500' })
    expect(getBillingDisabledTableLimits()).toEqual({
      maxTables: 7,
      maxRowsPerTable: 2500,
    })
  })
})

describe('getMaxRowSizeBytes', () => {
  beforeEach(() => {
    setEnv(UNSET_TABLE_ENV)
  })

  it('caps overrides at the delete snapshot byte budget', () => {
    setEnv({ TABLE_MAX_ROW_SIZE_BYTES: String(TABLE_LIMITS.DELETE_SNAPSHOT_BATCH_MAX_BYTES * 2) })

    expect(getMaxRowSizeBytes()).toBe(TABLE_LIMITS.DELETE_SNAPSHOT_BATCH_MAX_BYTES)
  })
})

describe('getDeleteSnapshotBatchSize', () => {
  beforeEach(() => {
    setEnv(UNSET_TABLE_ENV)
  })

  it('derives a worst-case row cap from the delete snapshot byte budget', () => {
    expect(getDeleteSnapshotBatchSize()).toBe(
      Math.floor(TABLE_LIMITS.DELETE_SNAPSHOT_BATCH_MAX_BYTES / TABLE_LIMITS.MAX_ROW_SIZE_BYTES)
    )
  })

  it('always processes one row and never exceeds the delete row-count cap', () => {
    setEnv({ TABLE_MAX_ROW_SIZE_BYTES: String(TABLE_LIMITS.DELETE_SNAPSHOT_BATCH_MAX_BYTES * 2) })
    expect(getDeleteSnapshotBatchSize()).toBe(1)

    setEnv({ TABLE_MAX_ROW_SIZE_BYTES: '1' })
    expect(getDeleteSnapshotBatchSize()).toBe(TABLE_LIMITS.DELETE_BATCH_SIZE)
  })
})

describe('generateUniqueTableName', () => {
  it('numbers French tables from 1: table_1, table_2…', () => {
    expect(generateUniqueTableName([], 'fr')).toBe('table_1')
    expect(generateUniqueTableName(['table_1'], 'fr')).toBe('table_2')
  })

  it('takes the first free number, whatever the case of the names already used', () => {
    expect(generateUniqueTableName(['table_1', 'TABLE_2', 'table_4'], 'fr')).toBe('table_3')
  })

  it('is French by default, and always a valid table name', () => {
    expect(generateUniqueTableName([])).toBe('table_1')
    expect(NAME_PATTERN.test(generateUniqueTableName(['table_1']))).toBe(true)
  })

  it('keeps the original space-themed names in English', () => {
    const name = generateUniqueTableName([], 'en')
    expect(name).toMatch(/^[a-z]+_[a-z]+$/)
    expect(name).not.toMatch(/^table_/)
    expect(NAME_PATTERN.test(name)).toBe(true)
  })
})

describe('default names a new table starts with', () => {
  it('names the starter view « Par défaut » in French and « Default » in English', () => {
    expect(defaultTableViewName('fr')).toBe('Par défaut')
    expect(defaultTableViewName('en')).toBe('Default')
  })

  it('names the starter column « nom » in French and « name » in English, both valid column names', () => {
    expect(defaultTableColumnName('fr')).toBe('nom')
    expect(defaultTableColumnName('en')).toBe('name')
    expect(NAME_PATTERN.test(defaultTableColumnName('fr'))).toBe(true)
  })
})
