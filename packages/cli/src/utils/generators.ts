import path from "path";
import {
  writeFile,
  type FieldDefinition,
} from "./fileUtils.js";

export async function generateIndexEndpoint(
  apiDir: string,
  resourceName: string,
  tableName: string
): Promise<void> {
  const lowerResourceName = resourceName.toLowerCase();
  const collectionName = `${resourceName}Collection`;
  const tableQueryFn = `handle${resourceName}TableQuery`;
  const content = `import { ${collectionName} } from './validation/response/${collectionName}';

export default baseEventHandler({
  handler: async (event) => {
    try {
      const query = getQuery(event) as Record<string, string | string[] | undefined>;
      const { data, totalItems: count } = await ${tableQueryFn}({ query });
      return {
        data,
        count
      };
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch ${lowerResourceName}s'
      });
    }
  },
  validateResponse: ${collectionName}
});`;

  await writeFile(path.join(apiDir, "index.get.ts"), content);
}

export async function generateGetByIdEndpoint(
  apiDir: string,
  resourceName: string,
  tableName: string
): Promise<void> {
  const content = `import { eq } from 'drizzle-orm';
import { useDB } from '~~/server/database';
import { ${tableName} } from '~~/server/database/schema';
import { ${resourceName}Resource } from './validation/response/${resourceName}Resource';

export default baseEventHandler({
  handler: async (event) => {
    const id = getRouterParam(event, 'id');
    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID parameter'
      });
    }
    try {
      const item = await useDB().select()
        .from(${tableName})
        .where(eq(${tableName}.id, Number(id)))
        .get();
      if (!item) {
        throw createError({
          statusCode: 404,
          statusMessage: '${resourceName} not found'
        });
      }
      return item;
    } catch (error) {
      if (error.statusCode) throw error;
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch ${resourceName.toLowerCase()}'
      });
    }
  },
  validateResponse: ${resourceName}Resource
});`;

  await writeFile(path.join(apiDir, "[id].get.ts"), content);
}

export async function generateCreateEndpoint(
  apiDir: string,
  resourceName: string,
  tableName: string
): Promise<void> {
  const content = `import { Create${resourceName}Request } from './validation/requests/Create${resourceName}Request'
import { ${resourceName}Resource } from './validation/response/${resourceName}Resource'
import { useDB } from '~~/server/database'
import { ${tableName} } from '~~/server/database/schema'

export default baseEventHandler({
  handler: async (event) => {
    const body = event.context.validatedBody
    try {
      const [created] = await useDB().insert(${tableName})
        .values({
          ...body
        })
        .returning()
      setResponseStatus(event, 201)
      return created
    }
    catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create ${resourceName.toLowerCase()}',
      })
    }
  },
  validateBody: Create${resourceName}Request,
  validateResponse: ${resourceName}Resource,
})
`;
  await writeFile(path.join(apiDir, "index.post.ts"), content);
}

export async function generateUpdateEndpoint(
  apiDir: string,
  resourceName: string,
  tableName: string
): Promise<void> {
  const content = `import { eq } from 'drizzle-orm'
import { Update${resourceName}Request } from './validation/requests/Update${resourceName}Request'
import { ${resourceName}Resource } from './validation/response/${resourceName}Resource'
import { useDB } from '~~/server/database'
import { ${tableName} } from '~~/server/database/schema'

export default baseEventHandler({
  handler: async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID parameter',
      })
    }
    const body = event.context.validatedBody
    try {
      const [updated] = await useDB().update(${tableName})
        .set(body)
        .where(eq(${tableName}.id, Number(id)))
        .returning()
      if (!updated) {
        throw createError({
          statusCode: 404,
          statusMessage: '${resourceName} not found',
        })
      }
      return updated
    }
    catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update ${resourceName.toLowerCase()}',
      })
    }
  },
  validateBody: Update${resourceName}Request,
  validateResponse: ${resourceName}Resource,
})
`;
  await writeFile(path.join(apiDir, "[id].patch.ts"), content);
}

export async function generateDeleteEndpoint(
  apiDir: string,
  resourceName: string,
  tableName: string
): Promise<void> {
  const content = `import { eq } from 'drizzle-orm';
import { useDB } from '~~/server/database';
import { ${tableName} } from '~~/server/database/schema';

export default baseEventHandler({
  handler: async (event) => {
    const id = getRouterParam(event, 'id');
    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID parameter'
      });
    }
    try {
      const [deleted] = await useDB().delete(${tableName})
        .where(eq(${tableName}.id, Number(id)))
        .returning();

      if (!deleted) {
        throw createError({
          statusCode: 404,
          statusMessage: '${resourceName} not found'
        });
      }
      
      setResponseStatus(event, 204);
      return null;
    } catch (error) {
      if (error.statusCode) throw error;
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete ${resourceName.toLowerCase()}'
      });
    }
  }
});`;

  await writeFile(path.join(apiDir, "[id].delete.ts"), content);
}

export async function generateTableQuery(
  resourceName: string,
  tableName: string,
  modelName: string,
  fields: FieldDefinition[],
  tableQueryPath: string
): Promise<void> {
  const lowerResourceName = resourceName.toLowerCase();

  // Generate search filters based on field types
  const searchFields = fields
    .filter((field) => field.type === "string" || field.type === "text")
    .map((field) => `like(tables.${tableName}.${field.name}, \`%\${search}%\`)`)
    .join(",\n            ");

  // Add default fields for search
  const defaultSearchFields = `like(tables.${tableName}.id, \`%\${search}%\`)`;
  const allSearchFields = searchFields
    ? `${searchFields},\n            ${defaultSearchFields}`
    : defaultSearchFields;

  const tableQueryContent = `import { useDB, tables } from '../database';
import { like, or, count, and, type SQL } from 'drizzle-orm';
import type { ${modelName} } from '../database/schema/${lowerResourceName}';

interface ${resourceName}TableQueryOptions {
  query: Record<string, string | string[] | undefined>;
}

export async function handle${resourceName}TableQuery({ query }: ${resourceName}TableQueryOptions) {
  const db = useDB();

  return useDrizzleTableQuery<${modelName}>({
    query,
    baseQuery: async () => {
      const search = query.search ? String(query.search).toLowerCase().trim() : '';
      
      if (search) {
        return await db.select().from(tables.${tableName}).where(
          or(
            ${allSearchFields}
          )
        );
      }
      
      return await db.select().from(tables.${tableName});
    },
    searchFilter: (search: string) => {
      return or(
        ${allSearchFields}
      );
    },
    customFilters: {
      // Add custom filters here based on your needs
      // Example:
      // status: (value: string) => {
      //   if (['active', 'inactive'].includes(value.toLowerCase())) {
      //     return like(tables.${tableName}.status, value);
      //   }
      //   return undefined;
      // },
    },
    countQuery: async (filters: SQL[]) => {
      if (filters.length > 0) {
        const result = await db.select({ count: count() }).from(tables.${tableName}).where(and(...filters));
        return result[0]?.count || 0;
      }
      
      const result = await db.select({ count: count() }).from(tables.${tableName});
      return result[0]?.count || 0;
    },
  });
}
`;

  // Write to the correct utils directory in the Nuxt server folder
  await writeFile(tableQueryPath, tableQueryContent);
}

