export type FrequentKeyword = {
  word: string;
  count: number;
};

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const ONLY_NUMBERS_PATTERN = /^\p{N}+$/u;
const particles = [
  "으로",
  "에서",
  "에게",
  "까지",
  "부터",
  "처럼",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "의",
  "와",
  "과",
  "도",
  "만",
  "로",
] as const;

const stopWords = new Set([
  "거기",
  "그거",
  "그것",
  "그냥",
  "그리고",
  "그래서",
  "그런",
  "그렇게",
  "나는",
  "내가",
  "대한",
  "되면",
  "되는",
  "뭔가",
  "위한",
  "위해",
  "이거",
  "이것",
  "이런",
  "이렇게",
  "있는",
  "없는",
  "저거",
  "저것",
  "저런",
  "저렇게",
  "정도",
  "조금",
  "하는",
  "하면",
  "해야",
]);

function characterLength(value: string): number {
  return Array.from(value).length;
}

function removeKoreanParticle(word: string): string {
  for (const particle of particles) {
    if (!word.endsWith(particle)) continue;
    const stem = word.slice(0, -particle.length);
    if (characterLength(stem) >= 2) return stem;
  }
  return word;
}

export function extractKeywords(content: string): string[] {
  const normalized = content.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const tokens = normalized.match(TOKEN_PATTERN) ?? [];
  const uniqueWords = new Set<string>();

  for (const token of tokens) {
    const word = removeKoreanParticle(token);
    if (
      characterLength(word) < 2 ||
      ONLY_NUMBERS_PATTERN.test(word) ||
      stopWords.has(word)
    ) {
      continue;
    }
    uniqueWords.add(word);
  }

  return [...uniqueWords];
}

export function rankFrequentKeywords(
  contents: string[],
  options: { limit?: number; minimumCount?: number } = {},
): FrequentKeyword[] {
  const { limit = 10, minimumCount = 2 } = options;
  const frequencies = new Map<string, number>();

  for (const content of contents) {
    for (const word of extractKeywords(content)) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
  }

  return [...frequencies.entries()]
    .filter(([, count]) => count >= minimumCount)
    .sort(
      ([leftWord, leftCount], [rightWord, rightCount]) =>
        rightCount - leftCount || leftWord.localeCompare(rightWord, "ko-KR"),
    )
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
