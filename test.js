//https://sebhastian.com/nodejs-download-file/
const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');

const file = fs.createWriteStream("c:/temp/file.xlsx");
const request = https.get(`https://docs.google.com/spreadsheets/uc?export=download&id=1GvttNOH74X2o9y0fh_qxQCHhfdFszx7m`, function(response) {
   response.pipe(file);

   // after download completed close filestream
   file.on("finish", () => {
       file.close();
       console.log("Download Completed");
   });
});
/*https://docs.google.com/spreadsheets/d/1GvttNOH74X2o9y0fh_qxQCHhfdFszx7m/edit?usp=sharing&ouid=111751208742846482260&rtpof=true&sd=true*/

