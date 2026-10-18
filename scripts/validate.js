import fs from 'fs';
import path from 'path';
import { getRootDir, loadAppConfig } from '../api/config.js';
import { validateBJson } from '../api/services/validator.js';

export function validateAll() {
  const rootDir = getRootDir();
  console.log('Running validation across business folders and configurations...');

  const config = loadAppConfig(true);
  console.log(`Global config valid. Base URL: ${config.publicBaseUrl}${config.businessRoutePrefix}/`);

  const bDir = path.join(rootDir, 'b');
  if (!fs.existsSync(bDir)) {
    console.log('No /b/ directory found yet. Nothing to validate.');
    return true;
  }

  const entries = fs.readdirSync(bDir, { withFileTypes: true });
  let hasErrors = false;
  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const businessFolder = path.join(bDir, id);
    count++;

    console.log(`Checking business: ${id}`);

    // Check required files
    const requiredFiles = ['index.html', 'style.css', 'script.js', 'b.json'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(businessFolder, file))) {
        console.error(`  [FAIL] Missing required file: ${file} in ${businessFolder}`);
        hasErrors = true;
      }
    }

    // Check b.json schema
    const bJsonPath = path.join(businessFolder, 'b.json');
    if (fs.existsSync(bJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(bJsonPath, 'utf-8'));
        if (data.id !== id) {
          console.error(`  [FAIL] ID mismatch in b.json: expected "${id}", found "${data.id}"`);
          hasErrors = true;
        }
        const val = validateBJson(data);
        if (!val.valid) {
          console.error(`  [FAIL] Schema validation errors in ${bJsonPath}:`, val.errors);
          hasErrors = true;
        }

        // Check asset references if any
        if (data.branding && data.branding.logo) {
          const logoPath = path.join(businessFolder, data.branding.logo);
          if (!fs.existsSync(logoPath)) {
            console.warn(`  [WARN] Referenced logo does not exist on disk: ${logoPath}`);
          }
        }
      } catch (err) {
        console.error(`  [FAIL] JSON parse error in ${bJsonPath}:`, err.message);
        hasErrors = true;
      }
    }
  }

  console.log(`Validated ${count} business folder(s).`);
  if (hasErrors) {
    console.error('Validation failed with errors.');
    process.exit(1);
  } else {
    console.log('All validations passed successfully.');
    return true;
  }
}

if (process.argv[1] && process.argv[1].endsWith('validate.js')) {
  validateAll();
}
