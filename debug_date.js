
const baseRound = 1100;
const baseDate = new Date('2023-12-30T20:45:00+09:00'); // KST
const now = new Date(); // This will use system time (2026-01-28)

const diffMs = now - baseDate;
const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
const expected = baseRound + diffWeeks;

console.log('Base Date:', baseDate.toISOString());
console.log('Current Date:', now.toISOString());
console.log('Diff Weeks:', diffWeeks);
console.log('Expected Round:', expected);

// Check if 1207 < expected
console.log('Check Needed? 1207 <', expected, ':', 1207 < expected);
