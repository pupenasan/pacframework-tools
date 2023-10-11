const os = require('os');
const path = require('path');
const fs = require('fs');
const lodash = require('lodash');
const child_process = require('child_process');
const ini = require('ini'); // https://github.com/npm/ini#readme
const pjson = require('./package.json');

global.userdir = path.normalize(`${os.homedir()}/pacframeworktools`);
global.inipath = path.normalize(`${os.homedir()}/pacframeworktools/config.ini`);

// створення папки користувача
if (fs.existsSync(userdir) === false) {
  fs.mkdirSync(userdir);
  console.log(`Створив директорію в ${userdir}`);
}

if (fs.existsSync(`${userdir}/config.ini`) === false) {
  // %Userprofile%
  inicontent = fs.readFileSync(`${__dirname}/config_sample.ini`, 'utf8');
  inicontent = inicontent.replace(
    /%Userprofile%/g,
    path.normalize(os.homedir()),
  );
  fs.writeFileSync(`${userdir}/config.ini`, inicontent, 'utf8');
  console.log(
    `Створив директорії ${userdir} файл config.ini, заповніть налаштування`,
  );
  process.exit();
}
const config = ini.parse(fs.readFileSync(`${userdir}/config.ini`, 'utf-8'));
const { logmsgar, writetologar } = require('./common/masterdatatools');

const masterdatatools = require('./common/masterdatatools');

const { msgar } = masterdatatools;
const exceltools = require('./common/exceltools'); //
const tiaparsetools = require('./siemens/tiaparsetools'); // модуль для конвертування змісту проекту TIA в Master Data
const seunparsetools = require('./seunity/seunparsetools'); // модуль для конвертування змісту проекту UnityPRO в Master Data

const reptools = require('./reporttools/reptools');
const tiacreatetools = require('./siemens/tiacreatetools');
const seuncreatetools = require('./seunity/seuncreatetools');
const couchtools = require('./dbtools/couchtools');
const ui2tools = require('./webuitools/ui2tools');
const wincctoos = require('./siemens/wincctools');
const citecttools = require('./citect/citecttools.js');

// скорочені назви функцій
const { logmsg } = masterdatatools;
const { writetolog } = masterdatatools;
let cfgopts;

couchtools.opts.user = process.env.COUCH_USER;
couchtools.opts.password = process.env.COUCH_PASS;
const { twinname } = config.general;
let seunplcscfg;

const help = ` PACFramework Tools V${pjson.version}, author: Oleksandr Pupena
команди:
  getcfgfromxls - перетворення даних з Excel в JSON
  seuncreateall - cтворення усіх файлів для імпорту в Uity PRO/Cotrol Expert з майстерданих формату Excel 
  seuncreatechs - створення файлів для імпорту каналів та карти I/O в Uity PRO/Cotrol Expert з майстерданих формату Excel
  seuncreatevars - створення файлів для імпорту технологічних змінних в Uity PRO/Cotrol Expert з майстерданих формату Excel
  seuncreateacts - створення файлів для імпорту ВМ в Uity PRO/Cotrol Expert з майстерданих формату Excel 
  seunparseall - створення файлів JSON Masterdata з файлу експорту *.xef
  tiacreateall - створення усіх файлів для імпорту в TIA portal з майстерданих формату Excel 
  tiaparseall - отримання майстерданих (проектних даних) з TIA portal та перетворення їх в JSON з оновленням в CouchDB
  updateui2 - створення наповнення графічного інтерфейсу для PACFramework IoT Gateway 
  wincccreatealm - створення списку тривог в форматі CSV для WinCC Prof
  citectcreateeqip <plcname> - створення всього обладнання з експортного варіанту Unity для вказаного ПЛК
  citectcreatevareqip <plcname> - створення обладнання змінних з експортного варіанту Unity для вказаного ПЛК
  citectcreatemoduleeqip <plcname> - створення обладнання системних змінних та LVL0 з експортного варіанту Unity для вказаного ПЛК
  citectcreateacteqip <plcname> - створення обладнання ВМ з експортного варіанту Unity для вказаного ПЛК
  citectcreatehmi <plcname> - створення джинів для всього обладнання каркасу
  citectcreatevarhmi <plcname> - створення джинів налагодження для технологічних змінних
  citectcreateplcmaphmi <plcname> - створення джинів налагодження для карти ПЛК
  citectcreateacthmi <plcname> - створення джинів налагодження для ВМ`;

switch (process.argv[2]) {
  case '-help':
  case '-?':
  case 'help':
  case '?':
    console.log(help);
    break;
  case 'getcfgfromxls':
    getcfgfromxls();
    break;
  case 'seuncreateall':
    seuncreate('all');
    break;
  case 'seuncreatechs':
    seuncreate('chs');
    break;
  case 'seuncreatevars':
    seuncreate('vars');
    break;
  case 'seuncreateacts':
    seuncreate('acts');
    break;
  case 'seunparseall':
    seunparseall();
    break;
  case 'tiacreateall':
    tiacreateall();
    break;
  case 'tiaparseall':
    tiaparseall();
    break;
  case 'updateui2':
    ui2tools.updateui2(twinname, false); // (twinname, true);
    break;
  case 'wincccreatealm':
    mastertags_to_almlist();
    masteracts_to_almlist();
    break;
  case 'citectcreateeqip':

  case 'citectcreatevareqip':

  case 'citectcreatemoduleeqip':

  case 'citectcreateacteqip':
    citectcreateeqip();
    break;
  case 'citectcreatehmi':

  case 'citectcreatevarhmi':

  case 'citectcreateplcmaphmi':

  case 'citectcreateacthmi':
    citectcreatehmi();
    break;
  case '':
    console.log(help);
    break;
  case undefined:
    console.log('Робоча директорія вже була проініціалізована до цього!');
    break;
  default:
    console.log('Немає такої утиліти');
    console.log(help);
    break;
}

function zeftoxef(zefpath, filename) {
  const fullpath = `${zefpath}\\${filename}.zef`;
  console.log(`Розпаковую файл ${fullpath}`);
  const paras = ['-xf', fullpath, '-C', config.citecttools.plcsourcepath, '*.xef'];
  // tar -xf C:\Users\OleksandrPupena\pacframeworktools\source\plc_f1.zef -C C:\Users\OleksandrPupena\pacframeworktools\source *.xef
  // https://renenyffenegger.ch/notes/Windows/dirs/Windows/System32/tar_exe
  const out = child_process.spawnSync('tar.exe', paras, { stdio: ['pipe', 'pipe', process.stderr] });
  fs.renameSync(`${zefpath}\\` + 'unitpro.xef', `${zefpath}\\${filename}.xef`);
}
function citectcreateeqip() {
  if (!config.citecttools) {
    console.log('Не знайдений розділ конфігурації Citect');
    return;
  }
  const plcname = process.argv[3];
  let plcnames = [];
  if (plcname) {
    if (config.citecttools[plcname] && config.citecttools[plcname].xeffile || config.citecttools[plcname].zeffile) {
      if (config.citecttools[plcname].zeffile) {
        zeftoxef(config.citecttools.plcsourcepath, config.citecttools[plcname].zeffile);
      }
      config.citecttools[plcname].xeffile = config.citecttools[plcname].zeffile;
      plcnames = [plcname];
    } else {
      console.log(`Не знайдений розділ конфігурації Citect для ${plcname} або відсутній для нього параметр xeffile`);
      return;
    }
  } else {
    for (const plcname in config.citecttools) {
      if (config.citecttools[plcname] && config.citecttools[plcname].xeffile || config.citecttools[plcname].zeffile) {
        if (config.citecttools[plcname].zeffile) {
          zeftoxef(config.citecttools.plcsourcepath, config.citecttools[plcname].zeffile);
        }
        config.citecttools[plcname].xeffile = config.citecttools[plcname].zeffile;
        plcnames.push(plcname);
      }
    }
  }
  seunparsetools.opts.pathsource = config.citecttools.plcsourcepath;
  for (const plcname of plcnames) {
    const { xeffile } = config.citecttools[plcname];
    logmsg(`Починаю парсити ${xeffile} ...`);
    seunparsetools.opts.xeffile = xeffile;
    seunparsetools.xefparseall();
    switch (process.argv[2]) {
      case 'citectcreateeqip':
        citecttools.create_equipment(plcname);
        break;
      case 'citectcreatevareqip':
        citecttools.create_varequipment(plcname);
        break;
      case 'citectcreatemoduleeqip':
        citecttools.create_modulequipment(plcname);
        break;
      case 'citectcreateacteqip':
        citecttools.create_actequipment(plcname);
        break;
    }
  }
}

function citectcreatehmi() {
  if (!config.citecttools) {
    console.log('Не знайдений розділ конфігурації Citect');
    return;
  }
  const plcname = process.argv[3];
  let plcnames = [];
  if (plcname) {
    if (config.citecttools[plcname] && config.citecttools[plcname].xeffile) {
      plcnames = [plcname];
    } else {
      console.log(`Не знайдений розділ конфігурації Citect для ${plcname} або відсутній для нього параметр xeffile`);
      return;
    }
  } else {
    for (const plcname in config.citecttools) {
      if (config.citecttools[plcname] && config.citecttools[plcname].xeffile || config.citecttools[plcname].zeffile) {
        console.log(plcname);
        plcnames.push(plcname);
      }
    }
  }
  seunparsetools.opts.pathsource = config.citecttools.plcsourcepath;
  for (const plcname of plcnames) {
    const xeffile = config.citecttools[plcname].xeffile || config.citecttools[plcname].zeffile;
    logmsg(`Починаю парсити ${xeffile} ...`);
    seunparsetools.opts.xeffile = xeffile;
    seunparsetools.xefparseall();
    switch (process.argv[2]) {
      case 'citectcreatehmi':
        citecttools.create_hmi(plcname);
        break;
      case 'citectcreatevarhmi':
        citecttools.create_varpages(plcname, true);
        break;
      case 'citectcreateplcmaphmi':
        citecttools.create_mappages(plcname, true);
        break;
      case 'citectcreateacthmi':
        citecttools.create_actpages(plcname, true);
        break;
    }
  }
}

// паристь усі файли з tia
async function tiaparseall() {
  const plcmasterdata = tiaparsetools.tiaparseall();
  await couchtools.doc_toCouchdb(plcmasterdata, twinname, 'plcmasterdata');
}

// парсить усі файли з Unity PRO
async function seunparseall() {
  const plcmasterdata = seunparsetools.xefparseall();
}

// створює файли Unity_PRO по конфігураційним налаштуванням
function seuncreate(opts = 'all') {
  const cfg = getcfgfromxls();
  switch (opts) {
    case 'chs':
      seuncreatetools.create_chs(cfg.cfgchs);
      break;
    case 'vars':
      seuncreatetools.create_vars(cfg.cfgtags);
      break;
    case 'acts':
      seuncreatetools.create_actrtrs(cfg.cfgacts);
      break;
    case 'all':
    default:
      seuncreatetools.create_all(cfg.cfgchs, cfg.cfgtags, cfg.cfgacts);
  }
}

function tiacreateall() {
  tiacreatetools.opts.resultpath = `${config.tiacreatetools.pathresult}/`;
  const cfg = getcfgfromxls();
  tiacreatetools.create_all(cfg.cfgchs, cfg.cfgtags, cfg.cfgacts);

  /* let content ={};
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

function getcfgfromxls() {
  // exceltools.opts.logpath = "log";
  // exceltools.opts.logfile = "exceltools.log";
  const msgarloc = msgar;
  masterdatatools.msgar = msgarloc;
  // exceltools.msgar = msgarloc;
  // masterdatatools.opts.logfile = "test.log";
  const cfgtags = getcfgtags_fromxls();
  const cfgacts = getcfacts_fromxls(cfgtags);
  const cfgchs = {};
  const cfgchmap = chsmap_fromcfg(cfgchs, cfgtags);
  // msgarloc = JSON.parse (JSON.stringify(exceltools.msgar));
  // розміщення додактових опцій по розділам
  for (sectionname in cfgopts) {
    let section;
    switch (sectionname) {
      case 'tags':
        section = cfgtags;
        break;
      case 'chs':
        section = cfgchs;
        break;
      case 'acts':
        section = cfgacts;
        break;
      default:
        logmsgar(`WRN: Секція ${sectionname} вказана в додактових опціях Excel "other" не має цільоввого призначення`, 1, 'getcfgfromxls', 'WRN', msgarloc);
        break;
    }
    if (section) {
      lodash.merge(section, cfgopts[sectionname]); // злиття 2-х обєктів
    }
  }

  // створення папки результату, якщо її немає
  if (fs.existsSync(config.exceltools.pathresult) === false) {
    fs.mkdirSync(config.exceltools.pathresult);
    console.log(`Створив директорію ${config.exceltools.pathresult}`);
  }

  const filcfgtags = `${config.exceltools.pathresult}/` + 'cfg_tags.json';
  fs.writeFileSync(filcfgtags, JSON.stringify(cfgtags), 'utf8');
  // logmsg(`Файл ${filcfgtags} записано`);
  logmsgar(`Файл ${filcfgtags} записано`, 1, 'getcfgfromxls', 'MSG', msgarloc);

  const filcfgchs = `${config.exceltools.pathresult}/` + 'cfg_chs.json';
  fs.writeFileSync(filcfgchs, JSON.stringify(cfgchs), 'utf8');
  // logmsg(`Файл ${filcfgchs} записано`);
  logmsgar(`Файл ${filcfgchs} записано`, 1, 'getcfgfromxls', 'MSG', msgarloc);

  const filecfgacts = `${config.exceltools.pathresult}/` + 'cfg_acts.json';
  fs.writeFileSync(filecfgacts, JSON.stringify(cfgacts), 'utf8');
  // logmsg(`Файл ${filecfgacts} записано`);
  logmsgar(`Файл ${filecfgacts} записано`, 1, 'getcfgfromxls', 'MSG', msgarloc);

  const filecfgchmap = `${config.exceltools.pathresult}/` + 'cfg_chmap.json';
  fs.writeFileSync(filecfgchmap, JSON.stringify(cfgchmap), 'utf8');
  // logmsg(`Файл ${filecfgchmap} записано`);
  logmsgar(`Файл ${filecfgchmap} записано`, 1, 'getcfgfromxls', 'MSG', msgarloc);

  reptools.opts.pathresultmd = config.reptools.pathresultmd;
  reptools.repacchscfg(cfgchs, cfgtags);
  // logmsg(`Звіт записано`);
  logmsgar('Звіт про канали записано', 1, 'getcfgfromxls', 'MSG', msgarloc);

  reptools.opts.pathresultmd = `${config.reptools.pathresultmd}/acts`;
  reptools.repactuators(cfgacts);
  logmsgar('Звіт про ВМ записано', 1, 'getcfgfromxls', 'MSG', msgarloc);

  // writetolog(1);
  writetologar(msgarloc, `${config.exceltools.pathlog}\\` + 'fromexcel');
  return { cfgchs, cfgtags, cfgacts };
}

function getcfgtags_fromxls() {
  logmsg('-------------------- Отримання мастерданих про теги з Excel');
  filexls = `${config.exceltools.pathsource}/${config.exceltools.pathxlsfile}`;
  let cfgtags = {};
  cfgtags = exceltools.getcfgtags_fromxls(filexls);
  cfgopts = exceltools.getothercfg_fromxls(filexls);
  return cfgtags;
}
function getcfacts_fromxls(cfgtags) {
  logmsg(
    '-------------------- Отримання мастерданих про ВМ з Excel та мастерданих тегів',
  );
  filexls = `${config.exceltools.pathsource}/${config.exceltools.pathxlsfile}`;
  const cfgacts_types = exceltools.getacttypes_fromxls(filexls);
  const cfgacts = masterdatatools.getactrtsinfo(cfgtags, cfgacts_types);
  return cfgacts;
}
function chsmap_fromcfg(cfgchs, cfgtags) {
  const filexls = `${config.exceltools.pathsource}/${config.exceltools.pathxlsfile}`;
  const chstype = exceltools.getchtypes_fromxls(filexls);
  const cfgchmap = masterdatatools.chsmap_fromcfgfn(cfgchs, cfgtags, chstype);
  masterdatatools.iomaptoplcform(cfgchs);
  return cfgchmap;
}

function mastertags_to_almlist() {
  const path1 = `${config.tiaparsetools.pathresult}\\`; // "./exampledata/";
  // отримання мастерданих про теги
  const filemaster = `${path1}plc_tags.json`;
  if (fs.existsSync(filemaster)) {
    const content = fs.readFileSync(filemaster, 'utf8');
    mastertags = JSON.parse(content);
    const almlist = wincctoos.mastertags_to_almlist(mastertags.tags);
    const BOM = '\uFEFF';
    const csvContent = BOM + almlist; // для кирилиці
    fs.writeFileSync(`${path1}wincc_almtags.csv`, csvContent, {
      codepage: 1251,
    });
    console.log(
      `Список тривог для тегів створено в ${path1}wincc_almtags.csv`,
    );
  } else {
    console.log('Не вдалося створити файл wincc_almtags.csv');
  }
}

function masteracts_to_almlist() {
  const path1 = `${config.tiaparsetools.pathresult}\\`;
  // отримання мастерданих про act
  const filemaster = `${path1}plc_acts.json`;
  if (fs.existsSync(filemaster)) {
    const content = fs.readFileSync(filemaster, 'utf8');
    masteracts = JSON.parse(content);
    const almlist = wincctoos.masteracts_to_almlist(masteracts.acts);
    const BOM = '\uFEFF';
    const csvContent = BOM + almlist; // для кирилиці
    fs.writeFileSync(`${path1}wincc_almacts.csv`, csvContent, {
      codepage: 1251,
    });
    console.log(
      `Список тривог  для ВМ створено в ${path1}wincc_almacts.csv`,
    );
  } else {
    console.log('Не вдалося створити файл wincc_almacts.csv');
  }
}

module.exports = {
  tiaparseall,
};
