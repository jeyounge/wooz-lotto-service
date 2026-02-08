
import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFetch(drwNo) {
    console.log(`[Test] Scraping Round ${drwNo} with Axios...`);
    
    // Direct URL check
    const detailUrl = `https://data.soledot.com/lottowinnumberdetail/fo/${drwNo}/lottowinnumberdetailview.sd`;
    
    try {
        console.log('Fetching:', detailUrl);
        const response = await axios.get(detailUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        const html = response.data;
        // console.log(html.substring(0, 200));

        const $ = cheerio.load(html);
        
        let date = '';
        $('th').each((i, el) => {
            if ($(el).text().includes('발표일')) {
                date = $(el).next().text().trim();
            }
        });
        
        console.log('Date Found:', date);
        
        const numbers = [];
        $('.circleNumber').each((i, el) => {
            numbers.push(parseInt($(el).text().trim()));
        });
        
        console.log('Numbers Found:', numbers);
        
        if (numbers.length === 0) {
            console.log('FAIL: No numbers found. (Round might not be uploaded yet)');
            // Check if page contains "Error" or "Not Found" text
            if ($('body').text().includes('error') || $('body').html().length < 500) {
                 console.log('Page content seems invalid/empty.');
            }
        } else {
            console.log('SUCCESS: Data extracted.');
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
        }
    }
}

testFetch(1209);
