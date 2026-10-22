import type { HuggingfaceActionContext } from "./runtime.shared.ts";

import {
  compactObject,
  optionalBoolean,
  optionalIntegerLike,
  optionalRecord,
  optionalString,
  requiredString,
} from "../../core/cast.ts";
import { ProviderRequestError } from "../provider-runtime.ts";
import {
  asRecord,
  huggingfaceRequestJson,
  optionalGated,
  optionalStringArray,
  requireProviderArray,
  requireProviderString,
} from "./runtime.shared.ts";

const huggingfaceHubDatasetsUrl = "https://huggingface.co/api/datasets";
const huggingfaceDatasetViewerBaseUrl = "https://datasets-server.huggingface.co";

export async function listHuggingfaceDatasets(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const payload = await huggingfaceRequestJson<unknown[]>({
    ...context,
    url: huggingfaceHubDatasetsUrl,
    query: compactObject({
      search: optionalString(input.search),
      author: optionalString(input.author),
      filter: optionalString(input.filter),
      sort: optionalString(input.sort),
      direction: optionalString(input.direction),
      limit: optionalIntegerLike(input.limit, "limit", (message) => new ProviderRequestError(400, message)),
    }),
  });

  return {
    datasets: requireProviderArray(payload, "huggingface datasets").map((item) =>
      normalizeHuggingfaceDatasetSummary(asRecord(item)),
    ),
  };
}

export async function getHuggingfaceDatasetInfo(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const dataset = requiredString(input.dataset, "dataset", (message) => new ProviderRequestError(400, message));
  const config = optionalString(input.config);
  const payload = await huggingfaceRequestJson<Record<string, unknown>>({
    ...context,
    url: `${huggingfaceDatasetViewerBaseUrl}/info`,
    query: compactObject({ dataset, config }),
  });

  const datasetInfo = optionalRecord(payload.dataset_info) ?? payload;
  return compactObject({
    dataset,
    config: config ?? optionalString(datasetInfo.config_name),
    description: optionalString(datasetInfo.description),
    citation: optionalString(datasetInfo.citation),
    homepage: optionalString(datasetInfo.homepage),
    license: optionalString(datasetInfo.license),
    features: optionalRecord(datasetInfo.features),
    splits: optionalRecord(datasetInfo.splits),
    partial: optionalBoolean(payload.partial),
  });
}

export async function getHuggingfaceDatasetFirstRows(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const dataset = requiredString(input.dataset, "dataset", (message) => new ProviderRequestError(400, message));
  const config = requiredString(input.config, "config", (message) => new ProviderRequestError(400, message));
  const split = requiredString(input.split, "split", (message) => new ProviderRequestError(400, message));
  const payload = await huggingfaceRequestJson<Record<string, unknown>>({
    ...context,
    url: `${huggingfaceDatasetViewerBaseUrl}/first-rows`,
    query: { dataset, config, split },
  });

  return {
    dataset: optionalString(payload.dataset) ?? dataset,
    config: optionalString(payload.config) ?? config,
    split: optionalString(payload.split) ?? split,
    features: requireProviderArray(payload.features, "huggingface dataset features").map((item, index) =>
      normalizeDatasetFeature(asRecord(item), index),
    ),
    rows: requireProviderArray(payload.rows, "huggingface dataset rows").map((item, index) =>
      normalizeDatasetRow(asRecord(item), index),
    ),
  };
}

export async function getHuggingfaceDatasetStatistics(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const dataset = requiredString(input.dataset, "dataset", (message) => new ProviderRequestError(400, message));
  const config = requiredString(input.config, "config", (message) => new ProviderRequestError(400, message));
  const split = requiredString(input.split, "split", (message) => new ProviderRequestError(400, message));
  const payload = await huggingfaceRequestJson<Record<string, unknown>>({
    ...context,
    url: `${huggingfaceDatasetViewerBaseUrl}/statistics`,
    query: { dataset, config, split },
  });

  return {
    numExamples: readInteger(payload.numExamples, "numExamples") ?? readInteger(payload.num_examples, "num_examples"),
    partial: optionalBoolean(payload.partial) ?? false,
    statistics: requireProviderArray(payload.statistics, "huggingface dataset statistics").map((item) =>
      normalizeDatasetStatisticsEntry(asRecord(item)),
    ),
  };
}

function normalizeHuggingfaceDatasetSummary(payload: Record<string, unknown>): Record<string, unknown> {
  return compactObject({
    id: requireProviderString(payload.id, "huggingface dataset id"),
    author: optionalString(payload.author),
    private: optionalBoolean(payload.private),
    gated: optionalGated(payload.gated),
    disabled: optionalBoolean(payload.disabled),
    downloads: readInteger(payload.downloads, "downloads"),
    likes: readInteger(payload.likes, "likes"),
    tags: optionalStringArray(payload.tags),
    createdAt: optionalString(payload.createdAt) ?? optionalString(payload.created_at),
    lastModified: optionalString(payload.lastModified) ?? optionalString(payload.last_modified),
  });
}

function normalizeDatasetFeature(payload: Record<string, unknown>, index: number): Record<string, unknown> {
  return {
    featureIdx:
      readInteger(payload.featureIdx, "featureIdx") ?? readInteger(payload.feature_idx, "feature_idx") ?? index,
    name: optionalString(payload.name) ?? `feature_${index}`,
    type: optionalRecord(payload.type) ?? {},
  };
}

function normalizeDatasetRow(payload: Record<string, unknown>, index: number): Record<string, unknown> {
  return {
    rowIdx: readInteger(payload.rowIdx, "rowIdx") ?? readInteger(payload.row_idx, "row_idx") ?? index,
    row: optionalRecord(payload.row) ?? {},
    truncatedCells: optionalStringArray(payload.truncatedCells) ?? optionalStringArray(payload.truncated_cells) ?? [],
  };
}

function normalizeDatasetStatisticsEntry(payload: Record<string, unknown>): Record<string, unknown> {
  return compactObject({
    columnName: optionalString(payload.columnName) ?? optionalString(payload.column_name),
    columnType: optionalString(payload.columnType) ?? optionalString(payload.column_type),
    columnStatistics: optionalRecord(payload.columnStatistics) ?? optionalRecord(payload.column_statistics),
  });
}

function readInteger(value: unknown, field: string): number | undefined {
  return optionalIntegerLike(value, field, (message) => new ProviderRequestError(502, message));
}
