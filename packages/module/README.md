# Nuxt CRUD

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

Nuxt CRUD automatically generates a complete GUI for your Drizzle ORM models with built-in Zod field validation, making database management effortless.

## Features

- 🚀 **Automatic GUI Generation** - Create, read, update, and delete interfaces generated from your Drizzle schemas
- 🔧 **Type-Safe** - Full TypeScript support with automatic type inference

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-crud
```

## Recommended Setup

We highly recommend installing [`nuxt-crud-cli`](https://www.npmjs.com/package/nuxt-crud-cli) alongside this module. The CLI tool allows you to:

- Bootstrap your database schema 
- Generate CRUD endpoints

```bash
npm install -g nuxt-crud-cli
```

## Basic Usage

After installation, Nuxt CRUD will automatically detect your Drizzle models and generate admin interfaces. Simply define your schema:

```typescript
// schemas/user.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  email: text('email'),
  createdAt: text('created_at')
    .notNull(),
  updatedAt: text('updated_at')
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

```

Navigate to `/admin` in your application to access the generated CRUD interface.

## Documentation

For detailed configuration options, advanced usage, and customization guides, visit our [documentation](https://nuxt-crud.dev).

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

That's it! You can now use Nuxt CRUD in your Nuxt app to manage your database with a beautiful, type-safe admin interface ✨

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-crud/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-crud

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-crud.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-crud

[license-src]: https://img.shields.io/npm/l/nuxt-crud.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-crud

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com