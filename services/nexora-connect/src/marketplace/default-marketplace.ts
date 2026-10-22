/**
 * Nexora edition: no third-party marketplace is queried by default. The reserved `.invalid`
 * TLD never resolves, so discovery fails locally until an operator configures a source.
 */
export const defaultMarketplaceDiscoveryUrl = "https://marketplace.invalid/.well-known/connector-marketplace";
