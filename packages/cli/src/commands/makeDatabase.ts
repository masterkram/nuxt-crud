import { promises as fs } from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'server', 'database', 'index.ts')
const DRIZZLE_CONFIG_PATH = path.join(process.cwd(), 'drizzle.config.ts')

const TEMPLATE = `import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const tables = schema;

/**
 * Returns a Drizzle instance.
 *
 * @returns {ReturnType<typeof drizzle<typeof schema>>} The Drizzle instance.
 */
export function useDB(): ReturnType<typeof drizzle<typeof schema>> {
  return drizzle(hubDatabase(), { schema });
}
`

const DRIZZLE_CONFIG_TEMPLATE = `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: "sqlite",
  schema: "./server/database/schema/index.ts",
  migrations:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          prefix: "timestamp",
          table: "__drizzle_migrations__",
          schema: "public",
        },
  dbCredentials: {
    url:
      process.env.NODE_ENV === "production"
        ? undefined
        : "file:./server/database/db.sqlite",
  },
});

`

export async function makeDatabase(): Promise<void> {
  try {
    // Create database index file
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
    await fs.writeFile(DB_PATH, TEMPLATE, 'utf-8')
    console.log('Drizzle ORM database initialized at', DB_PATH)
    
    // Create drizzle config file
    await fs.writeFile(DRIZZLE_CONFIG_PATH, DRIZZLE_CONFIG_TEMPLATE, 'utf-8')
    console.log('Drizzle config created at', DRIZZLE_CONFIG_PATH)
  } catch (err) {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  }
}

export default {
  command: 'make:database',
  describe: 'Create Drizzle ORM database file',
  handler: async () => {
    await makeDatabase()
  }
}
