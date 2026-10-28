export function countTextUnits(text) {
  const value = String(text || '');
  const words = value.match(/[\p{Script=Latin}\p{N}]+(?:[’'-][\p{Script=Latin}\p{N}]+)*/gu) || [];
  const latinLetters = value.match(/\p{Script=Latin}/gu) || [];
  const cjkChars = value.match(/\p{Script=Han}/gu) || [];
  const charsNoSpace = value.match(/\S/gu) || [];
  return {
    words: words.length,
    letters: latinLetters.length,
    cjkChars: cjkChars.length,
    charsNoSpace: charsNoSpace.length,
    chars: Array.from(value).length,
  };
}

