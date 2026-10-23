/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { renderWorkspaceInvitationEmail } from '@/components/emails/render'
import { getEmailSubject, getWorkspaceInvitationSubject } from '@/components/emails/subjects'

describe('email language', () => {
  it('writes subjects in French, the instance default, without a request locale', () => {
    expect(getEmailSubject('invitation')).toMatch(/^Vous êtes invité à rejoindre une équipe sur /)
  })

  it('writes the workspace invitation subject in French, with the workspace name', () => {
    expect(getWorkspaceInvitationSubject(['Équipe J9'])).toMatch(
      /^Vous êtes invité à rejoindre l’espace de travail « Équipe J9 » sur /
    )
    expect(getWorkspaceInvitationSubject(['Ventes', 'Support'])).toMatch(
      /^Vous êtes invité à rejoindre 2 espaces de travail sur /
    )
  })

  it('renders the workspace invitation body in French', async () => {
    const html = await renderWorkspaceInvitationEmail(
      'Alice',
      ['Ventes', 'Support'],
      'https://example.test/invite/abc'
    )

    expect(html).toContain('lang="fr"')
    expect(html).toContain('vous invite à rejoindre les espaces de travail')
    expect(html).toContain('Cette invitation expire dans 7 jours.')
    expect(html).not.toContain('Accept Invitation')
  })
})
