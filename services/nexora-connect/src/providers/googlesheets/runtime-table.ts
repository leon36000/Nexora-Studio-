import { ProviderRequestError } from "../provider-runtime.ts";
import {
  asObject,
  asStringArray,
  asOptionalObject,
  buildCellA1,
  compactObject,
  compactUnknownObject,
  googleJsonRequest,
  normalizeSpreadsheet,
  pickOptionalBoolean,
  pickOptionalInteger,
  pickOptionalString,
  quoteA1SheetTitle,
  resolveSpreadsheetId,
} from "./runtime-shared.ts";

const sheetsApiBaseUrl = "https://sheets.googleapis.com/v4";
const metadataFields = "spreadsheetId,sheets(properties(sheetId,title,index,gridProperties))";

type SheetMetadata = {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
};

export async function createSpreadsheetRow(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheets = await loadSheetMetadata(spreadsheetId, accessToken, fetcher);
  const sheet = resolveSheet(sheets, input);
  const requestedInsertIndex = pickOptionalInteger(input, "insertIndex") ?? 0;
  if (requestedInsertIndex < 0) {
    throw new ProviderRequestError(400, "insertIndex must be >= 0");
  }
  const insertIndex = Math.min(requestedInsertIndex, sheet.rowCount);
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        insertDimension: {
          range: {
            sheetId: sheet.sheetId,
            dimension: "ROWS",
            startIndex: insertIndex,
            endIndex: insertIndex + 1,
          },
          inheritFromBefore: pickOptionalBoolean(input, "inheritFromBefore") ?? false,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return result;
}

export async function createSpreadsheetColumn(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheets = await loadSheetMetadata(spreadsheetId, accessToken, fetcher);
  const sheet = resolveSheet(sheets, input);
  const requestedInsertIndex = pickOptionalInteger(input, "insertIndex") ?? 0;
  if (requestedInsertIndex < 0) {
    throw new ProviderRequestError(400, "insertIndex must be >= 0");
  }
  const insertIndex = Math.min(requestedInsertIndex, sheet.columnCount);
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        insertDimension: {
          range: {
            sheetId: sheet.sheetId,
            dimension: "COLUMNS",
            startIndex: insertIndex,
            endIndex: insertIndex + 1,
          },
          inheritFromBefore: pickOptionalBoolean(input, "inheritFromBefore") ?? false,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return result;
}

export async function lookupSpreadsheetRow(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const range =
    pickOptionalString(input, "range") ??
    quoteA1SheetTitle((await loadSheetMetadata(spreadsheetId, accessToken, fetcher))[0]?.title ?? "");
  if (!range) {
    throw new ProviderRequestError(400, "unable to resolve lookup range");
  }

  const payload = await readValueRange(spreadsheetId, range, accessToken, fetcher);
  const query = requireString(input, "query");
  const caseSensitive = pickOptionalBoolean(input, "caseSensitive") ?? false;
  const normalizeWhitespace = pickOptionalBoolean(input, "normalizeWhitespace") ?? true;

  for (const row of payload.values) {
    if (
      row.some((cell) =>
        equalsCell(String(cell ?? ""), query, {
          caseSensitive,
          normalizeWhitespace,
        }),
      )
    ) {
      return {
        found: true,
        rowData: row.map((cell) => String(cell ?? "")),
      };
    }
  }

  return {
    found: false,
    rowData: [],
  };
}

export async function aggregateColumnData(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheetName = requireString(input, "sheetName");
  const payload = await readValueRange(spreadsheetId, quoteA1SheetTitle(sheetName), accessToken, fetcher);
  const values = payload.values.map((row) => row.map((cell) => String(cell ?? "")));
  const hasHeaderRow = pickOptionalBoolean(input, "hasHeaderRow") ?? true;
  const headerRow = hasHeaderRow ? (values[0] ?? []) : [];
  const dataRows = hasHeaderRow ? values.slice(1) : values;
  const anchor = parseRangeAnchor(payload.range);
  const targetColumn = requireString(input, "targetColumn");
  const operation = requireString(input, "operation");
  const caseSensitive = pickOptionalBoolean(input, "caseSensitive") ?? true;
  const targetIndex = resolveColumnIndex(targetColumn, headerRow, hasHeaderRow, anchor.columnIndex, caseSensitive);

  const searchColumn = pickOptionalString(input, "searchColumn");
  const searchValue = pickOptionalString(input, "searchValue");
  const searchIndex =
    searchColumn != null
      ? resolveColumnIndex(searchColumn, headerRow, hasHeaderRow, anchor.columnIndex, caseSensitive)
      : undefined;

  const matchingRows = dataRows.filter((row) => {
    if (searchIndex == null || searchValue == null) {
      return true;
    }
    return equalsCell(row[searchIndex] ?? "", searchValue, {
      caseSensitive,
      normalizeWhitespace: false,
    });
  });
  const parseNumericCell = (row: string[]) => {
    const raw = row[targetIndex];
    if (raw == null || raw.trim() === "") {
      return undefined;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const valuesProcessed = matchingRows.map(parseNumericCell).filter((value): value is number => value !== undefined);
  const result =
    operation === "sum"
      ? sum(valuesProcessed)
      : operation === "average"
        ? valuesProcessed.length === 0
          ? 0
          : sum(valuesProcessed) / valuesProcessed.length
        : operation === "count"
          ? valuesProcessed.length
          : operation === "min"
            ? valuesProcessed.length === 0
              ? 0
              : Math.min(...valuesProcessed)
            : operation === "max"
              ? valuesProcessed.length === 0
                ? 0
                : Math.max(...valuesProcessed)
              : calculatePercentage(
                  valuesProcessed,
                  dataRows.map(parseNumericCell).filter((value): value is number => value !== undefined),
                  input,
                );

  return {
    result,
    operation,
    matchingRowsCount: matchingRows.length,
    processedValuesCount: valuesProcessed.length,
    valuesProcessed,
    searchDetails: compactUnknownObject({
      searchColumn,
      searchValue,
      targetColumn,
      caseSensitive,
      aggregatedAllRows: searchIndex == null || searchValue == null,
    }),
  };
}

export async function upsertRows(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheetName = requireString(input, "sheetName");
  const rows = readCellMatrix(input.rows);
  const explicitHeaders = input.headers != null ? asStringArray(input.headers) : undefined;
  const strictMode = pickOptionalBoolean(input, "strictMode") ?? true;
  const tableStart = pickOptionalString(input, "tableStart") ?? "A1";
  const anchor = parseCellReference(tableStart);
  const incomingHeaders = explicitHeaders ?? rows[0]?.map((cell) => String(cell ?? "")) ?? [];
  const incomingRows = explicitHeaders ? rows : rows.slice(1);
  const keySelection = resolveInputKeySelection(incomingHeaders, input);
  const incomingKeyIndex = resolveIncomingKeyIndex(incomingHeaders, keySelection);
  const inputRowMap = buildInputRowMap(incomingRows, incomingKeyIndex, incomingHeaders.length, strictMode);

  const sheets = await loadSheetMetadata(spreadsheetId, accessToken, fetcher);
  const sheet = resolveSheetByName(sheets, sheetName);
  const payload = await readValueRange(
    spreadsheetId,
    tableStart === "A1"
      ? quoteA1SheetTitle(sheetName)
      : buildUpsertReadRange(sheetName, anchor, {
          columnCount: Math.max(incomingHeaders.length, 1),
          rowCount: Math.max(inputRowMap.size + 1, 1),
        }),
    accessToken,
    fetcher,
  );
  const existingValues = payload.values.map((row) => row.map((cell) => String(cell ?? "")));
  const existingHeaders = existingValues[0] ?? [];
  const existingDataRows = existingValues.slice(existingHeaders.length > 0 ? 1 : 0);
  const existingKeyIndex = resolveExistingKeyIndex(existingHeaders, incomingHeaders, keySelection);

  const missingHeaders = incomingHeaders.filter((header) => !existingHeaders.includes(header));
  const finalHeaders = existingHeaders.length > 0 ? [...existingHeaders, ...missingHeaders] : incomingHeaders;
  const finalHeaderIndexByName = new Map(finalHeaders.map((header, index) => [header, index]));

  const existingRowMap = buildExistingRowMap(
    existingDataRows,
    existingKeyIndex,
    finalHeaders.length,
    anchor.rowIndex + 1,
  );
  const writes: Array<{ range: string; values: Array<Array<string>> }> = [];
  if (existingHeaders.length === 0) {
    writes.push({
      range: buildRowRange(sheetName, anchor.rowIndex, anchor.columnIndex, finalHeaders.length),
      values: [finalHeaders],
    });
  } else if (missingHeaders.length > 0) {
    writes.push({
      range: buildHeaderAppendRange(
        sheetName,
        anchor.rowIndex,
        anchor.columnIndex + existingHeaders.length,
        missingHeaders.length,
      ),
      values: [missingHeaders],
    });
  }

  let rowsUpdated = 0;
  let rowsInserted = 0;
  let nextInsertOffset = existingDataRows.length;
  for (const [key, row] of inputRowMap.entries()) {
    const target = existingRowMap.get(key) ?? {
      rowIndex: anchor.rowIndex + 1 + nextInsertOffset,
      values: Array.from({ length: finalHeaders.length }, () => ""),
    };
    const nextValues = [...target.values];
    for (const [headerIndex, header] of incomingHeaders.entries()) {
      nextValues[requiredHeaderIndex(finalHeaderIndexByName, header)] = String(row[headerIndex] ?? "");
    }
    writes.push({
      range: buildRowRange(sheetName, target.rowIndex, anchor.columnIndex, finalHeaders.length),
      values: [nextValues],
    });

    if (existingRowMap.has(key)) {
      rowsUpdated += 1;
    } else {
      rowsInserted += 1;
      nextInsertOffset += 1;
    }
  }

  if (missingHeaders.length > 0) {
    await runBatchUpdate(
      spreadsheetId,
      [
        {
          insertDimension: {
            range: {
              sheetId: sheet.sheetId,
              dimension: "COLUMNS",
              startIndex: anchor.columnIndex + existingHeaders.length,
              endIndex: anchor.columnIndex + existingHeaders.length + missingHeaders.length,
            },
            inheritFromBefore: false,
          },
        },
      ],
      input,
      accessToken,
      fetcher,
    );
  }

  if (writes.length > 0) {
    await googleJsonRequest<Record<string, unknown>>(
      `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        accessToken,
        fetcher,
        method: "POST",
        body: {
          valueInputOption: "USER_ENTERED",
          data: writes,
        },
      },
    );
  }

  return {
    spreadsheetId,
    sheetName,
    rowsUpdated,
    rowsInserted,
    columnsAdded: missingHeaders.length,
    totalRowsProcessed: inputRowMap.size,
  };
}

async function runBatchUpdate(
  spreadsheetId: string,
  requests: Array<Record<string, unknown>>,
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
) {
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: compactObject({
        requests,
        includeSpreadsheetInResponse: pickOptionalBoolean(input, "includeSpreadsheetInResponse"),
        responseRanges: resolveOptionalStringArray(input, "responseRanges"),
        responseIncludeGridData: pickOptionalBoolean(input, "responseIncludeGridData"),
      }),
    },
  );

  return compactUnknownObject({
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    replies: Array.isArray(payload.replies) ? payload.replies.map((reply) => asObject(reply)) : [],
    updatedSpreadsheet: payload.updatedSpreadsheet
      ? normalizeSpreadsheet(asObject(payload.updatedSpreadsheet))
      : undefined,
  });
}

async function loadSheetMetadata(spreadsheetId: string, accessToken: string, fetcher: typeof fetch) {
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: {
        fields: metadataFields,
      },
    },
  );

  return Array.isArray(payload.sheets)
    ? payload.sheets.flatMap((sheet) => {
        const properties = asOptionalObject(asObject(sheet).properties);
        if (!properties) {
          return [];
        }

        return [
          {
            sheetId: pickOptionalInteger(properties, "sheetId") ?? 0,
            title: pickOptionalString(properties, "title") ?? "",
            index: pickOptionalInteger(properties, "index") ?? 0,
            rowCount: pickOptionalInteger(asOptionalObject(properties.gridProperties) ?? {}, "rowCount") ?? 0,
            columnCount: pickOptionalInteger(asOptionalObject(properties.gridProperties) ?? {}, "columnCount") ?? 0,
          },
        ];
      })
    : [];
}

function resolveSheet(sheets: SheetMetadata[], input: Record<string, unknown>) {
  const requestedSheetId = pickOptionalInteger(input, "sheetId");
  if (requestedSheetId != null) {
    const matched = sheets.find((sheet) => sheet.sheetId === requestedSheetId);
    if (!matched) {
      throw new ProviderRequestError(400, `sheetId not found: ${requestedSheetId}`);
    }
    return matched;
  }

  const requestedSheetName = pickOptionalString(input, "sheetName");
  if (requestedSheetName) {
    return resolveSheetByName(sheets, requestedSheetName);
  }

  const first = sheets[0];
  if (!first) {
    throw new ProviderRequestError(502, "spreadsheet has no sheets");
  }
  return first;
}

function resolveSheetByName(sheets: SheetMetadata[], sheetName: string) {
  const matched = sheets.find((sheet) => sheet.title === sheetName);
  if (!matched) {
    throw new ProviderRequestError(400, `sheetName not found: ${sheetName}`);
  }
  return matched;
}

async function readValueRange(spreadsheetId: string, range: string, accessToken: string, fetcher: typeof fetch) {
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      accessToken,
      fetcher,
    },
  );

  return {
    range: String(payload.range ?? range),
    values: Array.isArray(payload.values)
      ? payload.values.map((row) => (Array.isArray(row) ? row : []).map((cell) => cell))
      : [],
  };
}

function resolveColumnIndex(
  reference: string,
  headers: string[],
  hasHeaderRow: boolean,
  startColumnIndex: number,
  caseSensitive: boolean,
) {
  if (hasHeaderRow) {
    const matchedIndex = headers.findIndex((header) =>
      equalsCell(header, reference, { caseSensitive, normalizeWhitespace: false }),
    );
    if (matchedIndex !== -1) {
      return matchedIndex;
    }
  }
  if (/^[A-Za-z]+$/.test(reference)) {
    return columnLettersToIndex(reference) - startColumnIndex;
  }
  if (!hasHeaderRow) {
    throw new ProviderRequestError(400, `header name requires hasHeaderRow=true: ${reference}`);
  }
  throw new ProviderRequestError(400, `column not found: ${reference}`);
}

function equalsCell(
  actual: string,
  expected: string,
  options: { caseSensitive: boolean; normalizeWhitespace: boolean },
) {
  const normalize = (value: string) => {
    const next = options.normalizeWhitespace ? value.trim().replace(/\s+/g, " ") : value;
    return options.caseSensitive ? next : next.toLowerCase();
  };

  return normalize(actual) === normalize(expected);
}

function calculatePercentage(matchingValues: number[], allTargetValues: number[], input: Record<string, unknown>) {
  const denominator = input.percentageTotal != null ? Number(input.percentageTotal) : sum(allTargetValues);
  if (!Number.isFinite(denominator) || denominator === 0) {
    throw new ProviderRequestError(400, "percentage denominator must not be 0");
  }
  return (sum(matchingValues) / denominator) * 100;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function parseRangeAnchor(range: string) {
  const matched = range.match(/!(\$?[A-Za-z]+\$?\d+)/);
  if (!matched?.[1]) {
    return {
      rowIndex: 0,
      columnIndex: 0,
    };
  }
  return parseCellReference(matched[1].replace(/\$/g, ""));
}

function buildUpsertReadRange(
  sheetName: string,
  anchor: { rowIndex: number; columnIndex: number },
  size: { rowCount: number; columnCount: number },
) {
  const startCell = buildCellA1(sheetName, anchor.rowIndex, anchor.columnIndex);
  const endCellWithSheet = buildCellA1(
    sheetName,
    anchor.rowIndex + size.rowCount - 1,
    anchor.columnIndex + size.columnCount - 1,
  );
  return `${startCell}:${endCellWithSheet.slice(endCellWithSheet.lastIndexOf("!") + 1)}`;
}

function parseCellReference(value: string) {
  const matched = value.match(/^([A-Za-z]+)(\d+)$/);
  if (!matched?.[1] || !matched[2]) {
    throw new ProviderRequestError(400, `invalid cell reference: ${value}`);
  }
  return {
    columnIndex: columnLettersToIndex(matched[1]),
    rowIndex: Number(matched[2]) - 1,
  };
}

function columnLettersToIndex(value: string) {
  let result = 0;
  for (const character of value.toUpperCase()) {
    result = result * 26 + (character.charCodeAt(0) - 64);
  }
  return result - 1;
}

function readCellMatrix(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ProviderRequestError(400, "rows is required");
  }

  return value.map((row) => {
    if (!Array.isArray(row)) {
      throw new ProviderRequestError(400, "row array is required");
    }
    return row;
  });
}

function resolveInputKeySelection(headers: string[], input: Record<string, unknown>) {
  const keyColumn = pickOptionalString(input, "keyColumn");
  const keyColumnIndex = pickOptionalInteger(input, "keyColumnIndex");
  const resolvedIndex = keyColumn != null ? resolveHeaderIndex(headers, keyColumn) : (keyColumnIndex ?? 0);

  if (keyColumn != null && keyColumnIndex != null && resolvedIndex !== keyColumnIndex) {
    throw new ProviderRequestError(400, "keyColumn and keyColumnIndex point to different columns");
  }

  return {
    index: keyColumnIndex ?? resolvedIndex,
    keyColumn,
  };
}

function resolveExistingKeyIndex(
  existingHeaders: string[],
  incomingHeaders: string[],
  selection: { index: number; keyColumn?: string },
) {
  if (selection.keyColumn != null && existingHeaders.includes(selection.keyColumn)) {
    return existingHeaders.indexOf(selection.keyColumn);
  }
  if (selection.index < existingHeaders.length) {
    return selection.index;
  }
  return resolveHeaderIndex(
    existingHeaders.length > 0 ? existingHeaders : incomingHeaders,
    incomingHeaders[selection.index] ?? "",
  );
}

function resolveIncomingKeyIndex(incomingHeaders: string[], selection: { index: number; keyColumn?: string }) {
  if (selection.keyColumn != null) {
    return resolveHeaderIndex(incomingHeaders, selection.keyColumn);
  }
  if (selection.index >= incomingHeaders.length) {
    throw new ProviderRequestError(400, "key column index is out of range");
  }
  return selection.index;
}

function resolveHeaderIndex(headers: string[], headerName: string) {
  const index = headers.indexOf(headerName);
  if (index === -1) {
    throw new ProviderRequestError(400, `header not found: ${headerName}`);
  }
  return index;
}

function buildExistingRowMap(rows: string[][], keyIndex: number, width: number, firstDataRowIndex: number) {
  const map = new Map<string, { rowIndex: number; values: string[] }>();
  for (const [rowOffset, row] of rows.entries()) {
    if (row.every((cell) => cell.trim().length === 0)) {
      continue;
    }
    const normalized = Array.from({ length: width }, (_value, index) => row[index] ?? "");
    const key = normalized[keyIndex] ?? "";
    if (map.has(key)) {
      throw new ProviderRequestError(400, `duplicate key in target table: ${key}`);
    }
    map.set(key, {
      rowIndex: firstDataRowIndex + rowOffset,
      values: normalized,
    });
  }
  return map;
}

function buildInputRowMap(rows: unknown[][], keyIndex: number, width: number, strictMode: boolean) {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (row.length < width) {
      throw new ProviderRequestError(400, "row has fewer values than headers");
    }
    if (row.length > width && strictMode) {
      throw new ProviderRequestError(400, "row has more values than headers");
    }
    const normalized = row.slice(0, width).map((cell) => String(cell ?? ""));
    const key = normalized[keyIndex] ?? "";
    if (map.has(key)) {
      throw new ProviderRequestError(400, `duplicate key in input rows: ${key}`);
    }
    map.set(key, normalized);
  }
  return map;
}

function buildRowRange(sheetName: string, rowIndex: number, startColumnIndex: number, width: number) {
  return buildHorizontalRange(sheetName, rowIndex, startColumnIndex, width);
}

function buildHeaderAppendRange(sheetName: string, rowIndex: number, startColumnIndex: number, width: number) {
  return buildHorizontalRange(sheetName, rowIndex, startColumnIndex, width);
}

function buildHorizontalRange(sheetName: string, rowIndex: number, startColumnIndex: number, width: number) {
  const start = buildCellA1(sheetName, rowIndex, startColumnIndex);
  if (width === 1) {
    return start;
  }

  return `${start}:${columnIndexToLetters(startColumnIndex + width - 1)}${rowIndex + 1}`;
}

function columnIndexToLetters(value: number) {
  let remaining = value + 1;
  let result = "";
  while (remaining > 0) {
    const current = (remaining - 1) % 26;
    result = String.fromCharCode(65 + current) + result;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return result;
}

function requiredHeaderIndex(map: Map<string, number>, header: string) {
  const value = map.get(header);
  if (value == null) {
    throw new ProviderRequestError(400, `header not found in target table: ${header}`);
  }
  return value;
}

function resolveOptionalStringArray(input: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (input[key] != null) {
      return asStringArray(input[key]);
    }
  }
  return undefined;
}

function requireString(input: Record<string, unknown>, ...keys: string[]) {
  const value = pickOptionalString(input, ...keys);
  if (!value) {
    throw new ProviderRequestError(400, `${keys[0]} is required`);
  }
  return value;
}
