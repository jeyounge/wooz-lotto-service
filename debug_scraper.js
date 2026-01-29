import axios from 'axios';
import fs from 'fs';

const url = 'https://data.soledot.com/lottowinnumberdetail/fo/1208/lottowinnumberdetailview.sd';

axios.get(url).then(res => {
    fs.writeFileSync('debug.html', res.data);
    console.log('Saved debug.html');
}).catch(err => console.error(err));
