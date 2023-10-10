// тільки для тестування
const fs = require('fs');
const ini = require('ini');// https://github.com/npm/ini#readme
const tiaparsetools = require('./tiaparsetools'); // модуль для конвертування змісту проекту TIA в Master Data
const exceltools = require('./exceltools');
//
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const masterdatatools = require('./masterdatatools');
const reptools = require('./reptools');
const tiacreatetools = require('./tiacreatetools');
const couchtools = require('./couchtools');

const cryptojs = require('crypto-js');
// https://github.com/brix/crypto-js
const tiasoucefiles = `${config.tiaparsetools.pathsource}/`;
const tiaresultfiles = `${config.tiaparsetools.pathresult}/`;

if (!fs.existsSync(config.tiaparsetools.pathresult)) {
  fs.mkdirSync(config.tiaparsetools.pathresult);
}
// скорочені назви функцій
const { logmsg } = masterdatatools;
const { writetolog } = masterdatatools;

async function test() {
  const plcmasterdata = tiaparsetools.tiaparseall();
  // testcfgtools();
  // test_tagsdif ();
  // test_tiacreatetools();
  process.env.COUCH_USER = 'admin';
  process.env.COUCH_PASS = 'Administrator';
  couchtools.opts.user = process.env.COUCH_USER;
  couchtools.opts.password = process.env.COUCH_PASS;
  await couchtools.doc_toCouchdb(plcmasterdata, 'tokmaktectwin', 'plcmasterdata');
}

function test_tiacreatetools() {
  let content = {};
  logmsg('-------------------- Створення програмних блоків для TIA');
  const cfgtagsfilemaster = `${tiaresultfiles}cfg_tags.json`;
  const cfgchsfilemaster = `${tiaresultfiles}cfg_chs.json`;
  const cfgactssfilemaster = `${tiaresultfiles}cfg_acts.json`;

  content = fs.readFileSync(cfgtagsfilemaster, 'utf8');
  const cfgtags = JSON.parse(content);
  content = fs.readFileSync(cfgchsfilemaster, 'utf8');
  const cfgchs = JSON.parse(content);
  content = fs.readFileSync(cfgactssfilemaster, 'utf8');
  const cfgacts = JSON.parse(content);

  /* tiacreatetools.create_vardb (cfgtags);
  tiacreatetools.create_varshmi (cfgtags);
  tiacreatetools.create_pstsdb (cfgchs);
  tiacreatetools.create_chdb (cfgchs);
  tiacreatetools.create_actrtrsdb (cfgacts);
  tiacreatetools.create_dbmodulesdb (cfgchs);
  tiacreatetools.create_plcmapsscl (cfgchs); */
  tiacreatetools.create_all(cfgchs, cfgtags, cfgacts);
  writetolog(1);
}

function test_tagsdif() {
  const plcfilemaster = `${tiaresultfiles}plc_tags.json`;
  const cfgfilemaster = `${tiaresultfiles}cfg_tags.json`;
  masterdatatools.opts.logfile = 'test_tagsdif.log';
  let content = fs.readFileSync(plcfilemaster, 'utf8');
  const plctags = JSON.parse(content);
  content = fs.readFileSync(cfgfilemaster, 'utf8');
  const cfgtags = JSON.parse(content);
  const difob = masterdatatools.tagsdif(plctags, cfgtags);
  fs.writeFileSync(`${config.exceltools.pathresult}/` + 'difob.json', JSON.stringify(difob), 'utf8');
  writetolog(1);
}

function testcfgtools() {
  exceltools.opts.logpath = 'log';
  exceltools.opts.logfile = 'exceltools.log';
  masterdatatools.opts.logfile = 'test.log';
  const cfgtags = test_getcfgtags_fromxls();
  const cfgacts = test_getcfacts(cfgtags);

  const cfgchs = {};
  const cfgchmap = test_chsmap_fromcfg(cfgchs, cfgtags);

  const filcfgtags = `${config.exceltools.pathresult}/` + 'cfg_tags.json';
  fs.writeFileSync(filcfgtags, JSON.stringify(cfgtags), 'utf8');
  logmsg(`Файл ${filcfgtags} записано`);

  const filcfgchs = `${config.exceltools.pathresult}/` + 'cfg_chs.json';
  fs.writeFileSync(filcfgchs, JSON.stringify(cfgchs), 'utf8');
  logmsg(`Файл ${filcfgchs} записано`);

  const filecfgacts = `${config.exceltools.pathresult}/` + 'cfg_acts.json';
  fs.writeFileSync(filecfgacts, JSON.stringify(cfgacts), 'utf8');
  logmsg(`Файл ${filecfgacts} записано`);

  const filecfgchmap = `${config.exceltools.pathresult}/` + 'cfg_chmap.json';
  fs.writeFileSync(filecfgchmap, JSON.stringify(cfgchmap), 'utf8');
  logmsg(`Файл ${filecfgchmap} записано`);

  reptools.opts.pathresultmd = config.reptools.pathresultmd;
  reptools.repacchscfg(cfgchs, cfgtags);
  logmsg('Звіт записано');

  reptools.opts.pathresultmd = `${config.reptools.pathresultmd}/acts`;
  reptools.repactuators(cfgacts);
  logmsg('Звіт записано');

  writetolog(1);
}

function test_chsmap_fromcfg(cfgchs, cfgtags) {
  const filexls = `${config.exceltools.pathsource}/${config.exceltools.pathxlsfile}`;
  const chstype = exceltools.getchtypes_fromxls(filexls);
  const cfgchmap = masterdatatools.chsmap_fromcfgfn(cfgchs, cfgtags, chstype);
  masterdatatools.iomaptoplcform(cfgchs);
  return (cfgchmap);
}

function testtiaparsetools() {

  // tiaparsetools.opts.logpath = 'log';
  // tiaparsetools.opts.logfile = 'tiaparsetools.log';
  // masterdatatools.opts.logfile = 'test.log';
  // for (optname in config.tiaparsetools.clsiddefault) {
  //  tiaparsetools.opts.clsiddefault[optname] = config.tiaparsetools.clsiddefault[optname]
  // }
  // let plchs = test_plc_tochs (); //якщо парсити
  // let plctags = test_vars_totags (); //якщо парсити

  // let plctags = JSON.parse (fs.readFileSync (tiaresultfiles + 'plc_tags.json','utf8')); //якщо з файлу
  // let plchs = JSON.parse (fs.readFileSync (tiaresultfiles + 'plc_chs.json','utf8')); //якщо з файлу
  // test_chsmap_fromplc (plchs, plctags);
  // let masteracts = test_plcacts_toacts ();
  // writetolog (1);
}

function test_getcfgtags_fromxls() {
  logmsg('-------------------- Отримання мастерданих про теги з Excel');
  filexls = `${config.exceltools.pathsource}/${config.exceltools.pathxlsfile}`;
  let cfgtags = {};
  cfgtags = exceltools.getcfgtags_fromxls(filexls);
  return cfgtags;
}

function test_getcfacts(cfgtags) {
  logmsg('-------------------- Отримання мастерданих про ВМ з Excel та мастерданих тегів');
  filexls = `${config.exceltools.pathsource}/${config.exceltools.pathxlsfile}`;
  const cfgacts_types = exceltools.getacttypes_fromxls(filexls);
  const cfgacts = masterdatatools.getactrtsinfo(cfgtags, cfgacts_types);
  return cfgacts;
}

function test_plcacts_toacts() {
  logmsg('-------------------- Отримання мастерданих з TIA про ВМ');
  filemaster = `${tiaresultfiles}plc_acts.json`;
  if (!fs.existsSync(filemaster)) {
    masteracts = {};
    logmsg("Створюємо новий об'єкт майстер-даних");
  } else {
    const content = fs.readFileSync(filemaster, 'utf8');
    masteracts = JSON.parse(content);
    logmsg('Майстер-дані отримано');
  }
  const acttypes = config.tiaparsetools.act_udtfiles.replace(/ /g, '').split(',');
  const listfiles = {
    udtfiles: [],
    xmlcfgfiles: config.tiaparsetools.act_xmlcfgfiles.replace(/ /g, '').split(','),
    xmlhmifiles: config.tiaparsetools.act_xmlhmifiles.replace(/ /g, '').split(','),
  };
  listfiles.udtfiles = [];
  for (acttype of acttypes) {
    listfiles.udtfiles.push(`${acttype}_STA`);
    listfiles.udtfiles.push(`${acttype}_CFG`);
    listfiles.udtfiles.push(`${acttype}_ALM`);
  }
  listfiles.udtfiles.push('ACTTR_CMD');
  listfiles.udtfiles.push('ACTTR_PRM');

  tiaparsetools.plcacts_toacts(masteracts, tiasoucefiles, listfiles);
  logmsg('plcacts_toacts оброблено');
  fs.writeFileSync(filemaster, JSON.stringify(masteracts), 'utf8');
  logmsg(`Файл ${filemaster} записано`);
  return (masteracts);
}

function test_vars_totags() {
  logmsg('-------------------- Отримання мастерданих з TIA про теги');
  filemaster = `${tiaresultfiles}plc_tags.json`;
  mastertags = {};

  /* if (!fs.existsSync(filemaster)) {
    mastertags = {};
    logmsg ("Створюємо новий об'єкт майстер-даних");
  } else {
    let content = fs.readFileSync (filemaster,'utf8');
    mastertags = JSON.parse (content);
    logmsg ('Майстер-дані отримано');
  } */

  const listfiles = {
    udtfiles: config.tiaparsetools.var_udtfiles.replace(/ /g, '').split(','),
    xmlcfgfiles: config.tiaparsetools.var_xmlcfgfiles.replace(/ /g, '').split(','),
    xmlhmifiles: config.tiaparsetools.var_xmlhmifiles.replace(/ /g, '').split(','),
  };
  tiaparsetools.plcvars_to_tags(mastertags, tiasoucefiles, listfiles);
  logmsg('plcvars_to_tags оброблено');
  fs.writeFileSync(filemaster, JSON.stringify(mastertags), 'utf8');
  logmsg(`Файл ${filemaster} записано`);
  return (mastertags);
}

function test_plc_tochs() {
  logmsg('-------------------- Отримання мастерданих з TIA про канали');
  filemaster = `${tiaresultfiles}plc_chs.json`;
  masterchs = {};

  /* if (!fs.existsSync(filemaster)) {
    masterchs = {};
    logmsg ("Створюємо новий об'єкт майстер-даних");
  } else {
    let content = fs.readFileSync (filemaster,'utf8');
    masterchs = JSON.parse (content);
    logmsg ('Майстер-дані отримано');
  } */

  if (!masterchs.iocfg) masterchs.iocfg = {};
  const listfiles = {
    udtfiles: config.tiaparsetools.ch_udtfiles.replace(/ /g, '').split(','),
    xmlcfgfiles: config.tiaparsetools.ch_xmlcfgfiles.replace(/ /g, '').split(','),
    xmlhmifiles: config.tiaparsetools.ch_xmlhmifiles.replace(/ /g, '').split(','),
  };

  tiaparsetools.PLCMAPS_to_chs(masterchs, `${tiasoucefiles}/PLCMAPS.scl`);

  masterchs.iocfg.aibias = 200;
  masterchs.iocfg.aobias = 200;
  masterchs.iocfg.dibias = 0;
  masterchs.iocfg.dobias = 0;
  tiaparsetools.plc_to_chs(masterchs, tiasoucefiles, listfiles);
  logmsg('plc_to_chs оброблено');
  fs.writeFileSync(filemaster, JSON.stringify(masterchs), 'utf8');
  logmsg(`Файл ${filemaster} записано`);
  return (masterchs);
}

function test_chsmap_fromplc(plchs, plctags) {
  logmsg('-------------------- Формування таблиці відображення тегів на канали');
  plctags_filemaster = `${tiaresultfiles}plc_tags_maps.json`;
  plchs_filemaster = `${tiaresultfiles}plc_chs_maps.json`;
  plchsmap_filemaster = `${tiaresultfiles}plc_chsmap.json`;
  const chsmap = masterdatatools.chsmap_fromplc(plchs, plctags);
  masterdatatools.iomapplcform_togenform(plchs);
  fs.writeFileSync(plctags_filemaster, JSON.stringify(plctags), 'utf8');
  fs.writeFileSync(plchs_filemaster, JSON.stringify(plchs), 'utf8');
  fs.writeFileSync(plchsmap_filemaster, JSON.stringify(chsmap), 'utf8');
  logmsg(`Файли ${plctags_filemaster} та ${plchs_filemaster} записано`);
}
