/** Nexora edition: the name of a person's first workspace, in French (« Espace de Camille »). */
export function defaultWorkspaceName(userName: string | null | undefined): string {
  const firstName = userName?.trim().split(/\s+/)[0]
  return firstName ? `Espace de ${firstName}` : 'Mon espace'
}
