/**
 * Nexora edition switches. Nexora Connect is self-hosted only: the console never defaults to,
 * links to, or advertises a vendor-hosted cloud.
 *
 * Cloud OAuth projects ("SaaS" authorization) need the base URL of a hosted service that
 * implements the SaaS project API. The Nexora edition ships none, so the cloud project settings
 * and the per-provider authorization source selector stay hidden while this is `undefined`.
 */
export const saasCloudBaseUrl: string | undefined = undefined;
