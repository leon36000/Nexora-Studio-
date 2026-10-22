import { ProviderRequestError } from "../provider-runtime.ts";
import {
  asObject,
  asObjectArray,
  asOptionalObject,
  compactObject,
  compactUnknownObject,
  googleJsonRequest,
  normalizeSheetProperties,
  normalizeSpreadsheet,
  normalizeSpreadsheetSummary,
  optionalBoolean,
  optionalString,
  pickOptionalBoolean,
  pickOptionalInteger,
  pickOptionalString,
  resolveOptionalRanges,
  resolveOptionalSheetId,
  resolveOptionalSheetTitle,
  resolveSpreadsheetId,
  buildCellA1,
} from "./runtime-shared.ts";

const driveApiBaseUrl = "https://www.googleapis.com/drive/v3";
const sheetsApiBaseUrl = "https://sheets.googleapis.com/v4";
const spreadsheetMimeType = "application/vnd.google-apps.spreadsheet";
const driveQueryFieldNames = [
  "mimeType",
  "name",
  "fullText",
  "modifiedTime",
  "createdTime",
  "viewedByMeTime",
  "trashed",
  "starred",
  "sharedWithMe",
  "visibility",
  "parents",
  "owners",
  "writers",
  "readers",
  "appProperties",
  "properties",
  "shortcutDetails.targetId",
] as const;
const driveQueryFieldPattern = driveQueryFieldNames.map((field) => field.replace(/\./g, "\\.")).join("|");
const driveBinaryClausePattern = new RegExp(
  `\\b(?:${driveQueryFieldPattern})\\b\\s*(?:=|!=|<=|>=|<|>)\\s*(?:'[^']*'|"[^"]*"|[^\\s)]+)`,
  "i",
);
const driveContainsClausePattern = new RegExp(`\\b(?:${driveQueryFieldPattern})\\b\\s+contains\\s+'[^']*'`, "i");
const driveHasClausePattern = /\b(?:appProperties|properties)\b\s+has\s+\{/i;
const driveInClausePattern = /(?:'[^']*'|"[^"]*"|[A-Za-z0-9_.-]+)\s+in\s+\b(?:parents|owners|writers|readers)\b/i;
const spreadsheetSummaryFields = [
  "id",
  "name",
  "mimeType",
  "webViewLink",
  "createdTime",
  "modifiedTime",
  "owners(displayName,emailAddress,permissionId,photoLink)",
  "shared",
  "starred",
  "trashed",
].join(",");
const sheetPropertiesFields = "sheetId,title,index,sheetType,hidden,gridProperties";
const conditionalFormatFields = [
  "spreadsheetId",
  `sheets(properties(sheetId,title,index,hidden),conditionalFormats)`,
].join(",");
const sheetLookupFields = "sheets(properties(sheetId,title))";
const dataValidationFields = [
  "spreadsheetId",
  "sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(dataValidation))))",
].join(",");

export async function searchSpreadsheets(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const queryParts = [
    `mimeType='${spreadsheetMimeType}'`,
    optionalBoolean(input.includeTrashed) === true ? undefined : "trashed=false",
    optionalBoolean(input.starredOnly) ? "starred=true" : undefined,
    optionalBoolean(input.sharedWithMe) ? "sharedWithMe=true" : undefined,
    optionalString(input.createdAfter) ? `createdTime > '${String(input.createdAfter)}'` : undefined,
    optionalString(input.modifiedAfter) ? `modifiedTime > '${String(input.modifiedAfter)}'` : undefined,
    optionalString(input.query)
      ? buildSpreadsheetSearchQuery(String(input.query), pickOptionalString(input, "searchType") ?? "name")
      : undefined,
  ].filter((value): value is string => Boolean(value));
  const includeSharedDrives = optionalBoolean(input.includeSharedDrives) ?? true;
  const maxResults = resolveMaxResults(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(`${driveApiBaseUrl}/files`, {
    accessToken,
    fetcher,
    query: compactObject({
      q: queryParts.join(" and "),
      orderBy: pickOptionalString(input, "orderBy") ?? "modifiedTime desc",
      pageToken: pickOptionalString(input, "pageToken"),
      pageSize: String(maxResults),
      fields: `nextPageToken,files(${spreadsheetSummaryFields})`,
      supportsAllDrives: includeSharedDrives ? "true" : undefined,
      includeItemsFromAllDrives: includeSharedDrives ? "true" : undefined,
      corpora: includeSharedDrives ? "allDrives" : undefined,
    }),
  });

  const spreadsheets = Array.isArray(payload.files)
    ? payload.files.map((file) => normalizeSpreadsheetSummary(asObject(file)))
    : [];

  return {
    spreadsheets,
    totalFound: spreadsheets.length,
    nextPageToken: optionalString(payload.nextPageToken) ?? null,
  };
}

export async function createGoogleSheet(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const title = pickOptionalString(input, "title");
  const payload = await googleJsonRequest<Record<string, unknown>>(`${sheetsApiBaseUrl}/spreadsheets`, {
    accessToken,
    fetcher,
    method: "POST",
    body: title ? { properties: { title } } : {},
  });

  return normalizeSpreadsheet(asObject(payload));
}

export async function getSpreadsheetInfo(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const includeGridData = pickOptionalBoolean(input, "includeGridData") ?? false;
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: compactObject({
        ranges: resolveOptionalRanges(input),
        excludeTablesInBandedRanges: resolveOptionalBooleanString(input, "excludeTablesInBandedRanges"),
        fields: buildSpreadsheetInfoFields(includeGridData),
      }),
    },
  );

  return normalizeSpreadsheet(asObject(payload));
}

export async function getSpreadsheetByDataFilter(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const body = compactUnknownObject({
    dataFilters: input.dataFilters != null ? asObjectArray(input.dataFilters).map((filter) => filter) : undefined,
    includeGridData: pickOptionalBoolean(input, "includeGridData"),
    excludeTablesInBandedRanges: pickOptionalBoolean(input, "excludeTablesInBandedRanges"),
  });
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}:getByDataFilter`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body,
    },
  );

  return normalizeSpreadsheet(asObject(payload));
}

export async function getSheetNames(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: {
        fields: `spreadsheetId,sheets(properties(sheetId,title,index,hidden))`,
      },
    },
  );

  const sheets = Array.isArray(payload.sheets) ? payload.sheets.map((sheet) => asObject(sheet)) : [];
  const excludeHidden = optionalBoolean(input.excludeHidden) ?? false;
  const visibleSheets = sheets
    .map((sheet) => normalizeSheetProperties(asOptionalObject(sheet.properties) ?? {}))
    .filter((sheet) => !excludeHidden || sheet.hidden !== true);

  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    sheetNames: visibleSheets.map((sheet) => String(sheet.title ?? "")),
    sheetIdByName: Object.fromEntries(
      visibleSheets.flatMap((sheet) =>
        typeof sheet.title === "string" && typeof sheet.sheetId === "number" ? [[sheet.title, sheet.sheetId]] : [],
      ),
    ),
  };
}

export async function searchDeveloperMetadata(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  if (input.dataFilters == null) {
    throw new ProviderRequestError(400, "dataFilters is required");
  }

  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/developerMetadata:search`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: {
        dataFilters: asObjectArray(input.dataFilters),
      },
    },
  );

  return {
    spreadsheetId,
    matchedDeveloperMetadata: Array.isArray(payload.matchedDeveloperMetadata)
      ? payload.matchedDeveloperMetadata.map((item) => asObject(item))
      : [],
  };
}

export async function getConditionalFormatRules(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: compactObject({
        excludeTablesInBandedRanges: resolveOptionalBooleanString(input, "excludeTablesInBandedRanges"),
        fields: conditionalFormatFields,
      }),
    },
  );

  const sheetId = resolveOptionalSheetId(input);
  const sheetTitle = resolveOptionalSheetTitle(input);
  const sheets = selectSheets(payload.sheets, sheetId, sheetTitle).map((sheet) => {
    const properties = normalizeSheetProperties(asOptionalObject(sheet.properties) ?? {});
    const rules = Array.isArray(sheet.conditionalFormats)
      ? sheet.conditionalFormats.map((rule, index) => {
          const normalizedRule = asObject(rule);
          return {
            index,
            ranges: Array.isArray(normalizedRule.ranges) ? normalizedRule.ranges.map((range) => asObject(range)) : [],
            rule: compactUnknownObject({
              booleanRule: asOptionalObject(normalizedRule.booleanRule),
              gradientRule: asOptionalObject(normalizedRule.gradientRule),
            }),
          };
        })
      : [];

    return {
      sheetId: Number(properties.sheetId ?? 0),
      sheetTitle: String(properties.title ?? ""),
      rules,
    };
  });

  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    sheets,
  };
}

export async function getDataValidationRules(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const ranges = await resolveDataValidationRanges(input, spreadsheetId, accessToken, fetcher);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: compactObject({
        ranges,
        includeGridData: "true",
        fields: dataValidationFields,
      }),
    },
  );

  const includeEmpty = pickOptionalBoolean(input, "includeEmpty") ?? false;
  const sheetId = resolveOptionalSheetId(input);
  const sheetTitle = resolveOptionalSheetTitle(input);

  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    rules: selectSheets(payload.sheets, sheetId, sheetTitle).flatMap((sheet) =>
      extractDataValidationRules(asObject(sheet), includeEmpty),
    ),
  };
}

function buildSpreadsheetInfoFields(includeGridData: boolean) {
  return [
    "spreadsheetId",
    "spreadsheetUrl",
    "properties",
    includeGridData
      ? `sheets(properties(${sheetPropertiesFields}),data,conditionalFormats)`
      : `sheets(properties(${sheetPropertiesFields}),conditionalFormats)`,
    "namedRanges",
    "developerMetadata",
  ].join(",");
}

function buildSpreadsheetSearchQuery(query: string, searchType: string) {
  const trimmed = query.trim();
  if (isDriveQueryExpression(trimmed)) {
    return wrapDriveQuery(trimmed);
  }

  const escaped = trimmed.replace(/'/g, "\\'");
  if (searchType === "content") {
    return `fullText contains '${escaped}'`;
  }
  if (searchType === "both") {
    return `(name contains '${escaped}' or fullText contains '${escaped}')`;
  }
  return `name contains '${escaped}'`;
}

function isDriveQueryExpression(query: string) {
  return (
    driveBinaryClausePattern.test(query) ||
    driveContainsClausePattern.test(query) ||
    driveHasClausePattern.test(query) ||
    driveInClausePattern.test(query)
  );
}

function wrapDriveQuery(query: string) {
  return query.startsWith("(") && query.endsWith(")") ? query : `(${query})`;
}

function resolveMaxResults(input: Record<string, unknown>) {
  const maxResults = pickOptionalInteger(input, "maxResults") ?? 10;
  if (maxResults < 1 || maxResults > 1000) {
    throw new ProviderRequestError(400, "maxResults must be between 1 and 1000");
  }
  return maxResults;
}

function resolveOptionalBooleanString(input: Record<string, unknown>, ...keys: string[]) {
  const value = pickOptionalBoolean(input, ...keys);
  return value === undefined ? undefined : String(value);
}

async function resolveDataValidationRanges(
  input: Record<string, unknown>,
  spreadsheetId: string,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<string[] | undefined> {
  const explicitRanges = resolveOptionalRanges(input);
  if (explicitRanges && explicitRanges.length > 0) {
    return explicitRanges;
  }

  const sheetTitle = resolveOptionalSheetTitle(input);
  if (sheetTitle) {
    return [sheetTitle];
  }

  const sheetId = resolveOptionalSheetId(input);
  if (sheetId == null) {
    return undefined;
  }

  const metadata = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: {
        fields: sheetLookupFields,
      },
    },
  );
  const matched = selectSheets(metadata.sheets, sheetId, undefined)[0];
  const matchedTitle = matched
    ? optionalString(normalizeSheetProperties(asOptionalObject(matched.properties) ?? {}).title)
    : undefined;

  if (!matchedTitle) {
    throw new ProviderRequestError(400, `sheetId not found: ${sheetId}`);
  }

  return [matchedTitle];
}

function selectSheets(value: unknown, sheetId?: number, sheetTitle?: string) {
  const sheets = Array.isArray(value) ? value.map((sheet) => asObject(sheet)) : [];
  if (sheetId != null) {
    return sheets.filter(
      (sheet) => normalizeSheetProperties(asOptionalObject(sheet.properties) ?? {}).sheetId === sheetId,
    );
  }
  if (sheetTitle) {
    return sheets.filter(
      (sheet) => normalizeSheetProperties(asOptionalObject(sheet.properties) ?? {}).title === sheetTitle,
    );
  }
  return sheets;
}

function extractDataValidationRules(sheet: Record<string, unknown>, includeEmpty: boolean) {
  const properties = normalizeSheetProperties(asOptionalObject(sheet.properties) ?? {});
  const sheetId = Number(properties.sheetId ?? 0);
  const sheetTitle = String(properties.title ?? "");
  const grids = Array.isArray(sheet.data) ? sheet.data.map((grid) => asObject(grid)) : [];
  const rules: Array<Record<string, unknown>> = [];

  for (const grid of grids) {
    const startRow = Number(grid.startRow ?? 0);
    const startColumn = Number(grid.startColumn ?? 0);
    const rowData = Array.isArray(grid.rowData) ? grid.rowData.map((row) => asObject(row)) : [];
    for (const [rowOffset, row] of rowData.entries()) {
      const values = Array.isArray(row.values) ? row.values.map((cell) => asObject(cell)) : [];
      for (const [columnOffset, cell] of values.entries()) {
        const dataValidation = asOptionalObject(cell.dataValidation);
        if (!dataValidation && !includeEmpty) {
          continue;
        }

        const condition = dataValidation ? asOptionalObject(dataValidation.condition) : undefined;
        const conditionType = condition ? optionalString(condition.type) : undefined;
        const values = Array.isArray(condition?.values) ? condition.values.map((value) => asObject(value)) : undefined;
        rules.push(
          compactUnknownObject({
            sheetId,
            sheetTitle,
            rangeA1: buildCellA1(sheetTitle, startRow + rowOffset, startColumn + columnOffset),
            ruleKind: conditionType ? deriveRuleKind(conditionType) : undefined,
            conditionType,
            values,
            strict: dataValidation ? optionalBoolean(dataValidation.strict) : undefined,
            showCustomUi: dataValidation ? optionalBoolean(dataValidation.showCustomUi) : undefined,
            inputMessage: dataValidation ? optionalString(dataValidation.inputMessage) : undefined,
          }),
        );
      }
    }
  }

  return rules;
}

function deriveRuleKind(conditionType: string) {
  if (conditionType === "ONE_OF_LIST") {
    return "DROPDOWN_LIST";
  }
  if (conditionType === "ONE_OF_RANGE") {
    return "DROPDOWN_RANGE";
  }
  return conditionType;
}
