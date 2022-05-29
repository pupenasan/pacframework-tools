const os = require("os");
const path = require("path");
const fs = require("fs");
const ini = require("ini"); //https://github.com/npm/ini#readme
const xmlparser = require("xml-js"); //https://www.npmjs.com/package/xml-js
const masterdatatools = require("./masterdatatools");
if (!global.userdir) global.userdir = path.normalize(os.homedir() + "/pacframeworktools");
if (!global.inipath) global.inipath = path.normalize(os.homedir() + "/pacframeworktools/config.ini");

const config = ini.parse(fs.readFileSync(global.inipath, "utf-8"));

const child_process = require( 'child_process' );//https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_synchronous_process_creation https://stackoverflow.com/questions/47218117/run-vbs-script-with-node 
const iconv = require('iconv-lite');
//const { rawListeners } = require('process');

//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;
const syncobs = masterdatatools.syncobs;

let pathmasterdbf = config.citecttools.pathmasterdbf;
let ctprojectname = config.citecttools.ctprojectname;
let pfwincludename = config.citecttools.pfwincludename; 
let cntelemetspergenie = config.citecttools.cntelemetspergenie; 
let ctprojectpath;
let pfwincludepath;
let plcsourcepath = config.citecttools.plcsourcepath;//файли типу plc_tags.json таа інші
let iodevicename = config.citecttools.iodevicename; 

let connstrprj;
let connstrpfw; 
let equiptypes;
let equiptable;
let equiprtpara;
let equipinstancetable;
let mastertags;
let masterchs;
let masterplcs;

const sqllogdir = global.userdir + '\\sql'; 
if  (!fs.existsSync(sqllogdir)) {
  fs.mkdirSync (sqllogdir);
  console.log ('Створив директорію ' + sqllogdir);  
} 

function create_equipment(){
  if (init()===1) {
    modulstoequipment();
    tagstoequipment();
    actstoequipment();
  }
  writetolog(1);  
}

function init(){
  masterdatatools.opts.logfile = "seunparsetools.log";
  masterdatatools.opts.source = config.citecttools.pathsource;
  masterdatatools.opts.logpath = config.citecttools.pathlog; 
  let prjsinfo = getprojectsinfo (pathmasterdbf);
  if (prjsinfo.tabbyidx[ctprojectname]) {
    ctprojectpath = prjsinfo.tabbyidx[ctprojectname].path.slice(0, -1);
    connstrprj = "Provider=VFPOLEDB.1;Data Source=" + ctprojectpath + ";Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;"
    logmsg (`Знайдено проект з іменем ${ctprojectname} в MASTER.DBF розміщення за шляхом ${ctprojectpath}`);    
  } else { 
    logmsg (`ERR: Не знайдено проекту з іменем ${ctprojectname} в MASTER.DBF! Перевірте налаштування конфігураційного файлу config.ini та наявність проекту в редакторі!`);
    return
  }

  if (prjsinfo.tabbyidx[pfwincludename]) {
    pfwincludepath = prjsinfo.tabbyidx[pfwincludename].path.slice(0, -1);
    connstrpfw = "Provider=VFPOLEDB.1;Data Source=" + pfwincludepath + ";Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;"
    logmsg (`Знайдено проект шаблонів ${pfwincludename} в MASTER.DBF розміщення за шляхом ${pfwincludepath}`);    
  } else { 
    logmsg (`ERR: Не знайдено проекту з іменем ${pfwincludename} в MASTER.DBF! Перевірте налаштування конфігураційного файлу config.ini та наявність проекту в редакторі!`);
    return
  }
  
  if (getincludesprj().tabbyidx[pfwincludename]) {
    logmsg (`Перевірка включеності шаблонного проекту ${pfwincludename} в ${ctprojectname} - ОК`);    
  } else { 
    logmsg (`ERR: Шаблонний проект ${pfwincludename} не включено в ${ctprojectname}! Включіть в список Include!`);
    return
  }  
  
  equiptypes = getequipmenttypesinfo (pfwincludepath);
  equiptable = getequipmentypetable(connstrpfw, 'name');
  equiprtpara = getequipparatable(connstrprj, 'value');
  equipinstancetable = getequipmenttable(connstrprj, 'tagprefix')
  //fs.writeFileSync ("c:/tmp/1.json",  JSON.stringify(equipinstancetable), 'utf8');
  if (Object.keys(equiptypes).length>0) {
    logmsg (`Отримано наступний перелік типів з включеного проекту:`);
    for (let equiptype in equiptypes) {
      equiptypes[equiptype].founded = (typeof equiptable.tabbyidx[equiptype]==='object');
      //console.log (equiptypes[equiptype]);
      logmsg (`- ${equiptypes[equiptype].name} в файлі ${equiptypes[equiptype].filename} `);
      if (equiptypes[equiptype].founded===false)  {
        //logmsg ('- WRN: Увага! Тип відсутній в базі даних типів!');
        logmsg ('- WRN: Увага! Тип відсутній в базі даних типів, добавляю!');
        let equipmentrecord = {};
        for (fieldname of equiptable.fields) {
          equipmentrecord[fieldname]=''
        }
        equipmentrecord.name = equiptype;
        equipmentrecord.template = equiptype + '.xml';
        addequipmentypeintable(connstrpfw, equipmentrecord);
        
      }
    }
  } else {
    logmsg (`ERR: Увага! Жодного типу у включеному проекті не знайдено! Перевірте правильність включеного проекту ${pfwincludename}!`);
    return 
  }

  let filetags = plcsourcepath + '\\' + "plc_tags.json";
  if (fs.existsSync(filetags)) {
    let content = fs.readFileSync(filetags, "utf8");
    mastertags = JSON.parse(content);
    logmsg (`Теги прочитано.`);
  } else {
    logmsg (`ERR: Не вдалося прочитати базу даних тегів з ${filetags}!`);
    return
  }
  let filechs = plcsourcepath + '\\' + "plc_chs.json";
  if (fs.existsSync(filechs)) {
    let content = fs.readFileSync(filechs, "utf8");
    masterchs = JSON.parse(content);
    logmsg (`Канали прочитано.`);
  } else {
    logmsg (`ERR: Не вдалося прочитати базу даних каналів з ${filechs}!`);
    return
  }  
  let fileplcs = plcsourcepath + '\\' + "plc_plcs.json";
  if (fs.existsSync(fileplcs)) {
    let content = fs.readFileSync(fileplcs, "utf8");
    masterplcs = JSON.parse(content);
    logmsg (`Інформацію по PLC отримано.`);
  } else {
    logmsg (`ERR: Не вдалося прочитати базу даних каналів з ${fileplcs}!`);
    return
  }  

  let fileacts = plcsourcepath + '\\' + "plc_acts.json";
  if (fs.existsSync(fileacts)) {
    let content = fs.readFileSync(fileacts, "utf8");
    masteracts = JSON.parse(content);
    logmsg (`Інформацію по ВМ отримано.`);
  } else {
    logmsg (`ERR: Не вдалося прочитати базу даних ВМ з ${fileacts}!`);
    return
  } 
  
  return 1  
}

function create_hmi(){
  if (init()===1) {
    create_varpages ();
    create_plcpage ();    
  }
  writetolog(1);    
}
function create_varpages(){
  let dis='', dos='', ais='', aos='';
  if (mastertags) {
    for (let tgname in mastertags.tags) {
      let equipment; 
      let tag = mastertags.tags[tgname];
      //AIVAR_HMI
      if (tag.type === 'DI') {
        dis+= tgname + ','
      }
      if (tag.type === 'AI') {
        ais+= tgname + ','
      }
      if (tag.type === 'DO') {
        dos+= tgname + ','
      }
      if (tag.type === 'AO') {
        aos+= tgname + ','
      }
    }
    dis = dis.slice(0, -1);
    ais = ais.slice(0, -1);
    dos = dos.slice(0, -1);
    aos = aos.slice(0, -1);
  }
  let paras = ['ctgraphbldrtools.vbs', 'create_varpages', ctprojectname, pfwincludename, dis, dos, ais, aos, cntelemetspergenie];
  //'C:\\Windows\\SysWOW64\\cscript.exe'
  logmsg ("Створюю джини для технологічних змінних, зачекайте, це може зайняти кілька хвилин ...");
  let vbs = child_process.spawnSync('cscript.exe' , paras, {stdio: ['pipe', 'pipe', process.stderr]});//{ stdio: [process.stdin, process.stdout, process.stderr] }
  str = iconv.decode(Buffer.from(vbs.stdout), 'win1251').split('----------');
  if (str.length>0) console.log (str[1]);
}

function create_plcpage(){
  let moduls='';
  if (masterchs) {
    for (let module of masterchs.modules) {
      moduls+= module.modid + ','
    }
    moduls = moduls.slice(0, -1)
  }
  let paras = ['ctgraphbldrtools.vbs', 'create_plcpage', ctprojectname, pfwincludename, moduls];
  logmsg ("Створюю джини для модулів, зачекайте, це може зайняти кілька хвилин ...");
  let vbs = child_process.spawnSync('cscript.exe' , paras, {stdio: ['pipe', 'pipe', process.stderr]});//{ stdio: [process.stdin, process.stdout, process.stderr] }
  str = iconv.decode(Buffer.from(vbs.stdout), 'win1251').split('----------');
  if (str.length>0) console.log (str[1]);
}



function getprojectsinfo (pathmasterdbf){
  let connstr = "Provider=VFPOLEDB.1;Data Source=" + pathmasterdbf + ";Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;"
  let sqlcmd = "SELECT * FROM MASTER.DBF";
  let records = runsql (connstr, sqlcmd, 'name');
  return records
}
function getincludesprj () {
  let sqlcmd = "SELECT * FROM include.DBF";
  let records = runsql (connstrprj, sqlcmd, 'name');
  return records
} 


//добавлення або оновлення Equipment тегами
function tagstoequipment () {
  //отримання мастерданих про теги
  logmsg (`----- Отримую інформацію про технологічні змінні ----------------`)
  let newequipments = {};
  let newequiprtpara = {};
  let typevarscheck = {AI: equiptypes.AIVAR_HMI, DI: equiptypes.DIVAR_HMI, DO: equiptypes.DOVAR_HMI, AO: equiptypes.AOVAR_HMI, VARBUF: equiptypes.VARBUF};
  //перевірка на валідність 
  if (typeof (typevarscheck.AI) === 'object') {
    if (!equiptypes.AIVAR_HMI.paramsdef || !equiptypes.AIVAR_HMI.paramsdef.PFW || !equiptypes.AIVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.AI = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AIVAR_HMI!`);
    } else {logmsg ('AIVAR_HMI - ok!')}
  }else {
    logmsg (`WRN: Не знайдено необхідні типи для AI зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.DI) === 'object') {
    if (!equiptypes.DIVAR_HMI.paramsdef || !equiptypes.DIVAR_HMI.paramsdef.PFW || !equiptypes.DIVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.DI = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DIVAR_HMI!`);
    } else {logmsg ('DIVAR_HMI - ok!')}    
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для DI зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.DO) === 'object') {
    if (!equiptypes.DOVAR_HMI.paramsdef || !equiptypes.DOVAR_HMI.paramsdef.PFW || !equiptypes.DOVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.DO = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DOVAR_HMI!`);
    } else {logmsg ('DOVAR_HMI - ok!')}
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для DO зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.AO) === 'object') {
    if (!equiptypes.AOVAR_HMI.paramsdef || !equiptypes.AOVAR_HMI.paramsdef.PFW || !equiptypes.AOVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.AO = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AOVAR_HMI!`);
    } else {logmsg ('AOVAR_HMI - ok!')}
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для AO зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.VARBUF) === 'object') {
    logmsg ('VARBUF - ok!')
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для VARBUF зміна Equipment дя нього не буде відбуватися!`);
  }              

  let filetags = plcsourcepath + '\\' + "plc_tags.json";
  if (mastertags) {
    for (let tgname in mastertags.tags) {
      let equipment; 
      let tag = mastertags.tags[tgname];
      if (!tag.plchmi) {
        logmsg (`ERR: У змінній ${tgname} вдсутня структура plchmi! Змінну ігнорую!`);
        continue
      }
      if (!tag.plchmi.adr) {
        logmsg (`ERR: У змінні ${tgname} вдсутня адреса в plchmi! Ставлю пусту!`);
        tag.plchmi.adr = '';
      }      
      //AIVAR_HMI
      if (tag.type === 'AI' && typevarscheck.AI) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'AIVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        equipment.content = 'FP_AI'
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AIVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        let valuepara = tgname + '_PLCLimits'// Equipment runtime parameters
        newequiprtpara[valuepara] = {name:'PLCLimits', value: valuepara};
        //console.log (equipment);
      }
      //DIVAR_HMI
      if (tag.type === 'DI' && typevarscheck.DI) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'DIVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DIVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }
      //DOVAR_HMI
      if (tag.type === 'DO' && typevarscheck.DO) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'DOVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DOVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }
      //AOVAR_HMI
      if (tag.type === 'AO' && typevarscheck.AO) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'AOVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AOVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }            
    } 
    if (typevarscheck.VARBUF){
      let varbuf = mastertags.varbuf;
      let equipment = newequipments.VARBUF = {};
      equipment.type = 'VARBUF';
      equipment.comment = 'Тег для буферу технологічної змінної';
      equipment.alias = 'VARBUF';
      let startadr = varbuf.adr.replace('%MW','').split('.')[0];
      equipment.custom1 = startadr;      
    }
  }

  logmsg (`----- Модифікую таблицю Equipment технологічними змінними в проекті ${ctprojectpath} ----------------`)
  modifyequipments (newequipments, newequiprtpara);
} 

//добавлення або оновлення Equipment тегами
function tagstoequipment () {
  //отримання мастерданих про теги
  logmsg (`----- Отримую інформацію про технологічні змінні ----------------`)
  let newequipments = {};
  let newequiprtpara = {};
  let typevarscheck = {AI: equiptypes.AIVAR_HMI, DI: equiptypes.DIVAR_HMI, DO: equiptypes.DOVAR_HMI, AO: equiptypes.AOVAR_HMI, VARBUF: equiptypes.VARBUF};
  //перевірка на валідність 
  if (typeof (typevarscheck.AI) === 'object') {
    if (!equiptypes.AIVAR_HMI.paramsdef || !equiptypes.AIVAR_HMI.paramsdef.PFW || !equiptypes.AIVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.AI = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AIVAR_HMI!`);
    } else {logmsg ('AIVAR_HMI - ok!')}
  }else {
    logmsg (`WRN: Не знайдено необхідні типи для AI зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.DI) === 'object') {
    if (!equiptypes.DIVAR_HMI.paramsdef || !equiptypes.DIVAR_HMI.paramsdef.PFW || !equiptypes.DIVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.DI = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DIVAR_HMI!`);
    } else {logmsg ('DIVAR_HMI - ok!')}    
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для DI зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.DO) === 'object') {
    if (!equiptypes.DOVAR_HMI.paramsdef || !equiptypes.DOVAR_HMI.paramsdef.PFW || !equiptypes.DOVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.DO = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DOVAR_HMI!`);
    } else {logmsg ('DOVAR_HMI - ok!')}
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для DO зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.AO) === 'object') {
    if (!equiptypes.AOVAR_HMI.paramsdef || !equiptypes.AOVAR_HMI.paramsdef.PFW || !equiptypes.AOVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.AO = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AOVAR_HMI!`);
    } else {logmsg ('AOVAR_HMI - ok!')}
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для AO зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.VARBUF) === 'object') {
    logmsg ('VARBUF - ok!')
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для VARBUF зміна Equipment дя нього не буде відбуватися!`);
  }              

  let filetags = plcsourcepath + '\\' + "plc_tags.json";
  if (mastertags) {
    for (let tgname in mastertags.tags) {
      let equipment; 
      let tag = mastertags.tags[tgname];
      if (!tag.plchmi) {
        logmsg (`ERR: У змінній ${tgname} вдсутня структура plchmi! Змінну ігнорую!`);
        continue
      }
      if (!tag.plchmi.adr) {
        logmsg (`ERR: У змінні ${tgname} вдсутня адреса в plchmi! Ставлю пусту!`);
        tag.plchmi.adr = '';
      }      
      //AIVAR_HMI
      if (tag.type === 'AI' && typevarscheck.AI) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'AIVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        equipment.content = 'FP_AI'
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AIVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        let valuepara = tgname + '_PLCLimits'// Equipment runtime parameters
        newequiprtpara[valuepara] = {name:'PLCLimits', value: valuepara};
        //console.log (equipment);
      }
      //DIVAR_HMI
      if (tag.type === 'DI' && typevarscheck.DI) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'DIVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DIVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }
      //DOVAR_HMI
      if (tag.type === 'DO' && typevarscheck.DO) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'DOVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DOVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }
      //AOVAR_HMI
      if (tag.type === 'AO' && typevarscheck.AO) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'AOVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AOVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }            
    } 
    if (typevarscheck.VARBUF){
      let varbuf = mastertags.varbuf;
      let equipment = newequipments.VARBUF = {};
      equipment.type = 'VARBUF';
      equipment.comment = 'Тег для буферу технологічної змінної';
      equipment.alias = 'VARBUF';
      let startadr = varbuf.adr.replace('%MW','').split('.')[0];
      equipment.custom1 = startadr;      
    }
  }

  logmsg (`----- Модифікую таблицю Equipment технологічними змінними в проекті ${ctprojectpath} ----------------`)
  modifyequipments (newequipments, newequiprtpara);
} 

//добавлення або оновлення Equipment ВМ
function actstoequipment () {
  //отримання мастерданих про ВМ
  logmsg (`----- Отримую інформацію про ВМ ----------------`)
  let newequipments = {};
  let newequiprtpara = {};
  return

  let typevarscheck = {AI: equiptypes.ACT_HMI, DI: equiptypes.DIVAR_HMI, DO: equiptypes.DOVAR_HMI, AO: equiptypes.AOVAR_HMI, VARBUF: equiptypes.VARBUF};
  //перевірка на валідність 
  if (typeof (typevarscheck.AI) === 'object') {
    if (!equiptypes.AIVAR_HMI.paramsdef || !equiptypes.AIVAR_HMI.paramsdef.PFW || !equiptypes.AIVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.AI = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AIVAR_HMI!`);
    } else {logmsg ('AIVAR_HMI - ok!')}
  }else {
    logmsg (`WRN: Не знайдено необхідні типи для AI зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.DI) === 'object') {
    if (!equiptypes.DIVAR_HMI.paramsdef || !equiptypes.DIVAR_HMI.paramsdef.PFW || !equiptypes.DIVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.DI = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DIVAR_HMI!`);
    } else {logmsg ('DIVAR_HMI - ok!')}    
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для DI зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.DO) === 'object') {
    if (!equiptypes.DOVAR_HMI.paramsdef || !equiptypes.DOVAR_HMI.paramsdef.PFW || !equiptypes.DOVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.DO = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для DOVAR_HMI!`);
    } else {logmsg ('DOVAR_HMI - ok!')}
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для DO зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.AO) === 'object') {
    if (!equiptypes.AOVAR_HMI.paramsdef || !equiptypes.AOVAR_HMI.paramsdef.PFW || !equiptypes.AOVAR_HMI.paramsdef.PFW.ID) { 
      typevarscheck.AO = undefined;
      logmsg (`WRN: Не знайдено необхідний конфігураційний параметр PFW.ID для AOVAR_HMI!`);
    } else {logmsg ('AOVAR_HMI - ok!')}
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для AO зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.VARBUF) === 'object') {
    logmsg ('VARBUF - ok!')
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для VARBUF зміна Equipment дя нього не буде відбуватися!`);
  }              

  let filetags = plcsourcepath + '\\' + "plc_tags.json";
  if (mastertags) {
    for (let tgname in mastertags.tags) {
      let equipment; 
      let tag = mastertags.tags[tgname];
      if (!tag.plchmi) {
        logmsg (`ERR: У змінній ${tgname} вдсутня структура plchmi! Змінну ігнорую!`);
        continue
      }
      if (!tag.plchmi.adr) {
        logmsg (`ERR: У змінні ${tgname} вдсутня адреса в plchmi! Ставлю пусту!`);
        tag.plchmi.adr = '';
      }      
      //AIVAR_HMI
      if (tag.type === 'AI' && typevarscheck.AI) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'AIVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        equipment.content = 'FP_AI'
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AIVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        let valuepara = tgname + '_PLCLimits'// Equipment runtime parameters
        newequiprtpara[valuepara] = {name:'PLCLimits', value: valuepara};
        //console.log (equipment);
      }
      //DIVAR_HMI
      if (tag.type === 'DI' && typevarscheck.DI) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'DIVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DIVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }
      //DOVAR_HMI
      if (tag.type === 'DO' && typevarscheck.DO) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'DOVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.DOVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }
      //AOVAR_HMI
      if (tag.type === 'AO' && typevarscheck.AO) {
        equipment = newequipments[tgname] = {};
        equipment.type = 'AOVAR_HMI';
        equipment.comment = tag.descr;
        equipment.alias = tgname;
        //параметри
        paramsdef = JSON.parse(JSON.stringify(equiptypes.AOVAR_HMI.paramsdef));  
        paramsdef.PFW.ID =  tag.id;
        equipment.param = equipparamtostring (paramsdef);
        let startadr = tag.plchmi.adr.replace('%MW','').split('.')[0];
        equipment.custom1 = startadr;
        //console.log (equipment);
      }            
    } 
    if (typevarscheck.VARBUF){
      let varbuf = mastertags.varbuf;
      let equipment = newequipments.VARBUF = {};
      equipment.type = 'VARBUF';
      equipment.comment = 'Тег для буферу технологічної змінної';
      equipment.alias = 'VARBUF';
      let startadr = varbuf.adr.replace('%MW','').split('.')[0];
      equipment.custom1 = startadr;      
    }
  }

  logmsg (`----- Модифікую таблицю Equipment технологічними змінними в проекті ${ctprojectpath} ----------------`)
  modifyequipments (newequipments, newequiprtpara);
} 

//добавлення або оновлення Equipment по PLC, CH
function modulstoequipment () {
  //отримання мастерданих про канали
  logmsg (`----- Отримую інформацію про канали ----------------`)
  let newequipments = {};
  let newequiprtpara = {};
  let typevarscheck = {MODULE: equiptypes.MODULE, SUBMODULE: equiptypes.SUBMODULE, 
    CH_BUF: equiptypes.CH_BUF, PLC: equiptypes.PLC, PARASTOHMI: equiptypes.PARASTOHMI};
  //перевірка на валідність 
  //console.log (typevarscheck);process.exit();
  if (typeof (typevarscheck.MODULE) === 'object') {
    logmsg ('MODULE - ok!')
  }else {
    logmsg (`WRN: Не знайдено необхідні типи для MODULE зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.SUBMODULE) === 'object') {
    logmsg ('SUBMODULE - ok!')    
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для SUBMODULE зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.CH_BUF) === 'object') {
    logmsg ('CH_BUF - ok!')
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для CH_BUF зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.PLC) === 'object') {
    logmsg ('PLC - ok!')
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для PLC зміна Equipment дя нього не буде відбуватися!`);
  }
  if (typeof (typevarscheck.PARASTOHMI) === 'object') {
    logmsg ('PARASTOHMI - ok!')
  } else {
    logmsg (`WRN: Не знайдено необхідні типи для PLC зміна Equipment дя нього не буде відбуватися!`);
  }

  if (masterchs) {
    let i=0;
    for (let module of masterchs.modules) {
      let modulename = 'MODULE' + i; 
      let equipment; 
      equipment = newequipments[modulename] = {};
      equipment.type = 'MODULE';
      equipment.comment = module.modid;
      equipment.alias = module.modid;
      //equipment.content = 'FP_AI'
      let startadr = module.adr.replace('%MW','').split('.')[0];
      equipment.custom1 = startadr;
      //console.log (equipment);
      i++
    }
    newequipments.CH_BUF = {type: 'CH_BUF', custom1: masterchs.chbuf.adr.replace('%MW','').split('.')[0]};
    newequipments.SUBMODULE = {type: 'SUBMODULE', custom1: masterchs.submodulebuf.adr.replace('%MW','').split('.')[0]};
    newequipments.PLC = {type: 'PLC', custom1: masterplcs.plc.adr.replace('%MW','').split('.')[0]};
    newequipments.PARASTOHMI = {type: 'PARASTOHMI', custom1: masterplcs.parastohmi.adr.replace('%MW','').split('.')[0]};

  }

  logmsg (`----- Модифікую таблицю Equipment модулями в проекті ${ctprojectpath} ----------------`)
  modifyequipments (newequipments, newequiprtpara);
} 


function getequipmenttable(connstr, idx) {
  let sqlcmd = "SELECT * FROM equip.DBF";
  let records = runsql (connstr, sqlcmd, idx, 'equip');
  return records
}
function getequipmentypetable(connstr, idx) {
  let sqlcmd = "SELECT * FROM eqtype.DBF";
  let records = runsql (connstr, sqlcmd, idx, 'eqtype');
  return records
}
function addequipmentypeintable(connstr, equipmentrecord) {
  let vals = '';
  for (let fieldname in equipmentrecord) {vals+="'" + equipmentrecord[fieldname] + "',"}
  let sqlcmd =`INSERT INTO eqtype VALUES (${vals.slice(0, -1)}); `;
  //console.log (sqlcmd); process.exit();
  let records = runsql (connstr, sqlcmd);
}
function getequipparatable (connstr, idx) {
  let sqlcmd = "SELECT * FROM eqparam.DBF";
  let records = runsql (connstr, sqlcmd, idx, 'eqparam');
  return records
}

//добавляє нові або замінює існуючі equipment за полем TAGPREFIX
function modifyequipments(newequipments, newequiprtpara) { 
  let oldequipments = equipinstancetable.tabbyidx;
  let oldequiprtpara = equiprtpara.tabbyidx;
  let sqlcmd = '';
  let tagprefix1;
  for (let tagprefix in newequipments){
    if (!tagprefix1) tagprefix1 = tagprefix;
    if (!newequipments[tagprefix].tagprefix) newequipments[tagprefix].tagprefix = tagprefix;   
    if (oldequipments[tagprefix]) {
      logmsg (`Знайдено запис для префіксу ${tagprefix} модифікую існуючі в майстердані поля`);
      sqlcmd += `UPDATE equip SET`;      
      //пусті поля по дефолту
      if (oldequipments[tagprefix].iodevice.length<1) newequipments[tagprefix].iodevice=iodevicename;
      //оновлення параметрів
      if (!newequipments[tagprefix].name || newequipments[tagprefix].name.length<1) newequipments[tagprefix].name = oldequipments[tagprefix].name;
      if (!newequipments[tagprefix].cluster || newequipments[tagprefix].cluster.length<1) newequipments[tagprefix].cluster = oldequipments[tagprefix].cluster;
      let oldpara = stringtoequipparam (oldequipments[tagprefix].param);
      let newpara = stringtoequipparam (newequipments[tagprefix].param);
      for (let grparaname in newpara) {for (let paraname in newpara[grparaname]){ 
        if (oldpara[grparaname] && oldpara[grparaname][paraname] && newpara[grparaname][paraname].length<1){
          newpara[grparaname][paraname]=oldpara[grparaname][paraname] //залишаємо попередній
        }
      }}
      newequipments[tagprefix].param = equipparamtostring(newpara);     
      for (let fieldname in newequipments[tagprefix]){
        sqlcmd += ` ${fieldname.toUpperCase()}='${newequipments[tagprefix][fieldname]}',`
      }
      if (sqlcmd[sqlcmd.length-1] ===',') sqlcmd = sqlcmd.slice(0, -1);//убрати останню кому
      sqlcmd += ` WHERE tagprefix='${tagprefix}';\n`;
    } else {
      vals = '';
      logmsg (`Не знайдено запису для префіксу ${tagprefix} добавляю новий`);  
      if (!newequipments[tagprefix].name) newequipments[tagprefix].name = 'temp.' + tagprefix;
      for (let fieldname of equipinstancetable.fields) {
        if (!newequipments[tagprefix][fieldname]) {
          newequipments[tagprefix][fieldname] = '';
          if (fieldname==='iodevice') newequipments[tagprefix].iodevice=iodevicename;             
        }
        vals += `'${newequipments[tagprefix][fieldname]}',`;
      }
      if (vals[vals.length-1] ===',') vals = vals.slice(0, -1);//убрати останню кому 
      sqlcmd += `INSERT INTO equip VALUES (${vals});\n`;
    }
    //знайдено існуючі, треба модифікувати equipment name якщо вони відрізняються
    let rtparavalue = tagprefix+'_PLCLimits';
    if (newequiprtpara[rtparavalue] && oldequiprtpara[rtparavalue] && newequiprtpara[rtparavalue].equip && oldequiprtpara[rtparavalue].equip !== newequiprtpara[rtparavalue].equip){
      logmsg (`Змінилася назва quipment для префіксу ${tagprefix} з ${oldequiprtpara[tagprefix].name} на ${newequiprtpara[tagprefix].name} змінюю параметри виконання quipment`);    
      sqlcmd += `UPDATE equip SET equip=` + newequiprtpara[rtparavalue].equip + ` WHERE value='${rtparavalue}';\n`;
    } else if (newequipments[tagprefix].type === 'AIVAR_HMI' && !oldequiprtpara[rtparavalue]){//добавити нові
      logmsg (`Добавляю параметр виконання для ${newequipments[tagprefix].name}`);
      vals = '';
      newequiprtpara[rtparavalue].cluster=newequipments[tagprefix].cluster;
      newequiprtpara[rtparavalue].equip=newequipments[tagprefix].name;
      newequiprtpara[rtparavalue].istag='TRUE';      
      for (let fieldname of equiprtpara.fields) {
        //console.log (fieldname);
        if (!newequiprtpara[rtparavalue][fieldname]) {
          newequiprtpara[rtparavalue][fieldname] = '';             
        }
        vals += `'${newequiprtpara[rtparavalue][fieldname]}',`;
      }
      if (vals[vals.length-1] ===',') vals = vals.slice(0, -1);//убрати останню кому       
      sqlcmd += `INSERT INTO eqparam VALUES (${vals});\n`;
    } 
  }
  //console.log (sqlcmd);
  if (sqlcmd.length>0) runsql (connstrprj, sqlcmd, '' , 'meq_' + tagprefix1 );
}

//запуска SQL запит і повертає records з інформацією про результат 
function runsql (connstr, sqlcmd, idx, tabfilename = 'table'){
  let paras;
  let sqlcmdfilename = `${sqllogdir}\\${tabfilename}_req.sql`; 
  tabfilename = `${sqllogdir}\\${tabfilename}.txt`;
  try {
    let buf = iconv.encode(sqlcmd, 'win1251');
    fs.writeFileSync (sqlcmdfilename, buf);
  } catch (error) {
    logmsg (`ERR: Помилка запису SQL запиту в файл ${sqlcmdfilename}!`)
    return 
  }  
  paras = ['dbasetools.vbs', 'runsql', connstr, sqlcmdfilename, tabfilename];
  let vbs = child_process.spawnSync('C:\\Windows\\SysWOW64\\cscript.exe' , paras, {stdio: [`pipe`, `pipe`, process.stderr]});//{ stdio: [process.stdin, process.stdout, process.stderr] }
  let records = {table:[], fields:[], tabbyidx:{}, type: 'undefined', msg:[]};
  try {
    let buf = fs.readFileSync (tabfilename); 
    if (buf) {
      str = iconv.decode(Buffer.from(buf), 'win1251');
      //виділення повідомлень 
      let vbmsg = str.split('MSG{')[1];
      if (vbmsg) records.msg.push (vbmsg.split('}MSG')[0]);
      //визначення типу відповіді на запит
      let rettype = str.split('TYPE{')[1];
      if (rettype) records.type = rettype.split('}TYPE')[0];  
    }      
  } catch (error) {
    if (sqlcmd.search('SELECT')===0) logmsg (`WRN: Не знайдено записів по запиту до таблиці ${tabfilename}`)
  }
  if (records.type==='TABLE') {
    tabtoob (records, str, idx);
  }
  return records  
}

//перетворює запарсену відповідь з VB в records
function tabtoob (records, str, idx) {
  let headerraw =  str.split('HEADER{');
  let header;
  if (headerraw[1]) {
    header = headerraw[1].split('}HEADER')[0].split('<|||>')
    let tabraw = str.split('STARTTABLE{');
    let tabrows;
    records.fields = header;
    if (tabraw[1]) {
      tabrows = tabraw[1].split('}ENDTABLE')[0].split('\n');//('<===>');
      for (row of tabrows) {
        let ar = row.split ('<|||>');
        let record1 = {};
        for (let i=0; i<ar.length; i++){
          record1[header[i]] = ar[i].replace(/\s+$/gm,'');//витирає пробіли в кінці
        }
        records.table.push (record1);
        //якщо є індексне поле 
        if (idx && record1[idx]) {
          records.tabbyidx[record1[idx]] = record1;
        } 
      }
    } else {  
      records.type = 'NULTABLE';
      records.msg.push ('Повернена пуста таблиця')
    }    
  } else {
    records.msg.push ('Невірний формат поверненої таблиці в запиті - не знайдено заголовки полів');
    return records
  }
  
  return records
} 
//повертає розпарсений XML-тип
function getequipmenttypesinfo (projectpath){
  //отримання інофрмацію про всі типи Equipment
  let filenames = fs.readdirSync(projectpath);
  let xmlcontent;
  let equiptypes = {};
  for (let filename of filenames) {
    let ext = path.extname(filename).toLowerCase();
    if (ext === '.xml') { 
      let content = fs.readFileSync(projectpath + '\\' + filename, "utf8"); 
      try {
        xmlcontent = xmlparser.xml2js(content, {compact: true,spaces: 4});
        if (xmlcontent.template && xmlcontent.template.input && xmlcontent.template.input._attributes && xmlcontent.template.input._attributes.name === 'equipment') {
          //equiptypes[xmlcontent.template.param]
          let equipment = {};
          //console.log (xmlcontent.template.param.string)
          for (let atribute of xmlcontent.template.param.string){
            if (atribute._attributes.name === 'name' && atribute._text) equipment = equiptypes[atribute._text] = {name: atribute._text};
            if (atribute._attributes.name === 'parameter-definitions' && atribute._text) {
              equipment.paramsdef = tmplttoequipparam(atribute._text); 
            }
          }
          equipment.input = xmlcontent.template.input;
          equipment.output = xmlcontent.template.output;
          equipment.filename = filename;
          //console.log (equipment);
        }        
      } catch (error) {
        logmsg (`WRN: Не вдалося відкрити файл ${projectpath + '\\' + filename} із за причини ${error}!`) 
        //console.log (filename); 
      }

    } 
  }
  return equiptypes;
}

function equipparamtostring (paramsdef){
  let param = '';
  //для param_list без назви групи
  /*InternalIODevice=Internal;CicodeIODevice=Cicode;RunStatusFunc=RunStatus_Drive_GetValue;EqStatusFunc=EquipmentStatus_Drive_GetValue;CtrlMode=0;PVFunc=PV_Drive_GetValue;Range=L:0,H:100;Alarm=HH:95,H:85*/
  if (paramsdef.param_list) {
    for (let paramname in paramsdef.param_list) {
      param += `${paramname}=${paramsdef.param_list[paramname]};`;
    }
  }
  for (let paramgroupname in paramsdef) {
    if (paramgroupname!=='param_list'){
      paramgroup = paramsdef[paramgroupname];
      param += `${paramgroupname}=`;  
      for (paramname in paramgroup) {
        param += `${paramname}:${paramgroup[paramname]},`;
      }
      param = param.slice(0, -1);//убрати останню кому
      param +=';';
    }
  }
  return param;
}
function tmplttoequipparam (paramstring){
  paramsdef = {};
  let params = paramstring.split(';');
  for (param of params) {
    let ar = param.split('=');
    let arname = ar[0].split('.');
    let grname = arname[0];
    if (!paramsdef[grname]) paramsdef[grname] = {};
    if (arname[1] ) {
      paramsdef[grname][arname[1]] = ar[1] || ''; 
    }       
  }
  return paramsdef
}
function stringtoequipparam (paramstring){
  paramsdef = {};
  //console.log (paramstring);
  let params = paramstring ? paramstring.split(';') : [];
  for (param of params) {
    let ar = param.split('=');
    if (ar[1]) {//якщо після дорівнює щось є
      if (ar[1].search(':')>=0){//якщо група поіменована
        let grname = ar[0];
        if (!paramsdef[grname]) paramsdef[grname] = {};
        let paras = ar[1].split(',');
        for (let para of paras){
          let paraname = para.split(':')[0];
          let paraval = para.split(':')[1] || '';
          paramsdef[grname][paraname] = paraval;   
        } 
      } else {//якщо група параметрів без імені то це param_list 
        if (!paramsdef['param_list']) paramsdef['param_list'] = {};
        paramsdef['param_list'][ar[0]] = ar[1]      
      }
    } else if (ar[0].length>0)  {//якщо група параметрів без імені то це param_list 
      if (!paramsdef['param_list']) paramsdef['param_list'] = {};
      paramsdef['param_list'][ar[0]] = ''            
    }
  }
  return paramsdef
}

module.exports = {
  create_equipment, create_hmi
};