export const dropboxProviderScopes = {
  accountInfoRead: "account_info.read",
  filesMetadataRead: "files.metadata.read",
  filesContentRead: "files.content.read",
  filesContentWrite: "files.content.write",
  sharingRead: "sharing.read",
  sharingWrite: "sharing.write",
} as const;

export const dropboxOAuthScopes: string[] = [
  dropboxProviderScopes.accountInfoRead,
  dropboxProviderScopes.filesMetadataRead,
  dropboxProviderScopes.filesContentRead,
  dropboxProviderScopes.filesContentWrite,
  dropboxProviderScopes.sharingRead,
  dropboxProviderScopes.sharingWrite,
];
