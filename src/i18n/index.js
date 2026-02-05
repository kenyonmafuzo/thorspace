import pt from "./pt";
import en from "./en";
import es from "./es";

const dictionaries = {
  pt,
  en,
  es,
};

export function getDictionary(lang) {
  return dictionaries[lang] || dictionaries.pt;
}
