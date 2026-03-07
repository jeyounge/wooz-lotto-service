// Using node-fetch or similar
import fetch from 'node-fetch';

async function fetchRound(drwNo) {
    const url = `https://data.soledot.com/lottowinnumberdetail/fo/${drwNo}/lottowinnumberdetailview.sd`;
    const response = await fetch(url);
    const htmlText = await response.text();
    const bonusMatch = htmlText.match(/class="circleNumber[^>]*>(\d+)<\/span>/g);
    if (bonusMatch && bonusMatch.length >= 7) {
        const bonus = bonusMatch[6].replace(/[^0-9]/g, '');
        console.log(`Round ${drwNo} bonus:`, bonus);

        const nums = bonusMatch.slice(0, 6).map(b => b.replace(/[^0-9]/g, ''));
        console.log(`Round ${drwNo} nums:`, nums.join(', '));
    } else {
        console.log(`Round ${drwNo} not found or parsing failed.`);
    }
}

fetchRound(1212);
fetchRound(1213);
