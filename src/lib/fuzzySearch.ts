/**
 * Utility functions for spell-tolerant / fuzzy searching.
 * Supports Damerau-Levenshtein distance, sliding window substring comparisons,
 * token-based scoring, and sorting by relevance.
 */

/**
 * Damerau-Levenshtein Distance calculation
 * Handles insertions, deletions, substitutions, and transpositions of adjacent characters.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const d: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i++) d[i][0] = i;
  for (let j = 0; j <= lenB; j++) d[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }

  return d[lenA][lenB];
}

/**
 * Normalizes text by lowercasing and trimming extra spaces.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Calculates a match score between a query token and a target text string.
 * Returns a score between 0 and 1 (0 means no match).
 */
export function getTokenFuzzyScore(qToken: string, targetText: string): number {
  const normTarget = normalizeText(targetText);
  if (!normTarget || !qToken) return 0;

  // 1. Exact substring match -> 1.0 (or 0.95 for inner match)
  if (normTarget.includes(qToken)) {
    if (normTarget.startsWith(qToken)) {
      return 1.0;
    }
    return 0.95;
  }

  // Also check without non-alphanumeric characters (punctuation/spaces)
  const cleanQToken = qToken.replace(/[^a-z0-9]/g, '');
  const cleanTarget = normTarget.replace(/[^a-z0-9]/g, '');
  if (cleanQToken && cleanTarget.includes(cleanQToken)) {
    return 0.9;
  }

  // 2. Short tokens (<= 2 chars) must be exact substring/prefix match
  if (qToken.length <= 2) {
    return 0;
  }

  // 3. For tokens >= 3 chars, perform fuzzy matching
  const maxDistance = qToken.length <= 4 ? 1 : qToken.length <= 8 ? 2 : 3;
  let bestScore = 0;

  // Test against individual target words
  const tWords = normTarget.split(/[\s\-_\/]+/).filter(Boolean);
  for (const tWord of tWords) {
    const cleanTWord = tWord.replace(/[^a-z0-9]/g, '');
    if (!cleanTWord) continue;

    const dist = damerauLevenshteinDistance(cleanQToken, cleanTWord);
    if (dist <= maxDistance) {
      const similarity = 1 - dist / Math.max(cleanQToken.length, cleanTWord.length);
      if (similarity >= 0.55) {
        const score = 0.5 + similarity * 0.4; // Range ~0.72 to 0.90
        if (score > bestScore) bestScore = score;
      }
    }
  }

  // Test sliding windows over clean target for multi-word or compound matches
  const len = cleanQToken.length;
  const windowSizes = [len - 1, len, len + 1].filter((w) => w >= 2);

  for (const wSize of windowSizes) {
    for (let i = 0; i <= cleanTarget.length - wSize; i++) {
      const windowStr = cleanTarget.substring(i, i + wSize);
      const dist = damerauLevenshteinDistance(cleanQToken, windowStr);
      if (dist <= maxDistance) {
        const similarity = 1 - dist / Math.max(cleanQToken.length, windowStr.length);
        if (similarity >= 0.55) {
          const score = 0.5 + similarity * 0.35;
          if (score > bestScore) bestScore = score;
        }
      }
    }
  }

  return bestScore;
}

/**
 * Checks if a target string or array of target strings matches a query, taking spellings/typos into account.
 * Returns a score between 0 and 1 (0 means no match).
 */
export function matchFuzzy(query: string, target: string | string[]): number {
  const normQuery = normalizeText(query);
  if (!normQuery) return 1.0;

  const targetArray = Array.isArray(target) ? target : [target];
  const combinedTarget = targetArray.join(' ');
  if (!normalizeText(combinedTarget)) return 0;

  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return 1.0;

  let totalScore = 0;

  for (const qToken of queryTokens) {
    let tokenBestScore = 0;
    for (const targetText of targetArray) {
      const score = getTokenFuzzyScore(qToken, targetText);
      if (score > tokenBestScore) {
        tokenBestScore = score;
      }
    }
    // If any token fails to match at all, query fails overall match
    if (tokenBestScore === 0) {
      return 0;
    }
    totalScore += tokenBestScore;
  }

  return totalScore / queryTokens.length;
}

/**
 * Helper to filter and sort an array of items based on fuzzy matching.
 */
export function fuzzySearchFilter<T>(
  items: T[],
  query: string,
  getTexts: (item: T) => string | string[],
  minScoreThreshold: number = 0.4
): T[] {
  if (!query || !query.trim()) {
    return items;
  }

  const scored = items
    .map((item) => {
      const texts = getTexts(item);
      const score = matchFuzzy(query, texts);
      return { item, score };
    })
    .filter((entry) => entry.score >= minScoreThreshold);

  // Sort by highest score first
  scored.sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.item);
}
