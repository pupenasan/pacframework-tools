const fs = require('fs');
const path = require('path');

const dbfolder = '../platforms/tiaportal/example';
const jsonfolder = './json/';

const directoryPath = path.join(__dirname, dbfolder);
// console.log (directoryPath);
fs.readdir(directoryPath, (err, files) => {
  // handling error
  if (err) {
    return console.log(`Unable to scan directory: ${err}`);
  }
  files.forEach((file) => {
    // Do whatever you want to do with the file
    if (path.extname(file) === '.db') {
      const fileContent = fs.readFileSync(path.join(directoryPath, file), 'utf8');
      const filename = path.basename(file, '.db');
      const ar = fileContent.split('\n');
      let i = 0; let
        adr = 0;
      const jsonfile = {};
      do {
        row = ar[i];
        i++;
      } while (row.trim() !== 'STRUCT' && i < ar.length);
      while (ar[i].trim() !== 'END_STRUCT;' && i < ar.length) {
        row = ar[i].trim();
        const spl1 = row.split(':');
        const spl2 = spl1[1].split(';');
        const spl3 = spl2[1].split('//');
        const type = spl2[0].trim().replace(/"/g, '');
        jsonfile[spl1[0].trim()] = { type, descr: spl3[1].trim(), adr };
        i++;
        switch (type) {
          case 'DOVAR_HMI':
          case 'DIVAR_HMI':
            adr += 1; // in words
            break;
          case 'AOVAR_HMI':
          case 'AIVAR_HMI':
            adr += 4;
          default:
            break;
        }
      }
      const jsonFilePath = `${jsonfolder + filename}.json`;
      fs.writeFileSync(jsonFilePath, JSON.stringify(jsonfile));
      // console.log (JSON.stringify(jsonfile));
    }
  });
});
