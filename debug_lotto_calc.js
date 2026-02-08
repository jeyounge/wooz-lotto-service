
const getExpectedRound = () => {
    const baseRound = 1100;
    const baseDate = new Date('2023-12-30T20:45:00+09:00'); // KST
    
    // Test with current time (User said it's Jan 31 2026, 21:50)
    // In strict ISO for Node:
    const now = new Date('2026-01-31T21:53:08+09:00'); 
    
    const diffMs = now - baseDate;
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    
    console.log('Base Date:', baseDate.toISOString());
    console.log('Now:', now.toISOString());
    console.log('Diff Weeks:', diffWeeks);
    console.log('Expected Round:', baseRound + diffWeeks);
};

getExpectedRound();
