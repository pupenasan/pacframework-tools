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
const seuncreatetools = require ('./seuncreatetools');
const couchtools = require ('./couchtools'); 
const ui2tools = require ('./ui2tools');

//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;

couchtools.opts.user = process.env.COUCH_USER;
couchtools.opts.password = process.env.COUCH_PASS;
let twinname = config.general.twinname;

switch (process.argv[2]) {
  case 'getcfgfromxls':
    getcfgfromxls();
    break;
  case 'seuncreateall':
    seuncreateall();
    break;
  case 'tiacreateall':
    tiacreateall();
    break;
  case 'tiaparseall':
    tiaparseall();
    break;
  case 'updateui2':
    ui2tools.updateui2(twinname, false);//(twinname, true);
    break;
  case '':
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

//створює файли Unity_PRO по конфігураційним налаштуванням
function seuncreateall(){
  let cfg = getcfgfromxls();
  seuncreatetools.create_all (cfg.cfgchs, cfg.cfgtags, cfg.cfgacts)
} 

function tiacreateall (){
  tiacreatetools.opts.resultpath  = config.tiacreatetools.pathresult + '/';
  let cfg = getcfgfromxls();
  tiacreatetools.create_all(cfg.cfgchs, cfg.cfgtags, cfg.cfgacts);
 
  /*let content ={};
  logmsg ('-------------------- Створення програмних блоків для TIA'); 
  let cfgtagsfilemaster = tiaresultfiles + 'cfg_tags.json';
  let cfgchsfilemaster = tiaresultfiles + 'cfg_chs.json';
  let cfgactssfilemaster = tiaresultfiles + 'cfg_acts.json';

  content = fs.readFileSync (cfgtagsfilemaster,'utf8');
  let cfgtags = JSON.parse (content);
  content = fs.readFileSync (cfgchsfilemaster,'utf8');
  let cfgchs = JSON.parse (content);
  content = fs.readFileSync (cfgactssfilemaster,'utf8');
  let cfgacts = JSON.parse (content);

  tiacreatetools.create_all(cfgchs, cfgtags, cfgacts);
  writetolog (1);
  */
}

function getcfgfromxls () {
  exceltools.opts.logpath = 'log';
  exceltools.opts.logfile = 'exceltools.log';
  masterdatatools.opts.logfile = 'test.log';
  let cfgtags = getcfgtags_fromxls ();
  let cfgacts = getcfacts_fromxls(cfgtags);

  let cfgchs = {};
  let cfgchmap = chsmap_fromcfg (cfgchs, cfgtags);

  let filcfgtags = config.exceltools.pathresult + '/' + 'cfg_tags.json';
  fs.writeFileSync (filcfgtags, JSON.stringify (cfgtags), 'utf8');
  logmsg (`Файл ${filcfgtags} записано`); 

  let filcfgchs = config.exceltools.pathresult + '/' + 'cfg_chs.json';
  fs.writeFileSync (filcfgchs, JSON.stringify (cfgchs), 'utf8');
  logmsg (`Файл ${filcfgchs} записано`);
  
  let filecfgacts = config.exceltools.pathresult + '/' + 'cfg_acts.json';
  fs.writeFileSync (filecfgacts, JSON.stringify (cfgacts), 'utf8');
  logmsg (`Файл ${filecfgacts} записано`);
  
  let filecfgchmap = config.exceltools.pathresult + '/' + 'cfg_chmap.json';
  fs.writeFileSync (filecfgchmap, JSON.stringify (cfgchmap), 'utf8');
  logmsg (`Файл ${filecfgchmap} записано`);    
  
  reptools.opts.pathresultmd = config.reptools.pathresultmd;
  reptools.repacchscfg (cfgchs, cfgtags); 
  logmsg (`Звіт записано`);

  reptools.opts.pathresultmd = config.reptools.pathresultmd + '/acts';
  reptools.repactuators (cfgacts); 
  logmsg (`Звіт записано`);
  
  writetolog (1);
  return {cfgchs, cfgtags, cfgacts};
}

function getcfgtags_fromxls () {
  logmsg ('-------------------- Отримання мастерданих про теги з Excel'); 
  filexls = config.exceltools.pathsource + '/' + config.exceltools.pathxlsfile;
  let cfgtags = {};
  cfgtags = exceltools.getcfgtags_fromxls (filexls);
  return cfgtags   
}
function getcfacts_fromxls (cfgtags) {
  logmsg ('-------------------- Отримання мастерданих про ВМ з Excel та мастерданих тегів'); 
  filexls = config.exceltools.pathsource + '/' + config.exceltools.pathxlsfile;
  let cfgacts_types = exceltools.getacttypes_fromxls (filexls);
  let cfgacts = masterdatatools.getactrtsinfo (cfgtags, cfgacts_types)
  return  cfgacts  
}
function chsmap_fromcfg (cfgchs, cfgtags){
  let filexls = config.exceltools.pathsource + '/' + config.exceltools.pathxlsfile;
  let chstype = exceltools.getchtypes_fromxls(filexls);
  let cfgchmap = masterdatatools.chsmap_fromcfgfn (cfgchs, cfgtags, chstype);
  masterdatatools.iomaptoplcform (cfgchs);
  return (cfgchmap)
}

module.exports = {
  tiaparseall
}