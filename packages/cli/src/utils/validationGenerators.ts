import path from "path";
import {
  writeFile,
  ensureDirectoryExists,
  toCamelCase,
} from "./fileUtils.js";

export async function ensureGlobalValidationFile(): Promise<void> {
  const globalValidationDir = path.join(process.cwd(), "server", "database", "validation");
  await ensureDirectoryExists(globalValidationDir);
  const globalValidationFile = path.join(globalValidationDir, "index.ts");
  const globalValidationContent = `import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import * as tables from "../schema";
import z from "zod/v4";

export const getInsertSchema = (table: string) => {
  const config = useAppConfig();
  const { getValidationRules } = config.crud?.config?.[table];
  return createInsertSchema(
    tables[table as keyof typeof tables],
    getValidationRules()
  ).extend({
    createdAt: z.preprocess(
      (arg) => {
        if (typeof arg === "string" || arg instanceof Date)
          return new Date(arg).toISOString();
        return undefined;
      },
      z.string().default(() => new Date().toISOString())
    ),
    updatedAt: z.preprocess(
      (arg) => {
        if (typeof arg === "string" || arg instanceof Date)
          return new Date(arg).toISOString();
        return undefined;
      },
      z.string().default(() => new Date().toISOString())
    ),
  });
};

export const getUpdateSchema = (table: string) => {
  const config = useAppConfig();
  const { getValidationRules } = config.crud?.config?.[table];
  return createUpdateSchema(
    tables[table as keyof typeof tables],
    getValidationRules()
  ).omit({ id: true });
};
`;
  await writeFile(globalValidationFile, globalValidationContent);
}

export async function generateRequestValidationFiles(
  requestsDir: string,
  resourceName: string,
  resourceNamePlural: string
): Promise<void> {
  const createRequestFile = path.join(
    requestsDir,
    `Create${resourceName}Request.ts`
  );
  const updateRequestFile = path.join(
    requestsDir,
    `Update${resourceName}Request.ts`
  );
  const createRequestContent = `import { getInsertSchema } from '~~/server/database/validation';

const ${toCamelCase(
    resourceName
  )}InsertSchema = getInsertSchema('${resourceNamePlural.toLowerCase()}');

export const Create${resourceName}Request = ${toCamelCase(
    resourceName
  )}InsertSchema.extend({});

// export const Create${resourceName}Request = ${toCamelCase(
    resourceName
  )}InsertSchema.extend({
//       email: z.email().min(1, 'Email is required'),
// }).omit({
//   id: true,
// });
`;
  const updateRequestContent = `import { getUpdateSchema } from '~~/server/database/validation';

const ${toCamelCase(
    resourceName
  )}UpdateSchema = getUpdateSchema('${resourceNamePlural.toLowerCase()}');

export const Update${resourceName}Request = ${toCamelCase(
    resourceName
  )}UpdateSchema.extend({});

// export const Update${resourceName}Request = ${toCamelCase(
    resourceName
  )}InsertSchema.extend({
//       email: z.email().min(1, 'Email is required'),
// }).omit({
//   id: true,
// });
`;
  await writeFile(createRequestFile, createRequestContent);
  await writeFile(updateRequestFile, updateRequestContent);
}

export async function generateResponseValidationFiles(
  responseDir: string,
  resourceName: string,
  resourceNamePlural: string
): Promise<void> {
  const resourceFile = path.join(responseDir, `${resourceName}Resource.ts`);
  const collectionFile = path.join(responseDir, `${resourceName}Collection.ts`);
  const resourceContent = `import { createSelectSchema } from 'drizzle-zod';
import { ${resourceNamePlural.toLowerCase()} } from '~~/server/database/schema';

const baseSchema = createSelectSchema(${resourceNamePlural.toLowerCase()}, {
  // additional fields
});

export const ${resourceName}Resource = baseSchema.strict();
`;
  const collectionContent = `import { z } from 'zod/v4';
import { ${resourceName}Resource } from './${resourceName}Resource';

export const ${resourceName}Collection = z.object({
  data: z.array(${resourceName}Resource),
  count: z.number(),
}).strict();
`;
  await writeFile(resourceFile, resourceContent);
  await writeFile(collectionFile, collectionContent);
}

