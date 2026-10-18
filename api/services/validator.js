import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { bJsonSchema, themeJsonSchema, appConfigSchema } from './schemas.js';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

const validateBJsonCompiled = ajv.compile(bJsonSchema);
const validateThemeJsonCompiled = ajv.compile(themeJsonSchema);
const validateAppConfigCompiled = ajv.compile(appConfigSchema);

export function validateBJson(data) {
  const valid = validateBJsonCompiled(data);
  return {
    valid: !!valid,
    errors: validateBJsonCompiled.errors || []
  };
}

export function validateThemeJson(data) {
  const valid = validateThemeJsonCompiled(data);
  return {
    valid: !!valid,
    errors: validateThemeJsonCompiled.errors || []
  };
}

export function validateAppConfig(data) {
  const valid = validateAppConfigCompiled(data);
  return {
    valid: !!valid,
    errors: validateAppConfigCompiled.errors || []
  };
}
