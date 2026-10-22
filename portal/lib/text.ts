/** Norwegian prose helpers, so numbers and lists in the copy follow the data. */

const WORDS = ["null", "én", "to", "tre", "fire", "fem", "seks", "sju", "åtte", "ni", "ti", "elleve", "tolv"];

/** A count as Norwegian prose writes it: in words up to twelve ("ni"), digits above. */
export const tallord = (n: number): string => WORDS[n] ?? String(n);

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Joins a list the Norwegian way: "a", "a og b", "a, b og c". */
export const joinOg = (items: string[]): string =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} og ${items.at(-1)}`;
