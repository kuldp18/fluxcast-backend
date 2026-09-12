import path from 'node:path';
import OpenApiValidator from 'express-openapi-validator';
import { OPENAPI_VALIDATE_RESPONSES } from '../config/env.js';

function openApiValidatorSetup() {
  // Keep a stable path so tooling/tests can refer to it.
  const apiSpecPath = path.join(process.cwd(), 'openapi.yaml');

  return OpenApiValidator.middleware({
    apiSpec: apiSpecPath,
    validateRequests: true,
    // Enable selectively; response validation can be noisy during early development.
    validateResponses: OPENAPI_VALIDATE_RESPONSES,
  });
}

export { openApiValidatorSetup };
