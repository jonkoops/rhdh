import { createTranslationResource } from '@backstage/core-plugin-api/alpha';
import { searchTranslationRef } from '@backstage/plugin-search/alpha';

export const searchTranslations = createTranslationResource({
  ref: searchTranslationRef,
  translations: {
    en: () => import('./search-en'),
    de: () => import('./search-de'),
es: () => import('./search-es'),
    it: () => import('./search-it'),
  },
});
