import { useAppConfig } from '#imports'
import { tables } from '~~/server/database'
import type { CrudConfig } from '../../types/crud'

export const useCrud = () => {
  const config = useAppConfig() as { crud?: CrudConfig }

  const collections = Object.keys(tables ?? {}).filter(key =>
    config.crud?.collections?.includes(key),
  )

  function getVisibleFields(collection: string) {
    return (
      config.crud?.config?.[
        collection as keyof typeof config.crud.config
      ]?.visibleFields || []
    )
  }

  return {
    collections,
    getVisibleFields,
  }
}
