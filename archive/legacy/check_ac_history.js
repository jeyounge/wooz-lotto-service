import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

function checkAC() {
    console.log("Scanning history for Low AC values...");
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const history = JSON.parse(rawData);
    
    // Sort oldest first
    history.sort((a,b) => a.drwNo - b.drwNo);
    
    let acDistribution = {};
    let lowACRounds = [];

    history.forEach(round => {
        const numbers = round.numbers;
        
        // Calculate AC
        const diffs = new Set();
        for (let i = 0; i < numbers.length; i++) {
            for (let j = i + 1; j < numbers.length; j++) {
                diffs.add(Math.abs(numbers[i] - numbers[j]));
            }
        }
        const ac = diffs.size - 5;
        
        acDistribution[ac] = (acDistribution[ac] || 0) + 1;
        
        if (ac <= 4) {
            lowACRounds.push({
                round: round.drwNo,
                ac: ac,
                numbers: numbers
            });
        }
    });

    console.log("\n--- AC Value Distribution ---");
    Object.keys(acDistribution).sort((a,b)=>a-b).forEach(k => {
        console.log(`AC ${k}: ${acDistribution[k]} rounds`);
    });

    console.log("\n--- Extremely Low AC Rounds (AC <= 4) ---");
    if (lowACRounds.length === 0) {
        console.log("No rounds found with AC <= 4.");
    } else {
        lowACRounds.forEach(r => {
            console.log(`[Round ${r.round}] AC:${r.ac}, Numbers: [${r.numbers.join(', ')}]`);
        });
    }
    
    console.log("\n--- Explanation ---");
    console.log("AC = 0: All differences are 0 (Impossible in Lotto)");
    console.log("AC = 1: All differences are duplicates of just 6 values (e.g.Arithmetic Progression)");
    console.log("Consecutive numbers (e.g. 3,4) do NOT necessarily lower AC significantly if other numbers are spread out.");
}

checkAC();
