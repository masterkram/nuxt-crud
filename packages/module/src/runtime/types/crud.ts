export interface CrudCollectionConfig {
  visibleFields: string[]
  getValidationRules?: () => Record<string, unknown>
}

export interface CrudConfig {
  collections: string[]
  config: Record<string, CrudCollectionConfig>
}

declare module 'nuxt/schema' {
  interface AppConfigInput {
    crud?: CrudConfig
  }
}

declare module '@nuxt/schema' {
  interface AppConfigInput {
    crud?: CrudConfig
  }
}
