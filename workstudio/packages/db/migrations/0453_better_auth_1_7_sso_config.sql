-- Better Auth 1.7 SSO: the account subject is the verified `sub` (OIDC) or signed NameID (SAML), so a stored
-- `mapping.id` (and the SAML `mapping.image`, which the strict SAML mapping rejects) is dropped; a SAML `callbackUrl`
-- that still names the removed ACS endpoint becomes the plugin's default post-login redirect.
-- Idempotent and per row: a configuration that is not valid JSON is left as it is.
DO $$
DECLARE
  provider record;
  oidc jsonb;
  saml jsonb;
BEGIN
  FOR provider IN SELECT id, oidc_config, saml_config FROM sso_provider LOOP
    BEGIN
      IF provider.oidc_config IS NOT NULL THEN
        oidc := provider.oidc_config::jsonb;
        IF oidc #> '{mapping,id}' IS NOT NULL THEN
          UPDATE sso_provider SET oidc_config = (oidc #- '{mapping,id}')::text WHERE id = provider.id;
        END IF;
      END IF;
      IF provider.saml_config IS NOT NULL THEN
        saml := provider.saml_config::jsonb;
        IF saml #> '{mapping,id}' IS NOT NULL THEN
          saml := saml #- '{mapping,id}';
        END IF;
        IF saml #> '{mapping,image}' IS NOT NULL THEN
          saml := saml #- '{mapping,image}';
        END IF;
        IF saml ->> 'callbackUrl' LIKE '%/sso/saml2/callback/%' THEN
          saml := saml - 'callbackUrl';
        END IF;
        IF saml::text IS DISTINCT FROM provider.saml_config::jsonb::text THEN
          UPDATE sso_provider SET saml_config = saml::text WHERE id = provider.id;
        END IF;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'sso_provider % left unchanged: %', provider.id, SQLERRM;
    END;
  END LOOP;
END $$;
