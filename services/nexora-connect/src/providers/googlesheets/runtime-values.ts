import { ProviderRequestError } from "../provider-runtime.ts";
import {
  asObject,
  asObjectArray,
  asStringArray,
  compactObject,
  googleJsonRequest,
  optionalString,
  pickOptionalBoolean,
  pickOptionalString,
  resolveSpreadsheetId,
} from "./runtime-shared.ts";

const sheetsApiBaseUrl = "https://sheets.googleapis.com/v4";

export async function getValues(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const range = resolveRange(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      accessToken,
      fetcher,
      query: buildValueRenderQuery(input),
    },
  );

  return normalizeValueRange(payload);
}

export async function batchGetValues(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const ranges = resolveRanges(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchGet`,
    {
      accessToken,
      fetcher,
      query: compactObject({
        ...buildValueRenderQuery(input),
        ranges,
      }),
    },
  );

  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    valueRanges: Array.isArray(payload.valueRanges)
      ? payload.valueRanges.map((valueRange) => normalizeValueRange(asObject(valueRange)))
      : [],
  };
}

export async function batchGetValuesByDataFilter(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const dataFilters = resolveDataFilters(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchGetByDataFilter`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: compactObject({
        ...buildValueRenderQuery(input),
        dataFilters,
      }),
    },
  );

  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    valueRanges: Array.isArray(payload.valueRanges)
      ? payload.valueRanges.map((valueRange) => normalizeMatchedValueRange(asObject(valueRange)))
      : [],
  };
}

export async function updateValues(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const range = resolveRange(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      accessToken,
      fetcher,
      method: "PUT",
      query: compactObject({
        valueInputOption: resolveValueInputOption(input),
        ...buildResponseRenderQuery(input),
      }),
      body: compactObject({
        majorDimension: pickOptionalString(input, "majorDimension"),
        values: resolveValueGrid(input.values),
      }),
    },
  );

  return normalizeUpdateResponse(payload, spreadsheetId);
}

export async function updateValuesBatch(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: compactObject({
        valueInputOption: resolveValueInputOption(input),
        ...buildResponseRenderBody(input),
        data: resolveBatchValueRanges(input),
      }),
    },
  );

  return normalizeBatchUpdateResponse(payload, spreadsheetId);
}

export async function appendValues(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const range = resolveRange(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
    {
      accessToken,
      fetcher,
      method: "POST",
      query: compactObject({
        insertDataOption: pickOptionalString(input, "insertDataOption"),
        valueInputOption: resolveValueInputOption(input),
        ...buildResponseRenderQuery(input),
      }),
      body: compactObject({
        majorDimension: pickOptionalString(input, "majorDimension"),
        values: resolveValueGrid(input.values),
      }),
    },
  );

  return normalizeAppendResponse(payload, spreadsheetId);
}

export async function clearValues(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const range = resolveRange(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: {},
    },
  );

  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    clearedRange: String(payload.clearedRange ?? ""),
  };
}

export async function batchClearValues(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: {
        ranges: resolveRanges(input),
      },
    },
  );

  return normalizeClearRangesResponse(payload, spreadsheetId);
}

export async function batchClearValuesByDataFilter(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchClearByDataFilter`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: {
        dataFilters: resolveDataFilters(input),
      },
    },
  );

  return normalizeClearRangesResponse(payload, spreadsheetId);
}

export async function batchUpdateValuesByDataFilter(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/values:batchUpdateByDataFilter`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: compactObject({
        valueInputOption: resolveValueInputOption(input),
        ...buildResponseRenderBody(input),
        data: resolveDataFilterValueRanges(input),
      }),
    },
  );

  return normalizeBatchUpdateResponse(payload, spreadsheetId);
}

function buildValueRenderQuery(input: Record<string, unknown>) {
  return compactObject({
    majorDimension: pickOptionalString(input, "majorDimension"),
    valueRenderOption: pickOptionalString(input, "valueRenderOption"),
    dateTimeRenderOption: pickOptionalString(input, "dateTimeRenderOption"),
  });
}

function buildResponseRenderQuery(input: Record<string, unknown>) {
  return compactObject({
    includeValuesInResponse: resolveOptionalBooleanString(input, "includeValuesInResponse"),
    responseValueRenderOption: pickOptionalString(input, "responseValueRenderOption"),
    responseDateTimeRenderOption: pickOptionalString(input, "responseDateTimeRenderOption"),
  });
}

function buildResponseRenderBody(input: Record<string, unknown>) {
  return compactObject({
    includeValuesInResponse: pickOptionalBoolean(input, "includeValuesInResponse"),
    responseValueRenderOption: pickOptionalString(input, "responseValueRenderOption"),
    responseDateTimeRenderOption: pickOptionalString(input, "responseDateTimeRenderOption"),
  });
}

function resolveRange(input: Record<string, unknown>) {
  const range = pickOptionalString(input, "range");
  if (!range) {
    throw new ProviderRequestError(400, "range is required");
  }
  return range;
}

function resolveRanges(input: Record<string, unknown>) {
  if (input.ranges == null) {
    throw new ProviderRequestError(400, "ranges is required");
  }
  const ranges = asStringArray(input.ranges).filter((range) => range.length > 0);
  if (ranges.length === 0) {
    throw new ProviderRequestError(400, "ranges is required");
  }
  return ranges;
}

function resolveDataFilters(input: Record<string, unknown>) {
  if (input.dataFilters == null) {
    throw new ProviderRequestError(400, "dataFilters is required");
  }
  return asObjectArray(input.dataFilters);
}

function resolveValueInputOption(input: Record<string, unknown>) {
  const valueInputOption = pickOptionalString(input, "valueInputOption");
  if (!valueInputOption) {
    throw new ProviderRequestError(400, "valueInputOption is required");
  }
  return valueInputOption;
}

function resolveBatchValueRanges(input: Record<string, unknown>) {
  if (input.data == null) {
    throw new ProviderRequestError(400, "data is required");
  }

  return asObjectArray(input.data).map((valueRange) =>
    compactObject({
      range: resolveRequiredString(valueRange, "range"),
      majorDimension: pickOptionalString(valueRange, "majorDimension"),
      values: resolveValueGrid(valueRange.values),
    }),
  );
}

function resolveDataFilterValueRanges(input: Record<string, unknown>) {
  if (input.data == null) {
    throw new ProviderRequestError(400, "data is required");
  }

  return asObjectArray(input.data).map((valueRange) =>
    compactObject({
      dataFilter: asObject(valueRange.dataFilter ?? {}),
      majorDimension: pickOptionalString(valueRange, "majorDimension"),
      values: resolveValueGrid(valueRange.values),
    }),
  );
}

function resolveValueGrid(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ProviderRequestError(400, "values is required");
  }
  return value.map((row) => {
    if (!Array.isArray(row)) {
      throw new ProviderRequestError(400, "values must be a 2D array");
    }
    return row;
  });
}

function normalizeMatchedValueRange(payload: Record<string, unknown>) {
  return {
    valueRange: normalizeValueRange(asObject(payload.valueRange ?? {})),
    dataFilters: Array.isArray(payload.dataFilters) ? payload.dataFilters.map((filter) => asObject(filter)) : [],
  };
}

function normalizeValueRange(payload: Record<string, unknown>) {
  return {
    range: String(payload.range ?? ""),
    majorDimension: optionalString(payload.majorDimension) ?? "ROWS",
    values: normalizeValues(payload.values),
  };
}

function normalizeValues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => (Array.isArray(row) ? row : []));
}

function normalizeUpdateResponse(payload: Record<string, unknown>, spreadsheetId: string) {
  return compactObject({
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    updatedRange: optionalString(payload.updatedRange) ?? "",
    updatedRows: Number(payload.updatedRows ?? 0),
    updatedColumns: Number(payload.updatedColumns ?? 0),
    updatedCells: Number(payload.updatedCells ?? 0),
    updatedData: payload.updatedData != null ? normalizeValueRange(asObject(payload.updatedData)) : undefined,
  });
}

function normalizeBatchUpdateResponse(payload: Record<string, unknown>, spreadsheetId: string) {
  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    totalUpdatedRows: Number(payload.totalUpdatedRows ?? 0),
    totalUpdatedColumns: Number(payload.totalUpdatedColumns ?? 0),
    totalUpdatedCells: Number(payload.totalUpdatedCells ?? 0),
    responses: Array.isArray(payload.responses)
      ? payload.responses.map((response) => {
          const normalized = normalizeUpdateResponse(asObject(response), spreadsheetId);
          const { spreadsheetId: _spreadsheetId, ...rest } = normalized;
          return rest;
        })
      : [],
  };
}

function normalizeAppendResponse(payload: Record<string, unknown>, spreadsheetId: string) {
  const updates = asObject(payload.updates ?? {});
  return compactObject({
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    tableRange: optionalString(payload.tableRange) ?? "",
    updatedRange: optionalString(updates.updatedRange) ?? "",
    updatedRows: Number(updates.updatedRows ?? 0),
    updatedColumns: Number(updates.updatedColumns ?? 0),
    updatedCells: Number(updates.updatedCells ?? 0),
    updatedData: updates.updatedData != null ? normalizeValueRange(asObject(updates.updatedData)) : undefined,
  });
}

function normalizeClearRangesResponse(payload: Record<string, unknown>, spreadsheetId: string) {
  return {
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    clearedRanges: Array.isArray(payload.clearedRanges) ? payload.clearedRanges.map((range) => String(range)) : [],
  };
}

function resolveOptionalBooleanString(input: Record<string, unknown>, ...keys: string[]) {
  const value = pickOptionalBoolean(input, ...keys);
  return value === undefined ? undefined : String(value);
}

function resolveRequiredString(input: Record<string, unknown>, key: string) {
  const value = pickOptionalString(input, key);
  if (!value) {
    throw new ProviderRequestError(400, `${key} is required`);
  }
  return value;
}
