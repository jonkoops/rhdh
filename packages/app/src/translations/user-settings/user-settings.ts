import { createTranslationResource } from '@backstage/core-plugin-api/alpha';
import { userSettingsTranslationRef } from '@backstage/plugin-user-settings/alpha';

export const userSettingsTranslations = createTranslationResource({
  ref: userSettingsTranslationRef,
  translations: {
    en: () => import('./user-settings-en'),
    fr: () => import('./user-settings-fr'),
  },
});
