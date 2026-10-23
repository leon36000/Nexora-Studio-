import { db } from '@sim/db'
import { workflowExecutionLogs } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { eq, type SQL, sql } from 'drizzle-orm'

const logger = createLogger('RefusedRunLog')

/**
 * Top-level `execution_data` key naming why admission refused a run (a monthly budget, a rate
 * limit…). The log row is kept so the owner sees why nothing ran; readers that count executions
 * leave it out.
 */
const REFUSED_RUN_KEY = 'admissionRejection'

/** Marks the log row of a run refused before it started. Never throws: the row is a courtesy. */
export async function markRefusedRunLog(executionId: string, code: string): Promise<void> {
  try {
    await db
      .update(workflowExecutionLogs)
      .set({
        executionData: sql`${workflowExecutionLogs.executionData} || jsonb_build_object(${REFUSED_RUN_KEY}::text, ${code}::text)`,
      })
      .where(eq(workflowExecutionLogs.executionId, executionId))
  } catch (error) {
    logger.warn('Could not mark a refused run in the execution logs', {
      executionId,
      error: getErrorMessage(error),
    })
  }
}

/** Execution log rows of runs that started (not refused at admission). */
export function startedRunCondition(): SQL {
  return sql`(${workflowExecutionLogs.executionData} ->> ${REFUSED_RUN_KEY}) IS NULL`
}
