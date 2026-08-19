export function generateProjectKey(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstLetters = words.map((w) => w.charAt(0).toUpperCase());

  let key = firstLetters.join("");

  if (key.length < 2 && words.length > 0) {
    const firstWord = words[0].toUpperCase();
    key = firstWord.slice(0, 2);
  }

  key = key.slice(0, 6);

  return key || "PROJ";
}