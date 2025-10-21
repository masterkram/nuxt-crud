import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import inquirer from "inquirer";
import fs from "fs/promises";
import {
  ensureDirectoryExists,
  toPascalCase,
  toPlural,
  toCamelCase,
  toSingular,
  type FieldDefinition,
} from "../utils/fileUtils.js";
import {
  generateIndexEndpoint,
  generateGetByIdEndpoint,
  generateCreateEndpoint,
  generateUpdateEndpoint,
  generateDeleteEndpoint,
  generateTableQuery,
} from "../utils/generators.js";
import {
  ensureGlobalValidationFile,
  generateRequestValidationFiles,
  generateResponseValidationFiles,
} from "../utils/validationGenerators.js";

const execAsync = promisify(exec);

interface TableInfo {
  tableName: string;
  tableVariable: string;
  schemaFile: string;
  fields: FieldDefinition[];
}

async function checkDrizzleConfig(): Promise<void> {
  const configPath = path.join(process.cwd(), "drizzle.config.ts");
  try {
    await fs.access(configPath);
  } catch {
    throw new Error(
      "drizzle.config.ts not found. Please create one before running pull."
    );
  }
}

async function runDrizzleKitPull(): Promise<void> {
  console.log("Running drizzle-kit pull...");
  try {
    const { stdout, stderr } = await execAsync("npx drizzle-kit pull");
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log("✅ Database introspection complete");
  } catch (error) {
    throw new Error(
      `Failed to run drizzle-kit pull: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function parseSchemaFiles(): Promise<TableInfo[]> {
  const schemaDir = path.join(process.cwd(), "server", "database", "schema");

  try {
    await fs.access(schemaDir);
  } catch {
    throw new Error(
      `Schema directory not found at ${schemaDir}. Please ensure drizzle-kit pull completed successfully.`
    );
  }

  const files = await fs.readdir(schemaDir);
  const schemaFiles = files.filter(
    (file) => file.endsWith(".ts") && file !== "index.ts"
  );

  const tables: TableInfo[] = [];

  for (const file of schemaFiles) {
    const filePath = path.join(schemaDir, file);
    const content = await fs.readFile(filePath, "utf8");

    // Extract table exports - pattern: export const tableName = sqliteTable(...)
    const tableRegex = /export\s+const\s+(\w+)\s+=\s+sqliteTable\s*\(\s*['"](\w+)['"]/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableVariable = match[1]; // e.g., 'users'
      const tableName = match[2]; // e.g., 'users'

      // Extract fields from the table definition
      const fields = extractFieldsFromSchema(content, tableVariable);

      tables.push({
        tableName,
        tableVariable,
        schemaFile: file,
        fields,
      });
    }
  }

  return tables;
}

function extractFieldsFromSchema(content: string, tableVariable: string): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  // Try to extract field definitions from the table schema
  // Pattern: fieldName: text('field_name') or fieldName: integer('field_name')
  const fieldRegex = /(\w+):\s*(text|integer|real|blob)\s*\(/g;
  let match;

  while ((match = fieldRegex.exec(content)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];

    // Skip standard fields
    if (fieldName === 'id' || fieldName === 'createdAt' || fieldName === 'updatedAt') {
      continue;
    }

    // Map drizzle types back to our field types
    let type = 'string';
    if (fieldType === 'integer') type = 'number';
    else if (fieldType === 'real') type = 'number';
    else if (fieldType === 'text') type = 'string';

    fields.push({
      name: fieldName,
      type,
      required: false,
      unique: false,
    });
  }

  return fields;
}

async function promptForTables(tables: TableInfo[]): Promise<TableInfo[]> {
  if (tables.length === 0) {
    throw new Error("No tables found in schema directory.");
  }

  const sortedTables = tables.sort((a, b) =>
    a.tableName.localeCompare(b.tableName)
  );

  const { selectedTables } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedTables",
      message: "Select tables to generate API routes for:",
      choices: sortedTables.map((table) => ({
        name: table.tableName,
        value: table.tableVariable,
      })),
    },
  ]);

  return sortedTables.filter((table) =>
    selectedTables.includes(table.tableVariable)
  );
}

async function checkExistingRoutes(
  tables: TableInfo[]
): Promise<{ newTables: TableInfo[]; skippedTables: string[] }> {
  const newTables: TableInfo[] = [];
  const skippedTables: string[] = [];

  for (const table of tables) {
    // Convert table name to plural for API route directory
    const resourceNamePlural = toPlural(toSingular(table.tableName));
    const apiDir = path.join(
      process.cwd(),
      "server",
      "api",
      "v1",
      resourceNamePlural.toLowerCase()
    );

    try {
      await fs.access(apiDir);
      skippedTables.push(table.tableName);
    } catch {
      newTables.push(table);
    }
  }

  return { newTables, skippedTables };
}

async function generateApiResourcesForTable(table: TableInfo): Promise<void> {
  const singularName = toSingular(table.tableName);
  const resourceName = toPascalCase(singularName);
  const resourceNamePlural = toPlural(singularName);
  const tableNameCamel = toCamelCase(table.tableVariable);

  // Create API directory structure
  const apiDir = path.join(
    process.cwd(),
    "server",
    "api",
    "v1",
    resourceNamePlural.toLowerCase()
  );
  await ensureDirectoryExists(apiDir);

  // Create validation folders
  const validationDir = path.join(apiDir, "validation");
  const requestsDir = path.join(validationDir, "requests");
  const responseDir = path.join(validationDir, "response");
  await ensureDirectoryExists(requestsDir);
  await ensureDirectoryExists(responseDir);

  // Ensure global validation file exists
  await ensureGlobalValidationFile();

  // Generate validation files
  await generateRequestValidationFiles(
    requestsDir,
    resourceName,
    resourceNamePlural
  );
  await generateResponseValidationFiles(
    responseDir,
    resourceName,
    resourceNamePlural
  );

  // Generate API endpoints
  await generateIndexEndpoint(apiDir, resourceName, tableNameCamel);
  await generateGetByIdEndpoint(apiDir, resourceName, tableNameCamel);
  await generateCreateEndpoint(apiDir, resourceName, tableNameCamel);
  await generateUpdateEndpoint(apiDir, resourceName, tableNameCamel);
  await generateDeleteEndpoint(apiDir, resourceName, tableNameCamel);

  // Generate table query file in server/utils
  const tableQueryPath = path.join(
    process.cwd(),
    "server",
    "utils",
    `${resourceNamePlural.toLowerCase()}TableQuery.ts`
  );
  const modelName = toPascalCase(singularName);
  await generateTableQuery(
    resourceName,
    tableNameCamel,
    modelName,
    table.fields,
    tableQueryPath
  );

  console.log(`✅ Generated API routes for ${table.tableName}`);
}

export async function pull(): Promise<void> {
  // 1. Check for drizzle.config.ts
  await checkDrizzleConfig();

  // 2. Run drizzle-kit pull
  await runDrizzleKitPull();

  // 3. Parse generated schema files
  const tables = await parseSchemaFiles();

  if (tables.length === 0) {
    console.log("No tables found to generate routes for.");
    return;
  }

  // 4. Prompt user for table selection
  const selectedTables = await promptForTables(tables);

  if (selectedTables.length === 0) {
    console.log("No tables selected.");
    return;
  }

  // 5. Check for existing API routes
  const { newTables, skippedTables } = await checkExistingRoutes(
    selectedTables
  );

  if (skippedTables.length > 0) {
    console.log(
      `\nSkipping tables with existing routes: ${skippedTables.join(", ")}`
    );
  }

  if (newTables.length === 0) {
    console.log("All selected tables already have API routes.");
    return;
  }

  // 6. Generate API resources for new tables
  console.log(`\nGenerating API routes for ${newTables.length} table(s)...\n`);
  for (const table of newTables) {
    await generateApiResourcesForTable(table);
  }
}

