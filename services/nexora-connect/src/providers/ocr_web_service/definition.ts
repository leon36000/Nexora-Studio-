import type { ProviderDefinition } from "../../core/types.ts";

import { ocrWebServiceActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "ocr_web_service",
  displayName: "OCR Web Service",
  categories: ["AI", "Productivity"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "OCRWEBSERVICE_USERNAME",
          description:
            "OCR Web Service username used as the HTTP Basic Auth username. Create an account or view your account from OCR Web Service: https://www.ocrwebservice.com/account/signup",
        },
        {
          key: "licenseCode",
          label: "License Code",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "OCRWEBSERVICE_LICENSE_CODE",
          description:
            "OCR Web Service license code used as the HTTP Basic Auth password. Get it after signing in to your OCR Web Service account: https://www.ocrwebservice.com/account/login",
        },
      ],
    },
  ],
  homepageUrl: "https://www.ocrwebservice.com",
  actions: ocrWebServiceActions,
};
