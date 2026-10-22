import { ProviderRequestError } from "../provider-runtime.ts";
import {
  asObject,
  asObjectArray,
  asOptionalObject,
  asStringArray,
  compactObject,
  compactUnknownObject,
  googleJsonRequest,
  normalizeSheetProperties,
  normalizeSpreadsheet,
  optionalBoolean,
  pickOptionalBoolean,
  pickOptionalInteger,
  pickOptionalString,
  resolveSpreadsheetId,
} from "./runtime-shared.ts";

const sheetsApiBaseUrl = "https://sheets.googleapis.com/v4";
const sheetLookupFields = "sheets(properties(sheetId,title,index))";

type BatchResult = {
  spreadsheetId: string;
  replies: Array<Record<string, unknown>>;
  updatedSpreadsheet?: ReturnType<typeof normalizeSpreadsheet>;
};

export async function addSheet(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        addSheet: {
          properties: buildAddSheetProperties(input),
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: extractAddSheetId(result.replies),
  });
}

export async function deleteSheet(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);

  return runBatchUpdate(
    spreadsheetId,
    [
      {
        deleteSheet: {
          sheetId: requireInteger(input, "sheetId"),
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );
}

export async function updateSheetProperties(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const update = asOptionalObject(input.updateSheetProperties);
  const source = asOptionalObject(update?.properties) ?? asOptionalObject(input.properties);
  if (!source) {
    throw new ProviderRequestError(400, "properties is required");
  }

  const properties = buildSheetProperties(source);
  if (properties.sheetId == null) {
    throw new ProviderRequestError(400, "update sheet properties.sheetId is required");
  }
  const fields = pickOptionalString(update ?? {}, "fields") ?? requireFieldMask(properties, ["sheetId"]);
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        updateSheetProperties: {
          properties,
          fields,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: properties.sheetId,
  });
}

export async function updateSpreadsheetProperties(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);

  return runBatchUpdate(
    spreadsheetId,
    [
      {
        updateSpreadsheetProperties: {
          properties: buildSpreadsheetProperties(asObject(input.properties)),
          fields: requireString(input, "fields"),
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );
}

export async function appendDimension(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheetId = requireInteger(input, "sheetId");
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        appendDimension: {
          sheetId,
          dimension: requireDimension(input),
          length: requireInteger(input, "length"),
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId,
  });
}

export async function insertDimension(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const details = asOptionalObject(input.insertDimension);
  if (!details) {
    throw new ProviderRequestError(400, "insertDimension is required");
  }

  const request = buildInsertDimensionRequest(details);
  const result = await runBatchUpdate(spreadsheetId, [{ insertDimension: request }], input, accessToken, fetcher);

  return compactUnknownObject({
    ...result,
    sheetId: optionalNumber(asOptionalObject(request.range)?.sheetId),
  });
}

export async function deleteDimension(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const details = asOptionalObject(input.deleteDimensionRequest);
  const range =
    details != null
      ? buildDimensionRange(requiredObject(details, "range"))
      : await buildGridRangeFromInput(input, spreadsheetId, accessToken, fetcher, {
          startIndexKeys: ["startIndex"],
          endIndexKeys: ["endIndex"],
          dimensionKeys: ["dimension"],
        });
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        deleteDimension: {
          range,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: optionalNumber(range.sheetId),
  });
}

export async function autoResizeDimensions(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const dimensions = await buildGridRangeFromInput(input, spreadsheetId, accessToken, fetcher, {
    startIndexKeys: ["startIndex"],
    endIndexKeys: ["endIndex"],
    dimensionKeys: ["dimension"],
  });
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        autoResizeDimensions: {
          dimensions,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: optionalNumber(dimensions.sheetId),
  });
}

export async function updateDimensionProperties(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const range = await buildGridRangeFromInput(input, spreadsheetId, accessToken, fetcher, {
    startIndexKeys: ["startIndex"],
    endIndexKeys: ["endIndex"],
    dimensionKeys: ["dimension"],
  });
  const properties = compactUnknownObject({
    pixelSize: pickOptionalInteger(input, "pixelSize"),
    hiddenByUser: pickOptionalBoolean(input, "hiddenByUser"),
  });
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        updateDimensionProperties: {
          range,
          properties,
          fields: requireFieldMask(properties),
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: optionalNumber(range.sheetId),
  });
}

export async function setBasicFilter(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const filter = buildBasicFilter(asObject(input.filter));
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        setBasicFilter: {
          filter,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: optionalNumber(asOptionalObject(filter.range)?.sheetId),
  });
}

export async function clearBasicFilter(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheetId = requireInteger(input, "sheetId");
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        clearBasicFilter: {
          sheetId,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId,
  });
}

export async function findReplace(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const request = compactUnknownObject({
    find: requireString(input, "find"),
    replacement: pickOptionalString(input, "replace") ?? "",
    includeFormulas: pickOptionalBoolean(input, "includeFormulas"),
    matchCase: pickOptionalBoolean(input, "matchCase"),
    matchEntireCell: pickOptionalBoolean(input, "matchEntireCell"),
    searchByRegex: pickOptionalBoolean(input, "searchByRegex"),
  });

  if (pickOptionalBoolean(input, "allSheets") === true) {
    return runBatchUpdate(
      spreadsheetId,
      [
        {
          findReplace: {
            ...request,
            allSheets: true,
          },
        },
      ],
      input,
      accessToken,
      fetcher,
    );
  }

  const a1Range = pickOptionalString(input, "range");
  const explicitSheetId = firstInteger(input, ["rangeSheetId", "sheetId"]);
  const explicitSheetName = firstString(input, ["sheetName"]);
  const hasGridIndexes =
    firstInteger(input, ["startRowIndex"]) != null ||
    firstInteger(input, ["endRowIndex"]) != null ||
    firstInteger(input, ["startColumnIndex"]) != null ||
    firstInteger(input, ["endColumnIndex"]) != null;

  const payload =
    a1Range != null
      ? {
          ...request,
          range: await parseA1Range(a1Range, spreadsheetId, accessToken, fetcher, {
            fallbackSheetId: explicitSheetId,
            fallbackSheetTitle: explicitSheetName,
            defaultFirstSheet: true,
          }),
        }
      : hasGridIndexes
        ? {
            ...request,
            range: await buildGridRangeFromInput(input, spreadsheetId, accessToken, fetcher, {
              sheetIdKeys: ["rangeSheetId", "sheetId"],
              sheetNameKeys: ["sheetName"],
              startRowKeys: ["startRowIndex"],
              endRowKeys: ["endRowIndex"],
              startColumnKeys: ["startColumnIndex"],
              endColumnKeys: ["endColumnIndex"],
              defaultFirstSheet: true,
            }),
          }
        : explicitSheetId != null || explicitSheetName != null
          ? {
              ...request,
              sheetId: await resolveSheetId(spreadsheetId, accessToken, fetcher, {
                sheetId: explicitSheetId,
                sheetTitle: explicitSheetName,
              }),
            }
          : {
              ...request,
              allSheets: true,
            };

  return runBatchUpdate(spreadsheetId, [{ findReplace: payload }], input, accessToken, fetcher);
}

export async function formatCell(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const a1Range = pickOptionalString(input, "range");
  const range =
    a1Range != null
      ? await parseA1Range(a1Range, spreadsheetId, accessToken, fetcher, {
          fallbackSheetTitle: pickOptionalString(input, "sheetName"),
          fallbackWorksheetId: pickOptionalInteger(input, "worksheetId"),
          defaultFirstSheet: true,
        })
      : await buildGridRangeFromInput(input, spreadsheetId, accessToken, fetcher, {
          sheetNameKeys: ["sheetName"],
          worksheetIdKeys: ["worksheetId"],
          defaultFirstSheet: true,
        });

  const backgroundColor = compactUnknownObject({
    red: optionalNumber(input.red),
    green: optionalNumber(input.green),
    blue: optionalNumber(input.blue),
  });
  const textFormat = compactUnknownObject({
    bold: pickOptionalBoolean(input, "bold"),
    italic: pickOptionalBoolean(input, "italic"),
    underline: pickOptionalBoolean(input, "underline"),
    strikethrough: pickOptionalBoolean(input, "strikethrough"),
    fontSize: pickOptionalInteger(input, "fontSize"),
  });
  const userEnteredFormat = compactUnknownObject({
    ...(Object.keys(backgroundColor).length > 0 ? { backgroundColor } : {}),
    ...(Object.keys(textFormat).length > 0 ? { textFormat } : {}),
  });
  const fields = [
    ...(Object.keys(backgroundColor).length > 0 ? ["userEnteredFormat.backgroundColor"] : []),
    ...(textFormat.bold !== undefined ? ["userEnteredFormat.textFormat.bold"] : []),
    ...(textFormat.italic !== undefined ? ["userEnteredFormat.textFormat.italic"] : []),
    ...(textFormat.underline !== undefined ? ["userEnteredFormat.textFormat.underline"] : []),
    ...(textFormat.strikethrough !== undefined ? ["userEnteredFormat.textFormat.strikethrough"] : []),
    ...(textFormat.fontSize !== undefined ? ["userEnteredFormat.textFormat.fontSize"] : []),
  ].join(",");
  if (!fields) {
    throw new ProviderRequestError(400, "at least one format field is required");
  }

  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        repeatCell: {
          range,
          cell: {
            userEnteredFormat,
          },
          fields,
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    updatedRange: a1Range,
  });
}

export async function mutateConditionalFormatRules(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const operation = requireString(input, "operation").toUpperCase();
  const sheetId = requireInteger(input, "sheetId");
  const index = pickOptionalInteger(input, "index");
  const newIndex = pickOptionalInteger(input, "newIndex");
  const rule = asOptionalObject(input.rule) ? buildConditionalFormatRule(asObject(input.rule)) : undefined;

  const request =
    operation === "ADD"
      ? {
          addConditionalFormatRule: {
            index: requiredValue(index, "index"),
            rule: requiredValue(rule, "rule"),
          },
        }
      : operation === "UPDATE"
        ? {
            updateConditionalFormatRule: compactUnknownObject({
              sheetId,
              index: requiredValue(index, "index"),
              newIndex,
              rule: requiredValue(rule, "rule"),
            }),
          }
        : operation === "DELETE"
          ? {
              deleteConditionalFormatRule: {
                sheetId,
                index: requiredValue(index, "index"),
              },
            }
          : operation === "MOVE"
            ? {
                updateConditionalFormatRule: {
                  sheetId,
                  index: requiredValue(index, "index"),
                  newIndex: requiredValue(newIndex, "newIndex"),
                },
              }
            : undefined;
  if (!request) {
    throw new ProviderRequestError(400, `unsupported mutate_conditional_format_rules operation: ${operation}`);
  }

  const result = await runBatchUpdate(spreadsheetId, [request], input, accessToken, fetcher);
  return compactUnknownObject({
    ...result,
    sheetId,
  });
}

export async function setDataValidationRule(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const mode = requireString(input, "mode").toUpperCase();
  const range = await buildGridRangeFromInput(input, spreadsheetId, accessToken, fetcher, {
    sheetIdKeys: ["sheetId"],
    startRowKeys: ["startRowIndex"],
    endRowKeys: ["endRowIndex"],
    startColumnKeys: ["startColumnIndex"],
    endColumnKeys: ["endColumnIndex"],
  });
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        setDataValidation: compactUnknownObject({
          range,
          rule: mode === "CLEAR" ? null : buildDataValidationRule(input),
          filteredRowsIncluded: pickOptionalBoolean(input, "filteredRowsIncluded"),
        }),
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    sheetId: optionalNumber(range.sheetId),
  });
}

export async function createChart(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheetId = requireInteger(input, "sheetId");
  const spec =
    (asOptionalObject(input.chartSpec) ? buildChartSpec(asObject(input.chartSpec)) : undefined) ??
    (await buildSimpleChartSpec(input, spreadsheetId, sheetId, accessToken, fetcher));
  const result = await runBatchUpdate(
    spreadsheetId,
    [
      {
        addChart: {
          chart: {
            spec,
            position: {
              overlayPosition: {
                anchorCell: {
                  sheetId,
                  rowIndex: 0,
                  columnIndex: 0,
                },
              },
            },
          },
        },
      },
    ],
    input,
    accessToken,
    fetcher,
  );

  return compactUnknownObject({
    ...result,
    chartId: extractChartId(result.replies),
  });
}

export async function copySheetToOtherSpreadsheet(
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  const spreadsheetId = resolveSpreadsheetId(input);
  const sheetId = requireInteger(input, "sheetId");
  const destinationSpreadsheetId = requireString(input, "destinationSpreadsheetId");
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}/sheets/${sheetId}:copyTo`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: {
        destinationSpreadsheetId,
      },
    },
  );

  return {
    spreadsheetId: destinationSpreadsheetId,
    copiedSheet: compactUnknownObject({
      ...normalizeSheetProperties(asObject(payload)),
      rightToLeft: optionalBoolean(payload.rightToLeft),
      tabColor: asOptionalObject(payload.tabColor),
      tabColorStyle: asOptionalObject(payload.tabColorStyle),
    }),
  };
}

async function runBatchUpdate(
  spreadsheetId: string,
  requests: Array<Record<string, unknown>>,
  input: Record<string, unknown>,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<BatchResult> {
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      accessToken,
      fetcher,
      method: "POST",
      body: compactObject({
        requests,
        ...buildResponseOptions(input),
      }),
    },
  );

  return compactUnknownObject({
    spreadsheetId: String(payload.spreadsheetId ?? spreadsheetId),
    replies: Array.isArray(payload.replies) ? payload.replies.map((reply) => asObject(reply)) : [],
    updatedSpreadsheet: payload.updatedSpreadsheet
      ? normalizeSpreadsheet(asObject(payload.updatedSpreadsheet))
      : undefined,
  }) as BatchResult;
}

function buildResponseOptions(input: Record<string, unknown>) {
  return compactObject({
    includeSpreadsheetInResponse: pickOptionalBoolean(input, "includeSpreadsheetInResponse"),
    responseRanges: resolveOptionalStringArray(input, "responseRanges"),
    responseIncludeGridData: pickOptionalBoolean(input, "responseIncludeGridData"),
  });
}

function buildAddSheetProperties(input: Record<string, unknown>) {
  const source = asOptionalObject(input.properties);

  return compactUnknownObject({
    sheetId: source ? pickOptionalInteger(source, "sheetId") : undefined,
    title: pickOptionalString(input, "title") ?? (source ? pickOptionalString(source, "title") : undefined),
    index: source ? pickOptionalInteger(source, "index") : undefined,
    hidden: source ? pickOptionalBoolean(source, "hidden") : undefined,
    sheetType: source ? pickOptionalString(source, "sheetType") : undefined,
    rightToLeft: source ? pickOptionalBoolean(source, "rightToLeft") : undefined,
    tabColorStyle: source ? asOptionalObject(source.tabColorStyle) : undefined,
    gridProperties: source ? asOptionalObject(source.gridProperties) : undefined,
  });
}

function buildSheetProperties(value: Record<string, unknown>) {
  return compactUnknownObject({
    sheetId: pickOptionalInteger(value, "sheetId"),
    title: pickOptionalString(value, "title"),
    index: pickOptionalInteger(value, "index"),
    hidden: pickOptionalBoolean(value, "hidden"),
    sheetType: pickOptionalString(value, "sheetType"),
    rightToLeft: pickOptionalBoolean(value, "rightToLeft"),
    tabColorStyle: asOptionalObject(value.tabColorStyle),
    gridProperties: asOptionalObject(value.gridProperties),
  });
}

function buildSpreadsheetProperties(value: Record<string, unknown>) {
  return compactUnknownObject({
    title: pickOptionalString(value, "title"),
    locale: pickOptionalString(value, "locale"),
    timeZone: pickOptionalString(value, "timeZone"),
    autoRecalc: pickOptionalString(value, "autoRecalc"),
    defaultFormat: asOptionalObject(value.defaultFormat),
    spreadsheetTheme: asOptionalObject(value.spreadsheetTheme),
    iterativeCalculationSettings: asOptionalObject(value.iterativeCalculationSettings),
    importFunctionsExternalUrlAccessAllowed: pickOptionalBoolean(value, "importFunctionsExternalUrlAccessAllowed"),
  });
}

function buildInsertDimensionRequest(value: Record<string, unknown>) {
  const rangeSource = asOptionalObject(value.range) ?? value;

  return compactUnknownObject({
    range: buildDimensionRange(rangeSource),
    inheritFromBefore: pickOptionalBoolean(value, "inheritFromBefore"),
  });
}

function buildBasicFilter(value: Record<string, unknown>) {
  const range = asOptionalObject(value.range);

  return compactUnknownObject({
    range: range ? buildSheetGridRange(range) : undefined,
    tableId: pickOptionalString(value, "tableId"),
    criteria: asOptionalObject(value.criteria),
    filterSpecs: Array.isArray(value.filterSpecs) ? value.filterSpecs.map((item) => asObject(item)) : undefined,
    sortSpecs: Array.isArray(value.sortSpecs) ? value.sortSpecs.map((item) => asObject(item)) : undefined,
  });
}

function buildConditionalFormatRule(value: Record<string, unknown>) {
  return compactUnknownObject({
    ranges: asObjectArray(value.ranges),
    booleanRule: asOptionalObject(value.booleanRule),
    gradientRule: asOptionalObject(value.gradientRule),
  });
}

function buildChartSpec(value: Record<string, unknown>) {
  return compactUnknownObject({
    title: pickOptionalString(value, "title"),
    subtitle: pickOptionalString(value, "subtitle"),
    backgroundColor: asOptionalObject(value.backgroundColor),
    basicChart: asOptionalObject(value.basicChart),
    pieChart: asOptionalObject(value.pieChart),
    bubbleChart: asOptionalObject(value.bubbleChart),
    candlestickChart: asOptionalObject(value.candlestickChart),
    histogramChart: asOptionalObject(value.histogramChart),
    waterfallChart: asOptionalObject(value.waterfallChart),
    treemapChart: asOptionalObject(value.treemapChart),
    orgChart: asOptionalObject(value.orgChart),
    scorecardChart: asOptionalObject(value.scorecardChart),
  });
}

function buildDimensionRange(value: Record<string, unknown>) {
  return {
    sheetId: requireInteger(value, "sheetId"),
    dimension: requireDimension(value),
    startIndex: requireInteger(value, "startIndex"),
    endIndex: requireInteger(value, "endIndex"),
  };
}

function buildSheetGridRange(value: Record<string, unknown>) {
  return compactUnknownObject({
    sheetId: requireInteger(value, "sheetId"),
    startRowIndex: pickOptionalInteger(value, "startRowIndex"),
    endRowIndex: pickOptionalInteger(value, "endRowIndex"),
    startColumnIndex: pickOptionalInteger(value, "startColumnIndex"),
    endColumnIndex: pickOptionalInteger(value, "endColumnIndex"),
  });
}

async function buildGridRangeFromInput(
  input: Record<string, unknown>,
  spreadsheetId: string,
  accessToken: string,
  fetcher: typeof fetch,
  options: {
    sheetIdKeys?: string[];
    sheetNameKeys?: string[];
    worksheetIdKeys?: string[];
    startIndexKeys?: string[];
    endIndexKeys?: string[];
    startRowKeys?: string[];
    endRowKeys?: string[];
    startColumnKeys?: string[];
    endColumnKeys?: string[];
    dimensionKeys?: string[];
    defaultFirstSheet?: boolean;
  } = {},
) {
  const sheetId = await resolveSheetId(spreadsheetId, accessToken, fetcher, {
    sheetId: firstInteger(input, options.sheetIdKeys ?? ["sheetId"]),
    sheetTitle: firstString(input, options.sheetNameKeys ?? ["sheetName"]),
    worksheetId: firstInteger(input, options.worksheetIdKeys ?? []),
    defaultFirstSheet: options.defaultFirstSheet,
  });

  return compactUnknownObject({
    sheetId,
    startIndex: firstInteger(input, options.startIndexKeys ?? []),
    endIndex: firstInteger(input, options.endIndexKeys ?? []),
    startRowIndex: firstInteger(input, options.startRowKeys ?? ["startRowIndex"]),
    endRowIndex: firstInteger(input, options.endRowKeys ?? ["endRowIndex"]),
    startColumnIndex: firstInteger(input, options.startColumnKeys ?? ["startColumnIndex"]),
    endColumnIndex: firstInteger(input, options.endColumnKeys ?? ["endColumnIndex"]),
    dimension: firstString(input, options.dimensionKeys ?? []),
  });
}

async function resolveSheetId(
  spreadsheetId: string,
  accessToken: string,
  fetcher: typeof fetch,
  options: {
    sheetId?: number;
    sheetTitle?: string;
    worksheetId?: number;
    defaultFirstSheet?: boolean;
  },
) {
  if (options.sheetId != null) {
    return options.sheetId;
  }
  if (options.worksheetId != null) {
    return options.worksheetId;
  }
  if (options.sheetTitle == null && !options.defaultFirstSheet) {
    throw new ProviderRequestError(400, "sheet identifier is required");
  }

  const sheets = await loadSheetLookup(spreadsheetId, accessToken, fetcher);
  if (options.sheetTitle) {
    const matched = sheets.find((sheet) => sheet.title === options.sheetTitle);
    if (!matched) {
      throw new ProviderRequestError(400, `sheet not found: ${options.sheetTitle}`);
    }
    return matched.sheetId;
  }

  const first = sheets[0];
  if (!first) {
    throw new ProviderRequestError(502, `spreadsheet has no sheets: ${spreadsheetId}`);
  }
  return first.sheetId;
}

async function loadSheetLookup(spreadsheetId: string, accessToken: string, fetcher: typeof fetch) {
  const payload = await googleJsonRequest<Record<string, unknown>>(
    `${sheetsApiBaseUrl}/spreadsheets/${spreadsheetId}`,
    {
      accessToken,
      fetcher,
      query: {
        fields: sheetLookupFields,
      },
    },
  );

  return Array.isArray(payload.sheets)
    ? payload.sheets
        .map((sheet) => normalizeSheetProperties(asOptionalObject(asObject(sheet).properties) ?? {}))
        .flatMap((sheet) =>
          typeof sheet.sheetId === "number"
            ? [
                {
                  sheetId: sheet.sheetId,
                  title: typeof sheet.title === "string" ? sheet.title : undefined,
                  index: typeof sheet.index === "number" ? sheet.index : undefined,
                },
              ]
            : [],
        )
    : [];
}

async function parseA1Range(
  value: string,
  spreadsheetId: string,
  accessToken: string,
  fetcher: typeof fetch,
  options: {
    fallbackSheetId?: number;
    fallbackSheetTitle?: string;
    fallbackWorksheetId?: number;
    defaultFirstSheet?: boolean;
  } = {},
) {
  const { sheetTitle, rangeText } = splitSheetPrefix(value);
  const parsed = parseA1Body(rangeText);
  const sheetId = await resolveSheetId(spreadsheetId, accessToken, fetcher, {
    sheetId: options.fallbackSheetId,
    sheetTitle: sheetTitle ?? options.fallbackSheetTitle,
    worksheetId: options.fallbackWorksheetId,
    defaultFirstSheet: options.defaultFirstSheet,
  });

  return {
    sheetId,
    ...parsed,
  };
}

function splitSheetPrefix(value: string) {
  const matched = value.match(/^(?:'((?:[^']|'')+)'|([^!]+))!(.+)$/);
  if (!matched) {
    return {
      sheetTitle: undefined,
      rangeText: value,
    };
  }

  return {
    sheetTitle: (matched[1] ?? matched[2] ?? "").replace(/''/g, "'"),
    rangeText: matched[3] ?? value,
  };
}

function parseA1Body(value: string) {
  const [startRaw = "", endRaw] = value.split(":");
  const start = parseA1Token(startRaw);
  const end = endRaw != null ? parseA1Token(endRaw) : start;

  if (start.kind === "cell" && end.kind === "cell") {
    return {
      startRowIndex: start.rowIndex,
      endRowIndex: end.rowIndex + 1,
      startColumnIndex: start.columnIndex,
      endColumnIndex: end.columnIndex + 1,
    };
  }
  if (start.kind === "column" && end.kind === "column") {
    return {
      startColumnIndex: start.columnIndex,
      endColumnIndex: end.columnIndex + 1,
    };
  }
  if (start.kind === "row" && end.kind === "row") {
    return {
      startRowIndex: start.rowIndex,
      endRowIndex: end.rowIndex + 1,
    };
  }

  throw new ProviderRequestError(400, `unsupported A1 range: ${value}`);
}

function parseA1Token(value: string) {
  const cell = value.match(/^([A-Za-z]+)(\d+)$/);
  if (cell) {
    return {
      kind: "cell" as const,
      columnIndex: columnLettersToIndex(requiredValue(cell[1], "cell column")),
      rowIndex: Number(requiredValue(cell[2], "cell row")) - 1,
    };
  }

  const column = value.match(/^[A-Za-z]+$/);
  if (column) {
    return {
      kind: "column" as const,
      columnIndex: columnLettersToIndex(column[0]),
    };
  }

  const row = value.match(/^\d+$/);
  if (row) {
    return {
      kind: "row" as const,
      rowIndex: Number(row[0]) - 1,
    };
  }

  throw new ProviderRequestError(400, `invalid A1 token: ${value}`);
}

function columnLettersToIndex(value: string) {
  let result = 0;
  for (const character of value.toUpperCase()) {
    result = result * 26 + (character.charCodeAt(0) - 64);
  }
  return result - 1;
}

function buildDataValidationRule(input: Record<string, unknown>) {
  const type = requireString(input, "validationType");
  return compactUnknownObject({
    condition: compactUnknownObject({
      type,
      values: resolveDataValidationValues(type, input),
    }),
    strict: pickOptionalBoolean(input, "strict"),
    showCustomUi: pickOptionalBoolean(input, "showCustomUi"),
    inputMessage: pickOptionalString(input, "inputMessage"),
  });
}

function resolveDataValidationValues(type: string, input: Record<string, unknown>) {
  if (type === "ONE_OF_LIST") {
    return mapConditionValues(input.values);
  }
  if (type === "ONE_OF_RANGE") {
    return [{ userEnteredValue: requireString(input, "sourceRangeA1") }];
  }
  if (type === "CUSTOM_FORMULA") {
    return [{ userEnteredValue: requireString(input, "formula") }];
  }

  const value = input.values;
  return value != null ? mapConditionValues(value) : undefined;
}

function mapConditionValues(value: unknown) {
  return asStringArray(value).map((item) => ({
    userEnteredValue: item,
  }));
}

async function buildSimpleChartSpec(
  input: Record<string, unknown>,
  spreadsheetId: string,
  sheetId: number,
  accessToken: string,
  fetcher: typeof fetch,
) {
  const chartType = requireString(input, "chartType").toUpperCase();
  const range = await parseA1Range(requireString(input, "dataRange"), spreadsheetId, accessToken, fetcher, {
    fallbackSheetId: sheetId,
  });
  if (
    range.startColumnIndex == null ||
    range.endColumnIndex == null ||
    range.endColumnIndex - range.startColumnIndex < 2
  ) {
    throw new ProviderRequestError(400, "dataRange must include at least two columns for chart creation");
  }

  const domain = {
    sheetId: range.sheetId,
    startRowIndex: range.startRowIndex,
    endRowIndex: range.endRowIndex,
    startColumnIndex: range.startColumnIndex,
    endColumnIndex: range.startColumnIndex + 1,
  };
  const sources = [];
  for (let column = range.startColumnIndex + 1; column < range.endColumnIndex; column += 1) {
    sources.push({
      sheetId: range.sheetId,
      startRowIndex: range.startRowIndex,
      endRowIndex: range.endRowIndex,
      startColumnIndex: column,
      endColumnIndex: column + 1,
    });
  }

  const legendPosition = pickOptionalString(input, "legendPosition");
  const backgroundColor = compactUnknownObject({
    red: optionalNumber(input.backgroundRed),
    green: optionalNumber(input.backgroundGreen),
    blue: optionalNumber(input.backgroundBlue),
  });
  const spec =
    chartType === "PIE"
      ? {
          pieChart: compactUnknownObject({
            legendPosition,
            domain: {
              sourceRange: {
                sources: [domain],
              },
            },
            series: {
              sourceRange: {
                sources: [requiredValue(sources[0], "chart series")],
              },
            },
          }),
        }
      : {
          basicChart: compactUnknownObject({
            chartType,
            headerCount: 1,
            legendPosition,
            domains: [
              {
                domain: {
                  sourceRange: {
                    sources: [domain],
                  },
                },
              },
            ],
            series: sources.map((source) => ({
              series: {
                sourceRange: {
                  sources: [source],
                },
              },
            })),
            axis: buildChartAxis(input),
          }),
        };

  return compactUnknownObject({
    ...spec,
    title: pickOptionalString(input, "title"),
    subtitle: pickOptionalString(input, "subtitle"),
    ...(Object.keys(backgroundColor).length > 0 ? { backgroundColor } : {}),
  });
}

function buildChartAxis(input: Record<string, unknown>) {
  return [
    ...(pickOptionalString(input, "xAxisTitle")
      ? [
          {
            position: "BOTTOM_AXIS",
            title: pickOptionalString(input, "xAxisTitle"),
          },
        ]
      : []),
    ...(pickOptionalString(input, "yAxisTitle")
      ? [
          {
            position: "LEFT_AXIS",
            title: pickOptionalString(input, "yAxisTitle"),
          },
        ]
      : []),
  ];
}

function extractAddSheetId(replies: Array<Record<string, unknown>>) {
  const addSheet = asOptionalObject(replies[0]?.addSheet);
  const properties = addSheet ? asOptionalObject(addSheet.properties) : undefined;
  return properties ? optionalNumber(properties.sheetId) : undefined;
}

function extractChartId(replies: Array<Record<string, unknown>>) {
  const addChart = asOptionalObject(replies[0]?.addChart);
  const chart = addChart ? asOptionalObject(addChart.chart) : undefined;
  return chart ? optionalNumber(chart.chartId) : undefined;
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

function requireInteger(input: Record<string, unknown>, ...keys: string[]) {
  const value = firstInteger(input, keys);
  if (value == null) {
    throw new ProviderRequestError(400, `${keys[0]} is required`);
  }
  return value;
}

function requireDimension(input: Record<string, unknown>) {
  const dimension = pickOptionalString(input, "dimension");
  if (dimension !== "ROWS" && dimension !== "COLUMNS") {
    throw new ProviderRequestError(400, "dimension must be ROWS or COLUMNS");
  }
  return dimension;
}

function requiredObject(value: Record<string, unknown>, key: string) {
  const object = asOptionalObject(value[key]);
  if (!object) {
    throw new ProviderRequestError(400, `${key} is required`);
  }
  return object;
}

function requireFieldMask(value: Record<string, unknown>, skip: string[] = []) {
  const fields = Object.keys(value).filter((key) => !skip.includes(key));
  if (fields.length === 0) {
    throw new ProviderRequestError(400, "fields could not be inferred");
  }
  return fields.join(",");
}

function firstInteger(input: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = pickOptionalInteger(input, key);
    if (value != null) {
      return value;
    }
  }
  return undefined;
}

function firstString(input: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = pickOptionalString(input, key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function requiredValue<T>(value: T | undefined, key: string) {
  if (value === undefined) {
    throw new ProviderRequestError(400, `${key} is required`);
  }
  return value;
}
