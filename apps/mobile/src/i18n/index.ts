/**
 * @see docs/12_다국어_v0.1.md
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import koCommon from './locales/ko/common.json';
import koHome from './locales/ko/home.json';
import koTodo from './locales/ko/todo.json';
import koInput from './locales/ko/input.json';
import koAuth from './locales/ko/auth.json';
import koMandalart from './locales/ko/mandalart.json';
import koSettings from './locales/ko/settings.json';

import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enTodo from './locales/en/todo.json';
import enInput from './locales/en/input.json';
import enAuth from './locales/en/auth.json';
import enMandalart from './locales/en/mandalart.json';
import enSettings from './locales/en/settings.json';

i18n.use(initReactI18next).init({
  resources: {
    ko: {
      common: koCommon,
      home: koHome,
      todo: koTodo,
      input: koInput,
      auth: koAuth,
      mandalart: koMandalart,
      settings: koSettings,
    },
    en: {
      common: enCommon,
      home: enHome,
      todo: enTodo,
      input: enInput,
      auth: enAuth,
      mandalart: enMandalart,
      settings: enSettings,
    },
  },
  lng: 'ko',
  fallbackLng: 'ko',
  ns: ['common', 'home', 'todo', 'input', 'auth', 'mandalart', 'settings'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
