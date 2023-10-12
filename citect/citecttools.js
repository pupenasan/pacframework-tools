const os = require('os');
const path = require('path');
const fs = require('fs');
const ini = require('ini'); // https://github.com/npm/ini#readme
const xmlparser = require('xml-js'); // https://www.npmjs.com/package/xml-js

if (!global.userdir) global.userdir = path.normalize(`${os.homedir()}/pacframeworktools`);
if (!global.inipath) global.inipath = path.normalize(`${os.homedir()}/pacframeworktools/config.ini`);

const config = ini.parse(fs.readFileSync(global.inipath, 'utf-8'));

const child_process = require('child_process');// https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_synchronous_process_creation https://stackoverflow.com/questions/47218117/run-vbs-script-with-node
const iconv = require('iconv-lite');
const masterdatatools = require('../common/masterdatatools');
// const { rawListeners } = require('process');

// скорочені назви функцій
const { logmsg } = masterdatatools;
const { writetolog } = masterdatatools;

const sqllogdir = `${global.userdir}\\sql`;

let ctprojectpath; let pfwincludepath; let pathmasterdbf; let ctprojectname; let pfwincludename; let cntelemetspergenie; let cntactspergenie; let plcsourcepath; let iodevicename; let eqspacenaming; let
  citectver;

let connstrprj; let connstrpfw; let equiptypes; let equiptable; let equiprtpara; let equipinstancetable; let mastertags; let masterchs; let masterplcs; let equipcfgpara2023old; let
  equipcfgpara2023new;
if (config.citecttools) {
  pathmasterdbf = config.citecttools.pathmasterdbf;
  ctprojectname = config.citecttools.ctprojectname;
  pfwincludename = config.citecttools.pfwincludename;
  cntelemetspergenie = config.citecttools.cntelemetspergenie;
  cntactspergenie = config.citecttools.cntactspergenie;
  plcsourcepath = config.citecttools.pathresult;// файли типу plc_tags.json таа інші
  eqspacenaming = config.citecttools.eqspacenaming;// hierarchical, flat - система парса найменування
  if (!fs.existsSync(sqllogdir)) {
    fs.mkdirSync(sqllogdir);
    console.log(`Створив директорію ${sqllogdir}`);
  }
  // визначення версії
  const ar = pathmasterdbf.split('\\');
  for (const t of ar) {
    if (t.search('SCADA 2020 R2') > -1) { citectver = '2020R2'; break; }
    if (t.search('SCADA 2023') > -1) { citectver = '2023'; break; }
  }
}

function create_equipment(plcname) {
  if (init() === 1) {
    modulstoequipment(plcname);
    actstoequipment(plcname);
    tagstoequipment(plcname);
    if (citectver != '2020R2') {
      savechangedequipara(equipcfgpara2023old, equipcfgpara2023new);
    }
  }
  logmsg('Equipment добавлені. Не забудьте обновити усі звязані елементом через Update Equipment!!! ');
  writetolog(1);
}

function create_modulequipment(plcname) {
  if (init() === 1) {
    modulstoequipment(plcname);
  }
  logmsg('Equipment для модуля добавлені. Не забудьте обновити усі звязані елементом через Update Equipment!!! ');
  writetolog(1);
}

function create_varequipment(plcname) {
  if (init() === 1) {
    tagstoequipment(plcname);
  }
  logmsg('Equipment для змінних добавлені. Не забудьте обновити усі звязані елементом через Update Equipment!!! ');
  writetolog(1);
}

function create_actequipment(plcname) {
  logmsg('Починаю створювати Equipment для ВМ');
  if (init() === 1) {
    actstoequipment(plcname);
  }
  logmsg('Equipment для ВМ добавлені. Не забудьте обновити усі звязані елементом через Update Equipment!!! ');
  writetolog(1);
}

function create_hmi(plcname) {
  if (init() === 1) {
    create_mappages(plcname);
    create_varpages(plcname);
    create_actpages(plcname);
  }
  writetolog(1);
}
function init() {
  if (!config.citecttools) logmsg('ERR: У файлі ini відсутній розділ citecttools, утиліти citect працювати не будуть!');

  masterdatatools.opts.logfile = 'seunparsetools.log';
  masterdatatools.opts.source = config.citecttools.pathsource;
  masterdatatools.opts.logpath = config.citecttools.pathlog;
  const prjsinfo = getprojectsinfo(pathmasterdbf);
  if (prjsinfo.tabbyidx[ctprojectname]) {
    ctprojectpath = prjsinfo.tabbyidx[ctprojectname].path.slice(0, -1);
    connstrprj = `Provider=VFPOLEDB.1;Data Source=${ctprojectpath};Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;`;
    logmsg(`Знайдено проект з іменем ${ctprojectname} в MASTER.DBF розміщення за шляхом ${ctprojectpath}`);
  } else {
    logmsg(`ERR: Не знайдено проекту з іменем ${ctprojectname} в MASTER.DBF! Перевірте налаштування конфігураційного файлу config.ini та наявність проекту в редакторі!`);
    return;
  }

  if (prjsinfo.tabbyidx[pfwincludename]) {
    pfwincludepath = prjsinfo.tabbyidx[pfwincludename].path.slice(0, -1);
    connstrpfw = `Provider=VFPOLEDB.1;Data Source=${pfwincludepath};Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;`;
    logmsg(`Знайдено проект шаблонів ${pfwincludename} в MASTER.DBF розміщення за шляхом ${pfwincludepath}`);
  } else {
    logmsg(`ERR: Не знайдено проекту з іменем ${pfwincludename} в MASTER.DBF! Перевірте налаштування конфігураційного файлу config.ini та наявність проекту в редакторі!`);
    return;
  }

  if (getincludesprj().tabbyidx[pfwincludename]) {
    logmsg(`Перевірка включеності шаблонного проекту ${pfwincludename} в ${ctprojectname} - ОК`);
  } else {
    logmsg(`ERR: Шаблонний проект ${pfwincludename} не включено в ${ctprojectname}! Включіть в список Include!`);
    return;
  }

  equiptypes = getequipmenttypesinfo(pfwincludepath);
  getequipmenttypesinfo(ctprojectpath, equiptypes);
  equiptable = getequipmentypetable(connstrpfw, 'name');
  equiprtpara = getequipparatable(connstrprj, 'value');
  equipinstancetable = getequipmenttable(connstrprj, 'tagprefix');
  switch (citectver) {
    case '2023':
      logmsg('Читаю параметри Equipment для версії типів 2 2023');
      equipcfgpara2023old = (geteqconfigparatable(connstrprj, 'eqconfig')).table;
      // console.log (equipcfgpara2023old);
      // process.exit();
      break;

    default:
      break;
  }
  equipcfgpara2023new = [];

  // test
  // sqlcmd = `UPDATE eqconfig SET eqconfig.value='20144' WHERE cluster='' AND equip='plc_f1.vrez.REZDO144' AND group='PFW' AND name='ID';`
  // runsql (connstrprj, sqlcmd, '' , 'meq_cfgpara2023');
  // process.exit();

  // fs.writeFileSync ("c:/tmp/1.json",  JSON.stringify(equipinstancetable), 'utf8');
  if (Object.keys(equiptypes).length > 0) {
    logmsg('Отримано наступний перелік типів з включеного та дійсного проекту:');
    for (const equiptype in equiptypes) {
      equiptypes[equiptype].founded = (typeof equiptable.tabbyidx[equiptype] === 'object');
      // console.log (equiptypes[equiptype]);
      logmsg(`- ${equiptypes[equiptype].name} в файлі ${equiptypes[equiptype].filename} `);
      if (equiptypes[equiptype].founded === false) {
        // logmsg ('- WRN: Увага! Тип відсутній в базі даних типів!');
        logmsg('- WRN: Увага! Тип відсутній в базі даних типів, добавляю!');
        const equipmentrecord = {};
        for (fieldname of equiptable.fields) {
          equipmentrecord[fieldname] = '';
        }
        equipmentrecord.name = equiptype;
        equipmentrecord.template = `${equiptype}.xml`;
        addequipmentypeintable(connstrpfw, equipmentrecord);
      }
    }
  } else {
    logmsg(`ERR: Увага! Жодного типу у включеному проекті не знайдено! Перевірте правильність включеного проекту ${pfwincludename}!`);
    return;
  }

  const filetags = `${plcsourcepath}\\` + 'plc_tags.json';
  if (fs.existsSync(filetags)) {
    const content = fs.readFileSync(filetags, 'utf8');
    mastertags = JSON.parse(content);
    logmsg('Теги прочитано.');
  } else {
    logmsg(`ERR: Не вдалося прочитати базу даних тегів з ${filetags}! Невдале завершення!`);
    process.exit();
  }
  const filechs = `${plcsourcepath}\\` + 'plc_chs.json';
  if (fs.existsSync(filechs)) {
    const content = fs.readFileSync(filechs, 'utf8');
    masterchs = JSON.parse(content);
    logmsg('Канали прочитано.');
  } else {
    logmsg(`ERR: Не вдалося прочитати базу даних каналів з ${filechs}!`);
    return;
  }
  const fileplcs = `${plcsourcepath}\\` + 'plc_plcs.json';
  if (fs.existsSync(fileplcs)) {
    const content = fs.readFileSync(fileplcs, 'utf8');
    masterplcs = JSON.parse(content);
    logmsg('Інформацію по PLC отримано.');
  } else {
    logmsg(`ERR: Не вдалося прочитати базу даних каналів з ${fileplcs}!`);
    return;
  }

  const fileacts = `${plcsourcepath}\\` + 'plc_acts.json';
  if (fs.existsSync(fileacts)) {
    const content = fs.readFileSync(fileacts, 'utf8');
    masteracts = JSON.parse(content);
    logmsg('Інформацію по ВМ отримано.');
  } else {
    logmsg(`ERR: Не вдалося прочитати базу даних ВМ з ${fileacts}!`);
    // return
  }

  return 1;
}

// ---------------------------------- HMI
function create_varpages(plcname, initenbl = false) {
  if (initenbl === true) {
    if (init() !== 1) return;
  }
  const { EQprefix } = config.citecttools[plcname];
  const { iodevicename } = config.citecttools[plcname];
  let dis = ''; let dos = ''; let ais = ''; let
    aos = '';
  if (mastertags) {
    for (const tgname in mastertags.tags) {
      let equipment;
      const tag = mastertags.tags[tgname];
      if (tgname.toLowerCase().search('rezdi') != -1
      || tgname.toLowerCase().search('rezai') != -1
      || tgname.toLowerCase().search('rezdo') != -1
      || tgname.toLowerCase().search('rezao') != -1) {
        tagprefix = `${iodevicename}_${tgname}`;
      } else if (EQprefix && EQprefix.length > 0) {
        tagprefix = `${EQprefix}_${tgname}`;
      } else {
        tagprefix = tgname;
      }
      // AIVAR_HMI
      if (tag.type === 'DI') {
        dis += `${tagprefix},`;
      }
      if (tag.type === 'AI') {
        ais += `${tagprefix},`;
      }
      if (tag.type === 'DO') {
        dos += `${tagprefix},`;
      }
      if (tag.type === 'AO') {
        aos += `${tagprefix},`;
      }
    }
    dis = dis.slice(0, -1);
    ais = ais.slice(0, -1);
    dos = dos.slice(0, -1);
    aos = aos.slice(0, -1);
  }
  const paras = ['ctgraphbldrtools.vbs', 'create_varpages', ctprojectname, pfwincludename, iodevicename, dis, dos, ais, aos, cntelemetspergenie];
  // 'C:\\Windows\\SysWOW64\\cscript.exe'
  logmsg('-----  Створюю джини для технологічних змінних, зачекайте, це може зайняти кілька хвилин ...');
  const vbs = child_process.spawnSync('cscript.exe', paras, { stdio: ['pipe', 'pipe', process.stderr] });// { stdio: [process.stdin, process.stdout, process.stderr] }
  str = iconv.decode(Buffer.from(vbs.stdout), 'win1251').split('----------');
  if (str.length > 0) console.log(str[1]);
}
function create_mappages(plcname, initenbl = false) {
  if (initenbl === true) {
    if (init() !== 1) return;
  }
  if (masterchs) {
    // групування модулів по пристроям
    const devs = {}; let ar = []; let
      l;
    let str = ''; let
      devname;
    const { iodevicename } = config.citecttools[plcname];
    for (let i = 0; i < masterchs.modules.length; i++) {
      const modul = masterchs.modules[i];
      modname = modul.modid;
      ar = modname.split('_');
      l = ar.length;
      devname = '';
      if (l >= 3) {
        for (let i = 0; i < l - 2; i++) {
          devname += `${ar[i]}_`;
        }
        devname = devname.slice(0, -1);
      }
      if (!devs[devname]) {
        devs[devname] = [];
      }
      devs[devname].push({ modname, i });
    }
    for (const devname in devs) {
      const dev = devs[devname];
      let moduls = '';
      let ids = '';
      for (const module of dev) {
        moduls += `${module.modname},`;
        ids += `${module.i},`;
      }
      moduls = moduls.slice(0, -1);
      ids = ids.slice(0, -1);
      const paras = ['ctgraphbldrtools.vbs', 'create_mappage', ctprojectname, pfwincludename, iodevicename, devname, moduls, ids];
      logmsg(`----- Створюю джини для модулів ${devname}, зачекайте, це може зайняти кілька хвилин ...`);
      const vbs = child_process.spawnSync('cscript.exe', paras, { stdio: ['pipe', 'pipe', process.stderr] });// { stdio: [process.stdin, process.stdout, process.stderr] }
      str = iconv.decode(Buffer.from(vbs.stdout), 'win1251').split('----------');
      if (str.length > 0) console.log(str[1]);
    }
  }
}
function create_actpages(plcname, initenbl = false) {
  if (initenbl === true) {
    if (init() !== 1) return;
  }
  const txtacttypes = {};
  const { iodevicename } = config.citecttools[plcname];
  const { EQprefix } = config.citecttools[plcname];
  if (masteracts) {
    // для кожного типу перелік ВМ
    for (acttypename in masteracts.types) {
      if (acttypename.search('_HMI') > 0) {
        txtacttypes[acttypename] = '';
      }
    }
    for (const actname in masteracts.acts) {
      if (EQprefix && EQprefix.length > 0) {
        tagprefix = `${EQprefix}_${actname}`;
      } else {
        tagprefix = actname;
      }
      const act = masteracts.acts[actname];
      const acttypename = act.plchmi.type;
      if ((txtacttypes[acttypename]).length > 1) txtacttypes[acttypename] += ',';
      if (typeof txtacttypes[acttypename] !== 'undefined') txtacttypes[acttypename] += tagprefix;
    }
    let paras;
    logmsg('-----  Створюю джини для ВМ, зачекайте, це може зайняти кілька хвилин ...');
    for (acttype in txtacttypes) {
      if (txtacttypes[acttype].length > 0) {
        paras = ['ctgraphbldrtools.vbs', 'create_actpages', ctprojectname, pfwincludename, iodevicename, txtacttypes[acttype], cntactspergenie, acttype.replace('_HMI', ''), acttype];
        const vbs = child_process.spawnSync('cscript.exe', paras, { stdio: ['pipe', 'pipe', process.stderr] });// { stdio: [process.stdin, process.stdout, process.stderr] }
        str = iconv.decode(Buffer.from(vbs.stdout), 'win1251').split('----------');
        if (str.length > 0) console.log(str[1]);
      }
    }
  }
}

// ------------------------------------ Equipments
// парсить імя і розбиває його на частини якщо це потрібно
function parseeqname(origname) {
  let eqparsename = {};
  if (eqspacenaming && eqspacenaming === 'flat') {
    eqparsename = { str: origname, ar: [origname] };
  } else { // hierarchical
    eqparsename.str = origname.replace(/_/g, '.');
    eqparsename.ar = origname.split('_');
  }
  return eqparsename;
}
// добавлення або оновлення Equipment тегами
function tagstoequipment(plcname) {
  // отримання мастерданих про теги
  logmsg('----- Отримую інформацію про технологічні змінні ----------------');
  const newequipments = {};
  const newequiprtpara = {};
  const { iodevicename } = config.citecttools[plcname];
  const { EQprefix } = config.citecttools[plcname];
  let tagprefix; let
    eqname;
  const typevarscheck = {
    AI: equiptypes.AIVAR_HMI, DI: equiptypes.DIVAR_HMI, DO: equiptypes.DOVAR_HMI, AO: equiptypes.AOVAR_HMI,
  };
  // перевірка на валідність
  if (typeof (typevarscheck.AI) === 'object') {
    if (!equiptypes.AIVAR_HMI.paramsdef || !equiptypes.AIVAR_HMI.paramsdef.PFW || !equiptypes.AIVAR_HMI.paramsdef.PFW.ID) {
      typevarscheck.AI = undefined;
      logmsg('WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AIVAR_HMI!');
    } else { logmsg('AIVAR_HMI - ok!'); }
  } else {
    logmsg('WRN: Не знайдено необхідні типи для AI зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.DI) === 'object') {
    if (!equiptypes.DIVAR_HMI.paramsdef || !equiptypes.DIVAR_HMI.paramsdef.PFW || !equiptypes.DIVAR_HMI.paramsdef.PFW.ID) {
      typevarscheck.DI = undefined;
      logmsg('WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DIVAR_HMI!');
    } else { logmsg('DIVAR_HMI - ok!'); }
  } else {
    logmsg('WRN: Не знайдено необхідні типи для DI зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.DO) === 'object') {
    if (!equiptypes.DOVAR_HMI.paramsdef || !equiptypes.DOVAR_HMI.paramsdef.PFW || !equiptypes.DOVAR_HMI.paramsdef.PFW.ID) {
      typevarscheck.DO = undefined;
      logmsg('WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DOVAR_HMI!');
    } else { logmsg('DOVAR_HMI - ok!'); }
  } else {
    logmsg('WRN: Не знайдено необхідні типи для DO зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.AO) === 'object') {
    if (!equiptypes.AOVAR_HMI.paramsdef || !equiptypes.AOVAR_HMI.paramsdef.PFW || !equiptypes.AOVAR_HMI.paramsdef.PFW.ID) {
      typevarscheck.AO = undefined;
      logmsg('WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AOVAR_HMI!');
    } else { logmsg('AOVAR_HMI - ok!'); }
  } else {
    logmsg('WRN: Не знайдено необхідні типи для AO зміна Equipment дя нього не буде відбуватися!');
  }

  const filetags = `${plcsourcepath}\\` + 'plc_tags.json';
  if (mastertags) {
    for (const tgname in mastertags.tags) {
      const tag = mastertags.tags[tgname];
      if (!tag.plchmi) {
        logmsg(`ERR: У змінній ${tgname} вдсутня структура plchmi! Змінну ігнорую!`);
        continue;
      }
      if (!tag.plchmi.adr) {
        logmsg(`ERR: У змінні ${tgname} вдсутня адреса в plchmi! Ставлю пусту!`);
        tag.plchmi.adr = '';
      }
      let eqnameob;
      // 'rezdi','rezai','rezdo','rezao',
      if (tgname.toLowerCase().search('rezdi') != -1
        || tgname.toLowerCase().search('rezai') != -1
        || tgname.toLowerCase().search('rezdo') != -1
        || tgname.toLowerCase().search('rezao') != -1) {
        eqname = `${iodevicename}.vrez.${tgname}`;
        tagprefix = `${iodevicename}_${tgname}`;
      } else {
        eqnameob = parseeqname(tgname);
        if (EQprefix && EQprefix.length > 0) {
          tagprefix = `${EQprefix}_${tgname}`;
          eqname = `${EQprefix}.${eqnameob.str}`;
        } else {
          tagprefix = tgname;
          eqname = eqnameob.str;
        }
        // суфікс добавляється щоб при ієархічому імені не було конфлікту з одноіменними елементами
        if (eqspacenaming !== 'flat') eqname = `${eqname}_${tag.type}`;
      }
      // AIVAR_HMI
      if (tag.type === 'AI' && typevarscheck.AI) {
        // параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AIVAR_HMI.paramsdef));
        paramsdef.PFW.ID = tag.id;
        paramsdef.PFW.EU = tag.eu || '';
        paramsdef.PFW.FRMT = ((tag.frmt) || '').replace(/s/g, '#').replace(/[0-9]/g, '#');
        paramsdef.Range.L = tag.loeng || 0;
        paramsdef.Range.H = tag.hieng || 100;
        newequipments[tagprefix] = {
          name: eqname,
          type: 'AIVAR_HMI',
          iodevice: iodevicename,
          tagprefix,
          alias: tgname,
          content: 'FP_AI',
          comment: tag.descr,
        };
        if (citectver == '2020R2') {
          newequipments[tagprefix].param = equipparamtostring(paramsdef);
        }
        equipparamtotable2023(equipcfgpara2023new, newequipments[tagprefix], paramsdef);
        if (tag.plchmi.adr) newequipments[tagprefix].custom1 = tag.plchmi.adr.replace('%MW', '').split('.')[0];

        const valuepara = `${tagprefix}_PLCLimits`;// Equipment runtime parameters
        newequiprtpara[valuepara] = { name: 'PLCLimits', value: valuepara };
        // console.log (equipment);
      }
      // DIVAR_HMI
      if (tag.type === 'DI' && typevarscheck.DI) {
        // параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DIVAR_HMI.paramsdef));
        paramsdef.PFW.ID = tag.id;
        newequipments[tagprefix] = {
          name: eqname,
          type: 'DIVAR_HMI',
          iodevice: iodevicename,
          tagprefix,
          alias: tgname,
          content: 'FP_AI',
          comment: tag.descr,
        };
        if (citectver == '2020R2') {
          newequipments[tagprefix].param = equipparamtostring(paramsdef);
        }
        equipparamtotable2023(equipcfgpara2023new, newequipments[tagprefix], paramsdef);
        if (tag.plchmi.adr) newequipments[tagprefix].custom1 = tag.plchmi.adr.replace('%MW', '').split('.')[0];

        // console.log (equipment);
      }
      // DOVAR_HMI
      if (tag.type === 'DO' && typevarscheck.DO) {
        // параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DOVAR_HMI.paramsdef));
        paramsdef.PFW.ID = tag.id;
        newequipments[tagprefix] = {
          name: eqname,
          type: 'DOVAR_HMI',
          iodevice: iodevicename,
          tagprefix,
          alias: tgname,
          comment: tag.descr,
        };
        if (citectver == '2020R2') {
          newequipments[tagprefix].param = equipparamtostring(paramsdef);
        }
        equipparamtotable2023(equipcfgpara2023new, newequipments[tagprefix], paramsdef);
        if (tag.plchmi.adr) newequipments[tagprefix].custom1 = tag.plchmi.adr.replace('%MW', '').split('.')[0];
      }
      // AOVAR_HMI
      if (tag.type === 'AO' && typevarscheck.AO) {
        // параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AOVAR_HMI.paramsdef));
        paramsdef.PFW.ID = tag.id;
        newequipments[tagprefix] = {
          name: eqname,
          type: 'AOVAR_HMI',
          iodevice: iodevicename,
          tagprefix,
          alias: tgname,
          comment: tag.descr,
        };
        if (citectver == '2020R2') {
          newequipments[tagprefix].param = equipparamtostring(paramsdef);
        }
        equipparamtotable2023(equipcfgpara2023new, newequipments[tagprefix], paramsdef);
        if (tag.plchmi.adr) newequipments[tagprefix].custom1 = tag.plchmi.adr.replace('%MW', '').split('.')[0];
      }
    }
  }

  // console.log (equipcfgpara2023new);
  // process.exit();

  logmsg(`----- Модифікую таблицю Equipment технологічними змінними в проекті ${ctprojectpath} ----------------`);
  modifyequipments(newequipments, newequiprtpara);
}
// добавлення або оновлення Equipment ВМ
function actstoequipment(plcname) {
  // отримання мастерданих про ВМ
  logmsg('----- Отримую інформацію про ВМ ----------------');
  const newequipments = {};
  const newequiprtpara = {};
  let typevarscheck = {};
  const { iodevicename } = config.citecttools[plcname];
  const { EQprefix } = config.citecttools[plcname];
  let tagprefix; let
    eqname;
  // шукаємо усі типи HMI
  if (masteracts) {
    typevarscheck = { ACTTR_CFG: equiptypes.ACTTR_CFG };
    for (typename in masteracts.types) {
      if (typename.search('_HMI') > 0) {
        typevarscheck[typename] = equiptypes[typename];
        // перевірка на валідність
        if (typeof (typevarscheck[typename]) === 'object') {
          if (!equiptypes[typename].paramsdef || !equiptypes[typename].paramsdef.PFW || !equiptypes[typename].paramsdef.PFW.ID) {
            typevarscheck[typename] = undefined;
            logmsg(`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для ${typename}!`);
          } else { logmsg(`${typename} - ok!`); }
        } else {
          logmsg(`WRN: Не знайдено необхідні типи для ${typename} зміна Equipment дя нього не буде відбуватися!`);
        }
      }
    }
  } else {
    logmsg('Дані по ВМ не прочитані з фйлу експорту ПЛК, тому генерування неможливе!');
  }

  // console.log (typevarscheck);
  if (masteracts) {
    for (const actname in masteracts.acts) {
      const act = masteracts.acts[actname];
      if (!act.plchmi) {
        logmsg(`ERR: У змінній ${actname} вдсутня структура plchmi! Змінну ігнорую!`);
        continue;
      }
      if (!act.plchmi.adr) {
        logmsg(`ERR: У змінні ${actname} вдсутня адреса в plchmi! Ставлю пусту!`);
        act.plchmi.adr = '';
      }
      if (act.plchmi.type === act.plchmi.type && typevarscheck[act.plchmi.type]) {
        const eqnameob = parseeqname(actname);
        if (EQprefix && EQprefix.length > 0) {
          tagprefix = `${EQprefix}_${actname}`;
          eqname = `${EQprefix}.${eqnameob.str}`;
        } else {
          tagprefix = actname;
          eqname = eqnameob.str;
        }
        // параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes[act.plchmi.type].paramsdef));
        paramsdef.PFW.ID = act.id;
        if (typeof (paramsdef.PFW.AIpref) !== 'undefined') paramsdef.PFW.AIpref = tagprefix;
        newequipments[tagprefix] = {
          name: eqname,
          type: act.plchmi.type,
          iodevice: iodevicename,
          tagprefix,
          alias: actname,
          content: `FP_${act.plchmi.type.replace('_HMI', '')}`,
          comment: act.descr,
        };
        if (citectver == '2020R2') {
          newequipments[tagprefix].param = equipparamtostring(paramsdef);
        }
        equipparamtotable2023(equipcfgpara2023new, newequipments[tagprefix], paramsdef);
        if (act.plchmi.adr) newequipments[tagprefix].custom1 = act.plchmi.adr.replace('%MW', '').split('.')[0];
        // let valuepara = actname + '_PLCLimits'// Equipment runtime parameters
        // newequiprtpara[valuepara] = {name:'PLCLimits', value: valuepara};
        // console.log (equipment);
        // process.exit()
      }
    }
  }

  logmsg(`----- Модифікую таблицю Equipment технологічними змінними в проекті ${ctprojectpath} ----------------`);
  modifyequipments(newequipments, newequiprtpara);
}

// добавлення або оновлення Equipment по PLC, CH та всі інші системні Equipment
function modulstoequipment(plcname) {
  // отримання мастерданих про канали
  logmsg('----- Отримую інформацію про канали ----------------');
  let newequipments = {};
  const newequiprtpara = {};
  const typevarscheck = {
    MODULE: equiptypes.MODULE,
    SUBMODULE: equiptypes.SUBMODULE,
    CH_BUF: equiptypes.CH_BUF,
    PLC: equiptypes.PLC,
    PARASTOHMI: equiptypes.PARASTOHMI,
    VARBUF: equiptypes.VARBUF,
    ACTTR_CFG: equiptypes.ACTTR_CFG,
  };
  // перевірка на валідність
  // console.log (typevarscheck);process.exit();
  if (typeof (typevarscheck.MODULE) === 'object') {
    logmsg('MODULE - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для MODULE зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.SUBMODULE) === 'object') {
    logmsg('SUBMODULE - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для SUBMODULE зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.CH_BUF) === 'object') {
    logmsg('CH_BUF - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для CH_BUF зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.PLC) === 'object') {
    logmsg('PLC - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для PLC зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.PARASTOHMI) === 'object') {
    logmsg('PARASTOHMI - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для PLC зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.VARBUF) === 'object') {
    logmsg('VARBUF - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для VARBUF зміна Equipment дя нього не буде відбуватися!');
  }
  if (typeof (typevarscheck.ACTTR_CFG) === 'object') {
    logmsg('ACTTR_CFG - ok!');
  } else {
    logmsg('WRN: Не знайдено необхідні типи для ACTTR_CFG зміна Equipment дя нього не буде відбуватися!');
  }
  console.log(plcname);
  const { iodevicename } = config.citecttools[plcname];

  if (masterchs) {
    // топ рівень - PLC, спочатку створюємо його
    tagprefix = iodevicename;
    newequipments[tagprefix] = {
      name: tagprefix,
      type: 'PLC',
      iodevice: iodevicename,
      tagprefix,
    };
    if (masterplcs.plc.adr) newequipments[tagprefix].custom1 = masterplcs.plc.adr.replace('%MW', '').split('.')[0];
    logmsg(`----- Модифікую таблицю Equipment ${plcname} в проекті ${ctprojectpath} ----------------`);
    console.log(iodevicename);
    modifyequipments(newequipments, newequiprtpara);

    newequipments = {};
    // визначення максимального ID
    let maxid = 0;
    for (const tgname in mastertags.tags) {
      const id = parseInt(mastertags.tags[tgname].id);
      if (id > maxid && mastertags.tags[tgname].type === 'AI') maxid = id;
    }
    tagprefix = `${iodevicename}_PARASTOHMI`;
    paramsdef = JSON.parse(JSON.stringify(equiptypes.PARASTOHMI.paramsdef));
    paramsdef.PFW.ID_MAX = maxid;
    newequipments[tagprefix] = {
      name: `${iodevicename}.PARASTOHMI`,
      type: 'PARASTOHMI',
      iodevice: iodevicename,
      comment: 'Параметри',
    };
    if (citectver == '2020R2') {
      newequipments[tagprefix].param = equipparamtostring(paramsdef);
    }
    equipparamtotable2023(equipcfgpara2023new, newequipments[tagprefix], paramsdef);
    if (masterplcs.parastohmi.adr && masterplcs.parastohmi.adr.length > 0) newequipments[tagprefix].custom1 = masterplcs.parastohmi.adr.replace('%MW', '').split('.')[0];

    tagprefix = `${iodevicename}_CHBUF`;
    newequipments[tagprefix] = {
      name: `${iodevicename}.CHBUF`,
      type: 'CH_BUF',
      iodevice: iodevicename,
      tagprefix,
      comment: 'Буфер для каналу',
    };
    if (masterchs.chbuf.adr) newequipments[tagprefix].custom1 = masterchs.chbuf.adr.replace('%MW', '').split('.')[0];

    tagprefix = `${iodevicename}_SUBMODULE`;
    newequipments[tagprefix] = {
      name: `${iodevicename}.SUBMODULE`,
      type: 'SUBMODULE',
      iodevice: iodevicename,
      tagprefix,
      comment: 'Підмодуль',
    };
    if (masterchs.submodulebuf.adr) newequipments[tagprefix].custom1 = masterchs.submodulebuf.adr.replace('%MW', '').split('.')[0];

    tagprefix = `${iodevicename}_VARBUF`;
    newequipments[tagprefix] = {
      name: `${iodevicename}.VARBUF`,
      type: 'VARBUF',
      iodevice: iodevicename,
      alias: 'VARBUF',
      comment: 'Буфер для VAR',
    };
    if (mastertags.varbuf.adr) newequipments[tagprefix].custom1 = mastertags.varbuf.adr.replace('%MW', '').split('.')[0];

    tagprefix = `${iodevicename}_ACTBUF`;
    newequipments[tagprefix] = {
      name: `${iodevicename}.ACTBUF`,
      type: 'ACTTR_CFG',
      iodevice: iodevicename,
      alias: 'ACTBUF',
      comment: 'Буфер для ВМ',
    };
    if (masteracts.actbuf.adr) newequipments[tagprefix].custom1 = masteracts.actbuf.adr.replace('%MW', '').split('.')[0];

    let i = 0;
    for (const module of masterchs.modules) {
      const modulename = `MODULE${i}`;
      tagprefix = `${iodevicename}_${modulename}`;
      newequipments[tagprefix] = {
        name: `${iodevicename}.${modulename}`,
        type: 'MODULE',
        iodevice: iodevicename,
        alias: module.modid,
        comment: `Модуль ${module.modid}`,
      };
      if (module.adr) newequipments[tagprefix].custom1 = module.adr.replace('%MW', '').split('.')[0];

      i++;
    }
    modifyequipments(newequipments, newequiprtpara);

    logmsg(`Створюю Cicode файл для ${iodevicename}`);
    createcicodeplcfile(iodevicename);
  }
}
function createcicodeplcfile(iodevicename) {
  const content = `// This code is automatically generated ${new Date().toLocaleString()}
  INT FUNCTION PFW_getparas${iodevicename} () 
    INT ID = ${iodevicename}_PARASTOHMI[0]
    ${iodevicename}_PARASTOHMI_ID = ${iodevicename}_PARASTOHMI[0];
    ${iodevicename}_PARASTOHMI_CLSID[ID] = ${iodevicename}_PARASTOHMI[1];		
    ${iodevicename}_PARASTOHMI_K[ID] = ${iodevicename}_PARASTOHMI[2];
    INT iK = ${iodevicename}_PARASTOHMI_K[ID];
    REAL rK;
    IF iK >= 0 THEN 
      rK =1.0/IntToReal(iK);
    ELSE 
      rK = Abs(IntToReal(iK));
    END	    
    ${iodevicename}_PARASTOHMI_PRM[ID] = ${iodevicename}_PARASTOHMI[4]
    ${iodevicename}_PARASTOHMI_LOENG[ID] = ${iodevicename}_PARASTOHMI[5]*rK;
    ${iodevicename}_PARASTOHMI_HIENG[ID] = ${iodevicename}_PARASTOHMI[6]*rK;
    ${iodevicename}_PARASTOHMI_LOSP[ID] = ${iodevicename}_PARASTOHMI[7]*rK;
    ${iodevicename}_PARASTOHMI_HISP[ID] = ${iodevicename}_PARASTOHMI[8]*rK;
    ${iodevicename}_PARASTOHMI_LOLOSP[ID] = ${iodevicename}_PARASTOHMI[9]*rK;
    ${iodevicename}_PARASTOHMI_HIHISP[ID] = ${iodevicename}_PARASTOHMI[10]*rK;							
    ${iodevicename}_PARASTOHMI_IDDBL[ID] = ${iodevicename}_PARASTOHMI[11];	
    IF ${iodevicename}_PARASTOHMI_I.q = "Good" THEN 
      ${iodevicename}_PARASTOHMI_IPREV = ${iodevicename}_PARASTOHMI_I;
    END	
    RETURN ${iodevicename}_PARASTOHMI[3];
  END
  `;
  const filename = `${ctprojectpath}\\PFW_getparas${iodevicename}.ci`;
  fs.writeFileSync(filename, content.replace(/\x0A/g, '\x0D\x0A'), 'utf8');
}

// ----------------------------------- Get/Put Citect info
function getprojectsinfo(pathmasterdbf) {
  const connstr = `Provider=VFPOLEDB.1;Data Source=${pathmasterdbf};Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;`;
  const sqlcmd = 'SELECT * FROM MASTER.DBF';
  const records = runsql(connstr, sqlcmd, 'name');
  return records;
}
function getincludesprj() {
  const sqlcmd = 'SELECT * FROM include.DBF';
  const records = runsql(connstrprj, sqlcmd, 'name');
  return records;
}
function getequipmenttable(connstr, idx) {
  const sqlcmd = 'SELECT * FROM equip.DBF';
  const records = runsql(connstr, sqlcmd, idx, 'equip');
  return records;
}
function getequipmentypetable(connstr, idx) {
  const sqlcmd = 'SELECT * FROM eqtype.DBF';
  const records = runsql(connstr, sqlcmd, idx, 'eqtype');
  return records;
}
function addequipmentypeintable(connstr, equipmentrecord) {
  let vals = '';
  for (const fieldname in equipmentrecord) { vals += `'${equipmentrecord[fieldname]}',`; }
  const sqlcmd = `INSERT INTO eqtype VALUES (${vals.slice(0, -1)}); `;
  // console.log (sqlcmd); process.exit();
  const records = runsql(connstr, sqlcmd);
}
function getequipparatable(connstr, idx) {
  const sqlcmd = 'SELECT * FROM eqparam.DBF';
  const records = runsql(connstr, sqlcmd, idx, 'eqparam');
  return records;
}
// Plant SCADA 2023
function geteqconfigparatable(connstr, idx) {
  // CLUSTER	EQUIP	GROUP	NAME	VALUE
  const sqlcmd = 'SELECT * FROM eqconfig.DBF';
  const records = runsql(connstr, sqlcmd, idx, 'equip');
  return records;
}

// добавляє нові або замінює існуючі equipment за полем TAGPREFIX
function modifyequipments(newequipments, newequiprtpara) {
  const oldequipments = equipinstancetable.tabbyidx;
  const equipinstancetablebyname = getequipmenttable(connstrprj, 'name');
  const oldequipmentsbyname = equipinstancetablebyname.tabbyidx;
  const oldequiprtpara = equiprtpara.tabbyidx;
  let sqlcmd = '';
  let tagprefix1;
  let vals = '';

  for (const tagprefix in newequipments) {
    if (!tagprefix1) tagprefix1 = tagprefix;
    if (!newequipments[tagprefix].tagprefix) newequipments[tagprefix].tagprefix = tagprefix;
    if (oldequipments[tagprefix]) {
      logmsg(`Знайдено запис для префіксу ${tagprefix} модифікую існуючі в майстердані поля`);
      sqlcmd += 'UPDATE equip SET';
      // пусті поля по дефолту
      if (oldequipments[tagprefix].iodevice.length < 1) newequipments[tagprefix].iodevice = iodevicename;
      // оновлення параметрів
      if (!newequipments[tagprefix].name || newequipments[tagprefix].name.length < 1) newequipments[tagprefix].name = oldequipments[tagprefix].name;
      if (!newequipments[tagprefix].cluster || newequipments[tagprefix].cluster.length < 1) newequipments[tagprefix].cluster = oldequipments[tagprefix].cluster;
      const oldpara = stringtoequipparam(oldequipments[tagprefix].param);
      const newpara = stringtoequipparam(newequipments[tagprefix].param);
      for (const grparaname in newpara) {
        for (const paraname in newpara[grparaname]) {
          if (oldpara[grparaname] && oldpara[grparaname][paraname] && newpara[grparaname][paraname].length < 1) {
            newpara[grparaname][paraname] = oldpara[grparaname][paraname]; // залишаємо попередній
          }
        }
      }
      newequipments[tagprefix].param = equipparamtostring(newpara);
      for (const fieldname in newequipments[tagprefix]) {
        sqlcmd += ` ${fieldname.toUpperCase()}='${newequipments[tagprefix][fieldname]}',`;
      }
      if (sqlcmd[sqlcmd.length - 1] === ',') sqlcmd = sqlcmd.slice(0, -1);// убрати останню кому
      sqlcmd += ` WHERE tagprefix='${tagprefix}';\n`;
    } else {
      vals = '';
      logmsg(`Не знайдено запису для префіксу ${tagprefix} добавляю новий`);
      if (!newequipments[tagprefix].name) newequipments[tagprefix].name = `debug.${tagprefix}`;
      // добавляємо необхідні поля
      for (const fieldname of equipinstancetable.fields) {
        if (!newequipments[tagprefix][fieldname]) {
          newequipments[tagprefix][fieldname] = '';
        }
        vals += `'${newequipments[tagprefix][fieldname]}',`;
      }
      if (vals[vals.length - 1] === ',') vals = vals.slice(0, -1);// убрати останню кому
      sqlcmd += `INSERT INTO equip VALUES (${vals});\n`;
    }
    // знайдено існуючі, треба модифікувати equipment name якщо вони відрізняються
    const rtparavalue = `${tagprefix}_PLCLimits`;
    // console.log (newequiprtpara[rtparavalue]);
    // console.log (oldequiprtpara[rtparavalue]);
    if (newequiprtpara[rtparavalue] && oldequiprtpara[rtparavalue] && oldequiprtpara[rtparavalue].equip !== newequiprtpara[rtparavalue].equip) {
      logmsg(`Змінилася назва quipment для префіксу ${tagprefix} з ${oldequiprtpara[rtparavalue].equip} на ${newequipments[tagprefix].name} змінюю параметри виконання quipment`);
      sqlcmd += `UPDATE eqparam SET equip='${newequipments[tagprefix].name}' WHERE value='${rtparavalue}';\n`;
    } else if (newequipments[tagprefix].type === 'AIVAR_HMI' && !oldequiprtpara[rtparavalue]) { // добавити нові
      logmsg(`Добавляю параметр виконання для ${newequipments[tagprefix].name}`);
      vals = '';
      newequiprtpara[rtparavalue].cluster = newequipments[tagprefix].cluster;
      newequiprtpara[rtparavalue].equip = newequipments[tagprefix].name;
      newequiprtpara[rtparavalue].istag = 'TRUE';
      for (const fieldname of equiprtpara.fields) {
        // console.log (fieldname);
        if (!newequiprtpara[rtparavalue][fieldname]) {
          newequiprtpara[rtparavalue][fieldname] = '';
        }
        vals += `'${newequiprtpara[rtparavalue][fieldname]}',`;
      }
      if (vals[vals.length - 1] === ',') vals = vals.slice(0, -1);// убрати останню кому
      sqlcmd += `INSERT INTO eqparam VALUES (${vals});\n`;
    }
  }
  // console.log (sqlcmd);
  if (sqlcmd.length > 0) {
    logmsg(`Запускаю SQL команду на connstr = ${connstrprj} для ${tagprefix1}`);
    runsql(connstrprj, sqlcmd, '', `meq_${tagprefix1}`);
  }
}

// ----------------------------------- SQL
// запуска SQL запит і повертає records з інформацією про результат
function runsql(connstr, sqlcmd, idx, tabfilename = 'table') {
  let paras;
  const sqlcmdfilename = `${sqllogdir}\\${tabfilename}_req.sql`;
  tabfilename = `${sqllogdir}\\${tabfilename}.txt`;
  try {
    const buf = iconv.encode(sqlcmd, 'win1251');
    fs.writeFileSync(sqlcmdfilename, buf);
  } catch (error) {
    logmsg(`ERR: Помилка запису SQL запиту в файл ${sqlcmdfilename}!`);
    return;
  }
  paras = ['dbasetools.vbs', 'runsql', connstr, sqlcmdfilename, tabfilename];
  const vbs = child_process.spawnSync('C:\\Windows\\SysWOW64\\cscript.exe', paras, { stdio: ['pipe', 'pipe', process.stderr] });// { stdio: [process.stdin, process.stdout, process.stderr] }
  const records = {
    table: [], fields: [], tabbyidx: {}, type: 'undefined', msg: [],
  };
  try {
    const buf = fs.readFileSync(tabfilename);
    if (buf) {
      str = iconv.decode(Buffer.from(buf), 'win1251');
      // виділення повідомлень
      const vbmsg = str.split('MSG{')[1];
      if (vbmsg) records.msg.push(vbmsg.split('}MSG')[0]);
      // визначення типу відповіді на запит
      const rettype = str.split('TYPE{')[1];
      if (rettype) records.type = rettype.split('}TYPE')[0];
    }
  } catch (error) {
    if (sqlcmd.search('SELECT') === 0) logmsg(`WRN: Не знайдено записів по запиту до таблиці ${tabfilename}`);
  }
  if (records.type === 'TABLE') {
    tabtoob(records, str, idx);
  }
  return records;
}
// перетворює запарсену відповідь з VB в records
function tabtoob(records, str, idx) {
  const headerraw = str.split('HEADER{');
  let header;
  if (headerraw[1]) {
    header = headerraw[1].split('}HEADER')[0].split('<|||>');
    const tabraw = str.split('STARTTABLE{');
    let tabrows;
    records.fields = header;
    if (tabraw[1]) {
      tabrows = tabraw[1].split('}ENDTABLE')[0].split('\n');// ('<===>');
      for (row of tabrows) {
        const ar = row.split('<|||>');
        const record1 = {};
        for (let i = 0; i < ar.length; i++) {
          record1[header[i]] = ar[i].replace(/\s+$/gm, '');// витирає пробіли в кінці
        }
        records.table.push(record1);
        // якщо є індексне поле
        if (idx && record1[idx]) {
          records.tabbyidx[record1[idx]] = record1;
        }
      }
    } else {
      records.type = 'NULTABLE';
      records.msg.push('Повернена пуста таблиця');
    }
  } else {
    records.msg.push('Невірний формат поверненої таблиці в запиті - не знайдено заголовки полів');
    return records;
  }

  return records;
}
// повертає розпарсений XML-тип
function getequipmenttypesinfo(projectpath, equiptypes) {
  // отримання інофрмацію про всі типи Equipment
  const filenames = fs.readdirSync(projectpath);
  let xmlcontent;
  if (!equiptypes) equiptypes = {};
  for (const filename of filenames) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.xml') {
      let content = '';
      try {
        content = fs.readFileSync(`${projectpath}\\${filename}`, 'utf8');
      } catch (error) {
        logmsg(`WRN: Не вдалося відкрити файл ${`${projectpath}\\${filename}`} із за причини ${error}!`);
        continue;
        // console.log (filename);
      }
      content = content.replace(/^\uFEFF/, '');
      try {
        xmlcontent = xmlparser.xml2js(content.trim(), { compact: true, spaces: 4 });
      } catch (error) {
        logmsg(`WRN: Не вдалося розпарсити файл ${`${projectpath}\\${filename}`} із за причини ${error}!`);
        console.log(content);
        continue;
        // process.exit();
      }
      if (xmlcontent.template && xmlcontent.template.input && xmlcontent.template.input._attributes && xmlcontent.template.input._attributes.name === 'equipment') {
        // equiptypes[xmlcontent.template.param]
        let equipment = {};
        // console.log (xmlcontent.template.param.string)
        for (const atribute of xmlcontent.template.param.string) {
          if (atribute._attributes.name === 'name' && atribute._text) equipment = equiptypes[atribute._text] = { name: atribute._text };
          if (atribute._attributes.name === 'parameter-definitions' && atribute._text) {
            equipment.paramsdef = tmplttoequipparam(atribute._text);
          }
        }
        equipment.input = xmlcontent.template.input;
        equipment.output = xmlcontent.template.output;
        equipment.filename = filename;
        // console.log (equipment);
      }
    }
  }
  return equiptypes;
}

// ---------------------------------- EqParameters 2022
function equipparamtostring(paramsdef) {
  let param = '';
  // для param_list без назви групи
  /* InternalIODevice=Internal;CicodeIODevice=Cicode;RunStatusFunc=RunStatus_Drive_GetValue;EqStatusFunc=EquipmentStatus_Drive_GetValue;CtrlMode=0;PVFunc=PV_Drive_GetValue;Range=L:0,H:100;Alarm=HH:95,H:85 */
  if (paramsdef.param_list) {
    for (const paramname in paramsdef.param_list) {
      param += `${paramname}=${paramsdef.param_list[paramname]};`;
    }
  }
  for (const paramgroupname in paramsdef) {
    if (paramgroupname !== 'param_list') {
      paramgroup = paramsdef[paramgroupname];
      param += `${paramgroupname}=`;
      for (paramname in paramgroup) {
        param += `${paramname}:${paramgroup[paramname]},`;
      }
      param = param.slice(0, -1);// убрати останню кому
      param += ';';
    }
  }
  return param;
}
function tmplttoequipparam(paramstring) {
  paramsdef = {};
  const params = paramstring.split(';');
  for (param of params) {
    const ar = param.split('=');
    const arname = ar[0].split('.');
    const grname = arname[0];
    if (!paramsdef[grname]) paramsdef[grname] = {};
    if (arname[1]) {
      paramsdef[grname][arname[1]] = ar[1] || '';
    }
  }
  return paramsdef;
}
function stringtoequipparam(paramstring) {
  paramsdef = {};
  // console.log (paramstring);
  const params = paramstring ? paramstring.split(';') : [];
  for (param of params) {
    const ar = param.split('=');
    if (ar[1]) { // якщо після дорівнює щось є
      if (ar[1].search(':') >= 0) { // якщо група поіменована
        const grname = ar[0];
        if (!paramsdef[grname]) paramsdef[grname] = {};
        const paras = ar[1].split(',');
        for (const para of paras) {
          const paraname = para.split(':')[0];
          const paraval = para.split(':')[1] || '';
          paramsdef[grname][paraname] = paraval;
        }
      } else { // якщо група параметрів без імені то це param_list
        if (!paramsdef.param_list) paramsdef.param_list = {};
        paramsdef.param_list[ar[0]] = ar[1];
      }
    } else if (ar[0].length > 0) { // якщо група параметрів без імені то це param_list
      if (!paramsdef.param_list) paramsdef.param_list = {};
      paramsdef.param_list[ar[0]] = '';
    }
  }
  return paramsdef;
}
// ---------------------------------- EqParameters 2023
function equipparamtotable2023(tablepara, equipment, paramsdef) {
  for (const groupname in paramsdef) {
    if (typeof paramsdef[groupname] === 'object') {
      const group = paramsdef[groupname];
      for (const paraname in group) {
        const record = {
          cluster: equipment.cluster || '',
          equip: equipment.name,
          group: groupname,
          name: paraname,
          value: group[paraname],
        };
        tablepara.push(record);
      }
    } else {
      const record = {
        cluster: equipment.cluster || '',
        equip: equipment.name,
        group: '',
        name: groupname,
        value: paramsdef[groupname],
      };
      tablepara.push(record);
    }
  }
  return tablepara;
}
function savechangedequipara(oldparas, newparas) {
  let sqlcmd = '';
  const oldvalues = {}; const
    newvalues = {};
  for (let i = 0; i < oldparas.length; i++) {
    const para = oldparas[i];
    const key = `${para.cluster}/${para.equip}/${para.group}/${para.name}`;
    oldvalues[key] = { i, value: para.value };
  }
  for (const para of newparas) {
    const key = `${para.cluster}/${para.equip}/${para.group}/${para.name}`;
    // інсує такий запис - модифікуємо
    if (oldvalues[key] && oldvalues[key].value != para.value) {
      sqlcmd += `UPDATE eqconfig SET eqconfig.value='${para.value}' `;
      sqlcmd += `WHERE cluster='${para.cluster}' AND equip='${para.equip}' AND group='${para.group}' AND name='${para.name}';\n`;
      // sqlcmd = "UPDATE eqconfig SET name='---';"
    } else if (!oldvalues[key]) {
      sqlcmd += `INSERT INTO eqconfig VALUES ('${para.cluster}','${para.equip}','${para.group}','${para.name}','${para.value}');\n`;
    }
  }
  if (sqlcmd.length > 0) {
    logmsg('Оновлюю таблицю з параметрами Equipment');
    logmsg(`Запускаю SQL команду на connstr = ${connstrprj} для зміни конфіг. параметрів`);
    runsql(connstrprj, sqlcmd, '', 'meq_cfgpara2023');
  }
}

module.exports = {
  create_equipment, create_hmi, create_varpages, create_mappages, create_actpages, create_actequipment, create_varequipment, create_modulequipment,
};
