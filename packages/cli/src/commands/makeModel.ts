import path from "path";
import inquirer from "inquirer";
import {
  writeFile,
  toPascalCase,
  toCamelCase,
  toPlural,
  parseFields,
  mapTypeToDrizzle,
  ensureDirectoryExists,
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

// --- Resource generation after model creation ---
export async function makeModel(
  name: string,
  fieldsString?: string
): Promise<void> {
  const modelName = toPascalCase(name);
  const tableName = toPlural(name.toLowerCase());

  let fields: FieldDefinition[] = parseFields(fieldsString);

  // If no fields provided, prompt for them
  if (fields.length === 0) {
    const { shouldAddFields } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldAddFields",
        message: "Would you like to add fields to the model?",
        default: true,
      },
    ]);

    if (shouldAddFields) {
      fields = await promptForFields();
    }
  }

  // Generate schema file
  const schemaContent = generateSchemaFile(modelName, tableName, fields);
  const schemaPath = path.join(
    process.cwd(),
    "server",
    "database",
    "schema",
    `${name.toLowerCase()}.ts`
  );
  await writeFile(schemaPath, schemaContent);

  // Update schema index file
  await updateSchemaIndex(name.toLowerCase(), modelName);

  // --- Resource generation after model creation ---
  const resourceName = toPascalCase(name);
  const resourceNamePlural = toPlural(name);
  const tableNameCamel = toCamelCase(toPlural(resourceName.toLowerCase()));
  // Create API directory structure
  const apiDir = path.join(
    process.cwd(),
    "server",
    "api",
    "v1",
    resourceNamePlural.toLowerCase()
  );
  await ensureDirectoryExists(apiDir);

  // --- Create validation folders and files ---
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
  await generateTableQuery(
    resourceName,
    tableNameCamel,
    modelName,
    fields,
    tableQueryPath
  );
}

async function promptForFields(): Promise<FieldDefinition[]> {
  const fields: FieldDefinition[] = [];

  while (true) {
    const { fieldName } = await inquirer.prompt([
      {
        type: "input",
        name: "fieldName",
        message: "Field name (or press Enter to finish):",
      },
    ]);

    if (!fieldName.trim()) break;

    const { fieldType, isRequired, isUnique } = await inquirer.prompt([
      {
        type: "list",
        name: "fieldType",
        message: "Field type:",
        choices: ["string", "number", "boolean", "date", "text", "json"],
      },
      {
        type: "confirm",
        name: "isRequired",
        message: "Is this field required?",
        default: false,
      },
      {
        type: "confirm",
        name: "isUnique",
        message: "Is this field unique?",
        default: false,
      },
    ]);

    fields.push({
      name: fieldName,
      type: fieldType,
      required: isRequired,
      unique: isUnique,
    });
  }

  return fields;
}

function generateSchemaFile(
  modelName: string,
  tableName: string,
  fields: FieldDefinition[]
): string {
  // Special case for User model
  if (modelName === 'User') {
    return `export const UserRoles = ['admin', 'user'] as const;
export type UserRole = typeof UserRoles[number];

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  email: text('email'),
  provider: text('provider'),
  role: text('role', { enum: UserRoles }).notNull().default('user'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
`;
  }

  const imports = ["sqliteTable", "text", "integer"];

  const fieldDefinitions = fields
    .map((field) => {
      const drizzleType = mapTypeToDrizzle(field.type);
      let fieldDef = `  ${field.name}: ${drizzleType}('${field.name}')`;
      const modifiers = [];
      if (field.required) modifiers.push("notNull()");
      if (field.unique) modifiers.push("unique()");
      if (modifiers.length > 0) {
        fieldDef += `.${modifiers.join(".")}`;
      }
      return fieldDef + ",";
    })
    .join("\n");

  // Remove SQL default fallback for createdAt and updatedAt
  return `import { ${imports.join(", ")} } from 'drizzle-orm/sqlite-core';\n
export const ${toCamelCase(
    tableName
  )} = sqliteTable('${tableName}', {\n  id: integer('id').primaryKey({ autoIncrement: true }),\n${fieldDefinitions}\n  createdAt: text('created_at')\n    .notNull(),\n  updatedAt: text('updated_at')\n    .notNull(),\n});\n\nexport type ${modelName} = typeof ${toCamelCase(
    tableName
  )}.$inferSelect;\nexport type New${modelName} = typeof ${toCamelCase(
    tableName
  )}.$inferInsert;\n`;
}

async function updateSchemaIndex(
  fileName: string,
  modelName: string
): Promise<void> {
  const indexPath = path.join(
    process.cwd(),
    "server",
    "database",
    "schema",
    "index.ts"
  );
  const tableName = toCamelCase(toPlural(fileName));
  const exportLine = `export { ${tableName}, type ${modelName}, type New${modelName} } from './${fileName}'`;
  try {
    const fs = await import("fs/promises");
    const existingContent = await fs.readFile(indexPath, "utf8");
    if (!existingContent.includes(exportLine)) {
      const updatedContent =
        existingContent.trimEnd() + "\n" + exportLine + "\n";
      await writeFile(indexPath, updatedContent);
    }
  } catch {
    await writeFile(indexPath, exportLine + "\n");
  }
}
