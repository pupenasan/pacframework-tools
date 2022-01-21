const os = require('os');
const path = require ('path');
const fs = require ('fs');
global.userdir = path.normalize(os.homedir()+'/pacframeworktools');
global.inipath = path.normalize(os.homedir()+'/pacframeworktools/config.ini');

//створення папки користувача
if  (fs.existsSync(userdir) === false) {
  fs.mkdirSync (userdir);
  console.log ('Створив директорію в ' + userdir);  
}

const ini = require('ini');//https://github.com/npm/ini#readme 
if  (fs.existsSync(userdir + '/config.ini') === false) {
  //%Userprofile%
  inicontent = fs.readFileSync (__dirname+ '/config_sample.ini','utf8');
  inicontent = inicontent.replace (/%Userprofile%/g, path.normalize(os.homedir()));
  fs.writeFileSync ( userdir + '/config.ini', inicontent, 'utf8');
  console.log ('Створив директорії ' + userdir + ' файл config.ini, заповніть налаштування');
  process.exit ();
}
const config = ini.parse (fs.readFileSync(userdir + '/config.ini', 'utf-8'));

const tiaparsetools = require ('./tiaparsetools'); //модуль для конвертування змісту проекту TIA в Master Data
const exceltools = require ('./exceltools'); //
const masterdatatools = require ('./masterdatatools');
const reptools = require ('./reptools');
const tiacreatetools = require ('./tiacreatetools');
const couchtools = require ('./couchtools'); 
const ui2tools = require ('./ui2tools');

couchtools.opts.user = process.env.COUCH_USER;
couchtools.opts.password = process.env.COUCH_PASS;
let twinname = config.general.twinname;

switch (process.argv[2]) {
  case `tiaparseall`:
    tiaparseall();
    break;
  case 'updateui2':
    ui2tools.updateui2(twinname, false);//(twinname, true);
    break;
  default:
    console.log ('Немає такої утиліти')
    break;
}

//паристь усі файли з tia
async function tiaparseall() {
  let plcmasterdata = tiaparsetools.tiaparseall ();
  await couchtools.doc_toCouchdb(plcmasterdata, twinname, 'plcmasterdata');
}


module.exports = {
  tiaparseall
}