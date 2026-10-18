import { callServer } from './serverCall';

/**
 * The language the server uses for the messages it sends a person (errors, confirmations, printed documents).
 * The words on the screens themselves are the app's own and are not changed by this.
 */

const LANGUAGE = 'murzak_pos.api.language_api';

// Used when the server cannot be asked
export const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'sw', name: 'Kiswahili' },
];

export const getLanguages = async () => {
  const body = await callServer(`${LANGUAGE}.get_languages`, {}, { get: true, fallback: 'The languages could not be loaded.' });
  return { languages: body.data?.languages?.length ? body.data.languages : DEFAULT_LANGUAGES, current: body.data?.current || 'en' };
};

export const setLanguage = async (language) => {
  const body = await callServer(`${LANGUAGE}.set_language`, { language }, { fallback: 'The language could not be changed.' });
  return body.data?.current || language;
};
