import type { ActionDefinition } from "../../core/types.ts";

import { salesforceAnalyticsActions } from "./actions-analytics.ts";
import { salesforceAutomationActions } from "./actions-automation.ts";
import { salesforceBaseActions } from "./actions-base.ts";
import { salesforceBulkActions } from "./actions-bulk.ts";
import { salesforceDataActions } from "./actions-data.ts";
import { salesforceFileActions } from "./actions-files.ts";

export const salesforceActions: ActionDefinition[] = [
  ...salesforceBaseActions,
  ...salesforceDataActions,
  ...salesforceAnalyticsActions,
  ...salesforceAutomationActions,
  ...salesforceFileActions,
  ...salesforceBulkActions,
];
