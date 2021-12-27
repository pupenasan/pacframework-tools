const fs = require ('fs');
const ini = require('ini');//https://github.com/npm/ini#readme 
const tiaparsetools = require ('./tiaparsetools'); //модуль для конвертування змісту проекту TIA в Master Data
const exceltools = require ('./exceltools'); //
const config = ini.parse (fs.readFileSync('./config.ini', 'utf-8'));
const masterdatatools = require ('./masterdatatools');
const reptools = require ('./reptools');
const tiacreatetools = require ('./tiacreatetools');
const couchtools = require ('./couchtools'); 

console.log (process.argv[2])

switch (process.argv[2]) {
  case `tiaparseall`:
    tiaparseall();
    break;

  default:
    break;
}

async function tiaparseall() {
  let plcmasterdata = tiaparsetools.tiaparseall ();
  couchtools.opts.user = process.env.COUCH_USER;
  couchtools.opts.password = process.env.COUCH_PASS;
  await couchtools.doc_toCouchdb(plcmasterdata, 'tokmaktectwin', 'plcmasterdata');
}

module.exports = {
  tiaparseall
}