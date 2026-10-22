import type { AppData } from "./model";

import { I18nProvider } from "@embra/i18n/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { defaultMarketplaceDiscoveryUrl } from "../../src/marketplace/default-marketplace";
import { createAppI18n } from "./i18n";
import { MarketplacePage } from "./marketplace-page";
import { emptyData } from "./model";

function render(data: AppData): string {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { i18n: createAppI18n("en") },
      createElement(MemoryRouter, null, createElement(MarketplacePage, { data, onRefresh() {} })),
    ),
  );
}

function marketplaceData(discoveryUrl: string, configured: boolean): AppData {
  return {
    ...emptyData,
    marketplace: {
      configured,
      enabled: configured,
      discoveryUrl,
      status: configured ? "available" : "disabled",
      compatibleActionCount: 0,
      compatibleProviderCount: 0,
      marketplace: configured
        ? { version: 1 as const, id: "community", name: "Community Marketplace", pricing: "metered" as const }
        : undefined,
    },
  };
}

it("asks for a Marketplace source instead of preselecting a hosted one", () => {
  const markup = render(marketplaceData(defaultMarketplaceDiscoveryUrl, false));
  expect(markup).toContain("Discovery URL");
  expect(markup).toContain('type="url"');
  expect(markup).not.toContain(defaultMarketplaceDiscoveryUrl);
  expect(markup).not.toMatch(/oomol/i);
  expect(markup).not.toContain("30% off");
});

it("shows a configured custom source under its own name", () => {
  const markup = render(marketplaceData("https://custom.example/discovery", true));
  expect(markup).toContain("Community Marketplace");
  expect(markup).toContain('value="https://custom.example/discovery"');
  expect(markup).not.toMatch(/oomol/i);
});
