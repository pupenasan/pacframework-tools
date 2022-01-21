/* модуль для конвертування змісту проекту TIA в Master Data
*/
const path = require ('path');
const fs = require ('fs');
const xmlparser = require('xml-js'); //https://www.npmjs.com/package/xml-js
const masterdatatools = require('./masterdatatools');
const ini = require('ini');//https://github.com/npm/ini#readme 
const config = ini.parse (fs.readFileSync(global.inipath, 'utf-8'));

const opts = {
  logpath: 'log',
  logfile: 'tiaparsetools.log',
  clsiddefault: {
    var : 0x10F0,
    divar : 0x1010,
    dovar : 0x1020,
    aivar : 0x1030,
    aovar : 0x1040,
    ch : 0x00F0,
    chdi : 0x0010,
    chdo : 0x0020,
    chai : 0x0030,
    chao : 0x0040,
    act : 0x20F0
  }
};



masterdatatools.opts.logfile = 'tiaparsetools.log'; 
masterdatatools.opts.source = config.tiaparsetools.pathsource;
masterdatatools.opts.logpath = config.tiaparsetools.pathlog;


//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;
const syncobs = masterdatatools.syncobs;

//парсить усі файли
function tiaparseall () {
  const tiasoucefiles = path.normalize(config.tiaparsetools.pathsource + '/');
  const tiaresultfiles = path.normalize(config.tiaparsetools.pathresult + '/');

  for (optname in opts.clsiddefault) {
    opts.clsiddefault[optname] = config.tiaparsetools.clsiddefault[optname]
  }

  logmsg ('-------------------- Отримання мастерданих з TIA про PLCs'); 
  let plcs = {};
  let listfiles =  {
    udtfiles : config.tiaparsetools.plc_udtfiles.replace(/ /g, '').split(','),
    xmlcfgfile : config.tiaparsetools.plc_xmlcfgfile.replace(/ /g, '').split(','),
  }  
  plc_to_plcs (plcs, tiasoucefiles, listfiles);
  logmsg ('plc_to_plcs оброблено');
  fs.writeFileSync (tiaresultfiles + 'plc_plcs.json', JSON.stringify (plcs), 'utf8');

  logmsg ('-------------------- Отримання мастерданих з TIA про канали'); 
  let plchs = {iocfg:{}};
  listfiles =  {
    udtfiles : config.tiaparsetools.ch_udtfiles.replace(/ /g, '').split(','),
    xmlcfgfiles : config.tiaparsetools.ch_xmlcfgfiles.replace(/ /g, '').split(','),
    xmlhmifiles : config.tiaparsetools.ch_xmlhmifiles.replace(/ /g, '').split(','),
    xmlbuffile : config.tiaparsetools.ch_xmlbuffile,
    xmlsubmodulefile: config.tiaparsetools.ch_submodulefile,
    xmlmodulesfile: config.tiaparsetools.ch_xmlmodulefile
  }  
  plc_to_chs (plchs, tiasoucefiles, listfiles);
  logmsg ('plc_to_chs оброблено');

  logmsg ('-------------------- Отримання даних про відображення каналів на модулі'); 
  PLCMAPS_to_chs (plchs, tiasoucefiles + 'PLCMAPS.scl')
  logmsg ('PLCMAPS_to_chs оброблено'); 

  logmsg ('-------------------- Отримання мастерданих з TIA про теги'); 
  plctags = {};
  listfiles =  {udtfiles : config.tiaparsetools.var_udtfiles.replace(/ /g, '').split(','),
      xmlcfgfiles : config.tiaparsetools.var_xmlcfgfiles.replace(/ /g, '').split(','),
      xmlhmifiles : config.tiaparsetools.var_xmlhmifiles.replace(/ /g, '').split(','),
      xmlbuffile : config.tiaparsetools.var_xmlbuffile      
  }
  plcvars_to_tags (plctags, tiasoucefiles, listfiles);
  logmsg ('plcvars_to_tags оброблено');     

  logmsg ('-------------------- Формування таблиці відображення тегів на канали');
  masterdatatools.chsmap_fromplc (plchs, plctags);
  masterdatatools.iomapplcform_togenform (plchs);
  if  (fs.existsSync(tiaresultfiles) === false) {
    fs.mkdirSync (tiaresultfiles);
    console.log ('Створив директорію ' + tiaresultfiles);  
  } 
  fs.writeFileSync (tiaresultfiles + 'plc_chs.json', JSON.stringify (plchs), 'utf8');
  fs.writeFileSync (tiaresultfiles + 'plc_tags.json', JSON.stringify (plctags), 'utf8');

  logmsg ('-------------------- Отримання мастерданих з TIA про ВМ'); 
  plcacts = {};
  let acttypes = config.tiaparsetools.act_udtfiles.replace(/ /g, '').split(',');
  listfiles = {
    udtfiles: [], 
    xmlcfgfiles : config.tiaparsetools.act_xmlcfgfiles.replace(/ /g, '').split(','),
    xmlhmifiles : config.tiaparsetools.act_xmlhmifiles.replace(/ /g, '').split(','),
    xmlbuffile : config.tiaparsetools.act_xmlbuffile
  };
  listfiles.udtfiles = []
  for (let acttype of acttypes) {
    listfiles.udtfiles.push (acttype + '_STA');
    listfiles.udtfiles.push (acttype + '_CFG');
    listfiles.udtfiles.push (acttype + '_ALM');
  }
  listfiles.udtfiles.push ('ACTTR_CMD');
  listfiles.udtfiles.push ('ACTTR_PRM');
  plcacts_toacts(plcacts, tiasoucefiles, listfiles);
  logmsg ('plcacts_toacts оброблено');
  fs.writeFileSync (tiaresultfiles + 'plc_acts.json', JSON.stringify (plcacts), 'utf8');

  logmsg ('-------------------- Отримання інофрмації про IoTBuf'); 
  let iot = {};
  listfiles =  {
    xmlbuffile : config.tiaparsetools.iot_xmlbuffile.replace(/ /g, '').split(','),
  }  
  parseiotbuf (iot, tiasoucefiles, listfiles);
  logmsg ('iot оброблено');
  fs.writeFileSync (tiaresultfiles + 'plc_iot.json', JSON.stringify (iot), 'utf8');

  writetolog (1);
  return {plchs, plctags, plcacts, iot, plcs}
}

//заносить інформацію про IoT Buffer
function parseiotbuf (iotplc, pathfiles, listfiles) {
  let xmlcontent, parsedata;
  parsedata = {};
  //отримання інфорфмації з CFG
  let xmlbuffile = listfiles.xmlbuffile;// 
  xmlbuffile = pathfiles + xmlbuffile ;
  logmsg (`Читаю файл ${xmlbuffile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlbuffile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з IOTBUF`); 
  let dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlbuffile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');

  //Беру тільки потрібний контент
  if (!dbcmplt.data.IOTBUF) {
    logmsg (`Не знайдено об'єкт IOTBUF у файлі`);
    return
  }
  let parseiotbuf = dbcmplt.data.IOTBUF;
  startadrbyte = multilevel_adrparse (parseiotbuf,  dbcmplt.dbnum);
  parseiotbuf.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
  
  //меппінг на память
  if (parseiotbuf.adr){
    if (!iotplc.memmap) iotplc.memmap = {};
    if (!iotplc.memmap[dbcmplt.dbnum]) iotplc.memmap[dbcmplt.dbnum] = {};
    iotplc.memmap[dbcmplt.dbnum][startadrbyte] = 'iotbuf';  
  }
  iotplc.iotbuf = parseiotbuf;    
} 



//заносить інформацію про PLC в masterplcs 
//ромзіщених в файлах listfiles по шляху pathfiles
function plc_to_plcs (masterplcs, pathfiles, listfiles) {
  let xmlcontent, parsedata;
  parsedata = {};
 
  //отримання структур
  if (typeof (masterplcs.types) !== "object") {masterplcs.types = {}};//пошук структур якщо вони вже є в метаданих
  let udtfiles = listfiles.udtfiles;
  for (let i=0; i<udtfiles.length; i++) {
    udtfiles[i] = pathfiles + udtfiles[i] + '.udt';
    logmsg (`Отримую структуру з ${ udtfiles[i]}`);   
    parsetypeudt (udtfiles[i], masterplcs.types);
  }

  //отримання інфорфмації з CFG
  let xmlcfgfile = listfiles.xmlcfgfile;// 
  xmlcfgfile = pathfiles + xmlcfgfile ;
  logmsg (`Читаю файл ${xmlcfgfile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlcfgfile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з CFG`); 
  dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlcfgfile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
  PLCCFG_to_plcs (dbcmplt, masterplcs);
  
}
function PLCCFG_to_plcs (dbcmplt, masterplcs) {
  //Беру тільки потрібний контент
  if (!dbcmplt.data.PLCCFG) {
    logmsg (`Не знайдено об'єкт PLCCFG у файлі`);
    return
  }          
  let parseplc = dbcmplt.data.PLCCFG;
  let sadr; 
  let startadrbyte = -1;//початкова адреса структури 
  //перебор полів структури 
  for (let fieldname in parseplc) {
    if (typeof parseplc[fieldname] !== 'object') continue;
    //шукаємо мінімльну адресу байту зміщення в структурі
    if (parseplc[fieldname].adr && typeof parseplc[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(parseplc[fieldname].adr.byte)<startadrbyte)) {
      startadrbyte = parseInt(parseplc[fieldname].adr.byte);
    } else {
      //парсинг всередині структури
      for (let fieldname1 in parseplc[fieldname]) {
        if (typeof parseplc[fieldname][fieldname1] !== 'object') continue;
        sadr = adr_to_string (parseplc[fieldname][fieldname1].adr, dbcmplt.dbnum);
        parseplc[fieldname][fieldname1].adr = sadr; 
      }
    } 

    //зінюємо формат адреси полів до текстового
    sadr = adr_to_string (parseplc[fieldname].adr, dbcmplt.dbnum);
    parseplc[fieldname].adr = sadr;
  }
  parseplc.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
  //меппінг на память
  if (parseplc.adr){
    if (!masterplcs.memmap) masterplcs.memmap = {};
    if (!masterplcs.memmap[dbcmplt.dbnum]) masterplcs.memmap[dbcmplt.dbnum] = {};
    masterplcs.memmap[dbcmplt.dbnum][startadrbyte] = 'plc';  
  }
  masterplcs.plc = parseplc; 
}

//заносить інформацію про теги в masteracts з даних про VAR
//ромзіщених в файлах listfiles по шляху pathfiles
function plcacts_toacts (masteracts, pathfiles, listfiles) {
  let xmlcontent, parsedata;
  parsedata = {};
 
  //отримання структур
  if (typeof (masteracts.types) !== "object") {masteracts.types = {}};//пошук структур якщо вони вже є в метаданих
  let udtfiles = listfiles.udtfiles;
  for (let i=0; i<udtfiles.length; i++) {
    udtfiles[i] = pathfiles + udtfiles[i] + '.udt';
    logmsg (`Отримую структуру з ${ udtfiles[i]}`);   
    parsetypeudt (udtfiles[i], masteracts.types);
  }
 
  //отримання інформації з ACTCFG
  let xmlcfgfiles = listfiles.xmlcfgfiles;
  for (let i=0; i<xmlcfgfiles.length; i++) {
    xmlcfgfiles[i] = pathfiles + xmlcfgfiles[i];
    logmsg (`Читаю файл ${xmlcfgfiles[i] + '.xml' }`);   
    try {
      xmlcontent = fs.readFileSync (xmlcfgfiles[i] + '.xml' ,'utf8');
    } catch (e) {
      logmsg (`Помилка читання файлу, можливо файлу немає в директорії, завершую роботу `);
      process.exit(); 
    }
      logmsg (`Отримую інфорфмацію з ACTCFG`);   
    dbcmplt = parsedb (xmlcontent, parsedata);
    fs.writeFileSync (pathfiles + 'actcfg_parse.json', JSON.stringify (dbcmplt), 'utf8');
    logmsg (`Файл парсингу записано в ${pathfiles + 'actcfg_parse.json'}`); 
    ACTCFG_to_acts (dbcmplt,masteracts);
  }
  
  //отримання інфорфмації з ACTHMI
  let fileparseresult;
  let xmlhmifiles = listfiles.xmlhmifiles;//  ACTH;
  for (let i=0; i<xmlhmifiles.length; i++) {
    xmlhmifiles[i] = pathfiles + xmlhmifiles[i] ;
    logmsg (`Читаю файл ${xmlhmifiles[i] + '.xml' }`);   
    xmlcontent = fs.readFileSync (xmlhmifiles[i] + '.xml','utf8');
    logmsg (`Отримую інфорфмацію з ACTHMI`); 
    dbcmplt = parsedb (xmlcontent, parsedata);
    fileparseresult = xmlhmifiles[i] + '.json'
    fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
    ACTHMI_to_acts (dbcmplt, masteracts);
  }

  //отримання інфорфмації з BUF
  let xmlbuffile = listfiles.xmlbuffile;// 
  xmlbuffile = pathfiles + xmlbuffile ;
  logmsg (`Читаю файл ${xmlbuffile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlbuffile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з BUF`); 
  dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlbuffile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
  ACTBUF_to_acts (dbcmplt, masteracts);
}
//отримання інформації з ACTCFG
function ACTCFG_to_acts (parsedata, masteracts) {
  logmsg (`Перетворюю в майстер дані`); 
  if (typeof (masteracts.acts) !== "object") {masteracts.acts = {}};//за тегами
  if (typeof (masteracts.ids) !== "object") {masteracts.ids = {}};//індексація за ID
  for (actname in parsedata.data) {
    if (typeof masteracts.acts[actname] !== "object") masteracts.acts[actname] ={};
    let act = masteracts.acts[actname];
    let parseact = parsedata.data[actname];
    act.actname = actname;
    act.id = parseact.ID.startval;
    act.clsid = plcconst_to_dec (parseact.CLSID.startval);
    act.descr = parseact.descr;  
    act.plccfg = parseact;
    //------------------- обробка plccfg
    delete act.plccfg.descr; //видалення щоб не дублювати
    let acttype = masteracts.types[act.plccfg.type];//доступ до об'єкту-типу
    act.type = act.plccfg.type.split('_')[0];//назву типу беремо з назви типу PLC
    act.hmiprefix = 'ACTH';//префікс для змінних HMI
    act.alms={}; //видаляємо усі попередні тривоги перед парсингом
    //резервні змінні не аналізуємо
    if (act.actname.toLowerCase().substring(0,3) === 'rez') continue;
    
    //перебор полів структури 
    let descrorig = '', res = {}; 
    for (let fieldname in parseact) {
      if (typeof parseact[fieldname] !== 'object') continue;
      if (parseact[fieldname].descr && parseact[fieldname].descr.length>2) {
        descrorig = parseact.descr
      } else {
        if  (typeof acttype === "undefined") console.log (act.plccfg.type);
        descrorig = acttype[fieldname].descr
      }
      //пошук особливих міток
      res = getAndReplacePlaceholders (descrorig, "{", "}", ""); //
      //поки нічого обробляти на рівні структур
      //
      let fieldtype = parseact[fieldname].type;
      //якщо є відомі структури всередині
      if (fieldtype && masteracts.types[fieldtype]) {
        //перебираємо біти
        for (let bitname in parseact[fieldname]) {
          if (typeof parseact[fieldname][bitname] !== 'object') continue;
          if (parseact[fieldname][bitname].descr && parseact[fieldname][bitname].descr.length>2) {
            descrorig = parseact[fieldname][bitname].descr
          } else {
            //if  (typeof acttype === "undefined") console.log (act.plccfg.type);
            descrorig = masteracts.types[fieldtype][bitname].descr;
          }
          //пошук особливих міток
          if (descrorig) {
            //console.log  (descrorig);
            res = getAndReplacePlaceholders (descrorig, "{", "}", ""); //
            parseact[fieldname][bitname].descr = res.text;
            fieldname1 = fieldname;     
            opts_to_tag (res, act, fieldname1, bitname)  
          }              
        }
      }  

    }
    masteracts.ids[act.id] = actname;
  } 
}
//отримання інформації зі структур HMI
function ACTHMI_to_acts (dbcmplt, masteracts) {
  let sadr; 
  for (actname in dbcmplt.data) {
    let startadrbyte = -1;//початкова адреса структури 
    let actplchmi = {};
    let parseact = dbcmplt.data[actname];
    actplchmi = parseact;
    //------------------- обробка plchmi
    delete actplchmi.descr; //видалення щоб не дублювати
    //перебор полів структури 
    for (let fieldname in parseact) {
      if (typeof parseact[fieldname] !== 'object') continue;
      //шукаємо мінімльну адресу байту зміщення в структурі
      if (parseact[fieldname].adr && typeof parseact[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(parseact[fieldname].adr.byte)<startadrbyte)) {
        startadrbyte = parseInt(parseact[fieldname].adr.byte);
      }   
      //зінюємо формат адреси полів до текстового
      sadr = adr_to_string (parseact[fieldname].adr, dbcmplt.dbnum);
      parseact[fieldname].adr = sadr;
    }
    parseact.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
    //якщо такого ВМ ще немає - вивести помилку
    if (typeof masteracts.acts[actname] !== "object") { 
      logmsg (`ERR: ВМ ${actname} для HMI не існує `);
      continue
    }
    if (!masteracts.acts[actname].plchmi) masteracts.acts[actname].plchmi = {}
    let masteracthmi = masteracts.acts[actname].plchmi;
    //синхронізація об'єктів   
    actplchmi.name = actname;
    syncobs (masteracthmi, actplchmi);
    //меппінг на память
    if (actplchmi.adr){
      if (!masteracts.memmap) masteracts.memmap = {};
      if (!masteracts.memmap[dbcmplt.dbnum]) masteracts.memmap[dbcmplt.dbnum] = {};
      masteracts.memmap[dbcmplt.dbnum][startadrbyte] = 'acts.' + actname +'.plchmi';  
    } 
  }
}
//отримання інформації з буфера ACT
function ACTBUF_to_acts (dbcmplt, masteracts) {
  //Беру тільки потрібний контент
  if (!dbcmplt.data.ACTBUF) {
    logmsg (`Не знайдено об'єкт ACTBUF у файлі буферу`);
    return
  }          
  let parseact = dbcmplt.data.ACTBUF;
  let sadr; 
  let startadrbyte = -1;//початкова адреса структури 
  //перебор полів структури 
  for (let fieldname in parseact) {
    if (typeof parseact[fieldname] !== 'object') continue;
    //шукаємо мінімльну адресу байту зміщення в структурі
    if (parseact[fieldname].adr && typeof parseact[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(parseact[fieldname].adr.byte)<startadrbyte)) {
      startadrbyte = parseInt(parseact[fieldname].adr.byte);
    }   
    //зінюємо формат адреси полів до текстового
    sadr = adr_to_string (parseact[fieldname].adr, dbcmplt.dbnum);
    parseact[fieldname].adr = sadr;
  }
  parseact.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
  //меппінг на память
  if (parseact.adr){
    if (!masteracts.memmap) masteracts.memmap = {};
    if (!masteracts.memmap[dbcmplt.dbnum]) masteracts.memmap[dbcmplt.dbnum] = {};
    masteracts.memmap[dbcmplt.dbnum][startadrbyte] = 'actbuf';  
  }
  masteracts.actbuf = parseact;  
}

//заносить інформацію про теги в mastertags з даних про VAR
//ромзіщених в файлах listfiles по шляху pathfiles
function plcvars_to_tags (mastertags, pathfiles, listfiles) {
  let xmlcontent, parsedata;
  parsedata = {};

  //отримання структур
  if (typeof (mastertags.types) !== "object") {mastertags.types = {}};//пошук структур якщо вони вже є в метаданих
  let udtfiles = listfiles.udtfiles;
  for (let i=0; i<udtfiles.length; i++) {
    udtfiles[i] = pathfiles + udtfiles[i] + '.udt';
    logmsg (`Отримую структуру з ${ udtfiles[i]}`, 0);   
    parsetypeudt (udtfiles[i], mastertags.types);
  }
 
  //отримання інфорфмації з VARCFG
  let xmlcfgfiles = listfiles.xmlcfgfiles;//  ["AIH", "DIH", "AOH", "DOH"];
  for (let i=0; i<xmlcfgfiles.length; i++) {
    xmlcfgfiles[i] = pathfiles + xmlcfgfiles[i];
    logmsg (`Читаю файл ${xmlcfgfiles[i] + '.xml' }`);   
    xmlcontent = fs.readFileSync (xmlcfgfiles[i] + '.xml' ,'utf8');
    logmsg (`Отримую інфорфмацію з VARCFG`, 0);
    parsedata = {};   
    dbcmplt = parsedb (xmlcontent, parsedata);    
    fs.writeFileSync (pathfiles + 'var_parse.json', JSON.stringify (dbcmplt), 'utf8');
    logmsg (`Файл парсингу записано в ${pathfiles + 'var_parse.json'}`);  
    VARCFG_to_tags (dbcmplt,mastertags);
  }

  //отримання інфорфмації з VARHMI
  let fileparseresult;
  let xmlhmifiles = listfiles.xmlhmifiles;//  ["AIH", "DIH", "AOH", "DOH"];
  for (let i=0; i<xmlhmifiles.length; i++) {
    xmlhmifiles[i] = pathfiles + xmlhmifiles[i] ;
    logmsg (`Читаю файл ${xmlhmifiles[i] + '.xml' }`);   
    xmlcontent = fs.readFileSync (xmlhmifiles[i] + '.xml','utf8');
    logmsg (`Отримую інфорфмацію з VARHMI`); 
    parsedata = {};
    dbcmplt = parsedb (xmlcontent, parsedata);
    fileparseresult = xmlhmifiles[i] + '.json'
    fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
    logmsg (`Файл парсингу записано в ${pathfiles + 'var_parse.json'}`); 
    VARHMI_to_tags (dbcmplt, mastertags);
  }   

  //отримання інфорфмації з BUF
  let xmlbuffile = listfiles.xmlbuffile;// 
  xmlbuffile = pathfiles + xmlbuffile ;
  logmsg (`Читаю файл ${xmlbuffile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlbuffile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з BUF`); 
  dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlbuffile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
  VARBUF_to_tags (dbcmplt, mastertags);
}
//отримання інформації з VARCFG
function VARCFG_to_tags (dbcmplt, mastertags) {
  let tagtypes = {AIVAR_CFG:"AI", DIVAR_CFG:"DI",DOVAR_CFG:"DO",AOVAR_CFG:"AO",
  NAIVAR_CFG:"NAI", NDIVAR_CFG:"NDI", NDOVAR_CFG:"NDO", NAOVAR_CFG:"NAO",};//NDI, NDO, NAI, NAO
  if (typeof (mastertags.tags) !== "object") {mastertags.tags = {}};//за тегами
  mastertags.ids = {};//індексація за ID
  mastertags.twinsrepo = {};//індексація за CLSID:ID

  let isrez = false;
  //------------- спочатку обробляємо з dbcmplt по назві тегу
  for (tagname in dbcmplt.data) {
    let parsetag = dbcmplt.data[tagname];
    let tag = {};
    tag.tagname = tagname;
    tag.id = parsetag.ID.startval;
    tag.clsid = plcconst_to_dec (parsetag.CLSID.startval);
    tag.type = tagtypes [parsetag.type];
    tag.hmiprefix = tag.type + 'H';//префікс для змінних HMI
    //резервні змінні мітимо, щоб десь не аналізувати 
    if (tag.tagname.toLowerCase().substring(0,3) === 'rez') {
      isrez=true;
    }
    if (typeof tag.clsid !== 'number' || tag.clsid <= 0 ){
      switch (tag.type) {
        case 'DI':
          tag.clsid = parseInt(opts.clsiddefault.divar, 16)  
          break;
        case 'DO':
          tag.clsid = parseInt(opts.clsiddefault.dovar, 16)
          break;
        case 'AI':
          tag.clsid = parseInt(opts.clsiddefault.aivar, 16)
          break;
        case 'AO':
          tag.clsid = parseInt(opts.clsiddefault.aovar, 16)
          break;      
        default:
          tag.clsid = parseInt(opts.clsiddefault.var, 16)          
          break;
      } 
    } 
    tag.descr = parsetag.descr;  
    tag.plccfg = parsetag;
    tag.state = 'valid';
    //------------------- обробка plccfg
    delete tag.plccfg.descr; //видалення щоб не дублювати
    //якщо є значення каналу за замвоченням пишемо в меп
    if (tag.plccfg.CHIDDF.startval) {
      tag.chid = tag.plccfg.CHIDDF.startval 
    } 
    //перебор полів структури 
    let tagtype = mastertags.types[tag.plccfg.type];
    let descrorig = '', res = {}; 
    for (let fieldname in parsetag) {
      if (typeof parsetag[fieldname] !== 'object') continue;
      //зінюємо формат адреси полів до текстового
      tag.plccfg[fieldname].adr = adr_to_string (parsetag[fieldname].adr,dbcmplt.dbnum);
      if (parsetag[fieldname].descr && parsetag[fieldname].descr.length>2) {
        descrorig = parsetag.descr
      } else {
        if  (typeof tagtype === "undefined") console.log (tag.plccfg.type);
        descrorig = tagtype[fieldname].descr
      }
      //пошук особливих міток
      res = getAndReplacePlaceholders (descrorig, "{", "}", ""); //
      //поки нічого обробляти на рівні структур
      //
      let fieldtype = parsetag[fieldname].type;
      //якщо є відомі структури всередині
      if (fieldtype && mastertags.types[fieldtype]) {
        //перебираємо біти
        for (let bitname in parsetag[fieldname]) {
          //logmsg (fieldname + '-' + bitname);
          if (typeof parsetag[fieldname][bitname] !== 'object') continue;
          //зінюємо формат адреси полів до текстового
          tag.plccfg[fieldname][bitname].adr = adr_to_string (parsetag[fieldname][bitname].adr,dbcmplt.dbnum);
          if (parsetag[fieldname][bitname].descr && parsetag[fieldname][bitname].descr.length>2) {
            descrorig = parsetag[fieldname][bitname].descr
          } else {
            //if  (typeof tagtype === "undefined") console.log (tag.plccfg.type);
            descrorig = mastertags.types[fieldtype][bitname].descr;
          }
          //пошук особливих міток для змінних що не є резерованими
          if (descrorig && isrez==false) {
            //console.log  (descrorig);
            res = getAndReplacePlaceholders (descrorig, "{", "}", ""); //
            parsetag[fieldname][bitname].descr = res.text;
            if (fieldname === 'STA2')  { 
              fieldname1 = 'AIVAR_VALPRCSTA2' //кастом
            } else {
              fieldname1 = fieldname 
            }    
            opts_to_tag (res, tag, fieldname1, bitname)  
          }              
        }
      }    
      //tag.plccfg[fieldname].descr = res.text;

    }
    
    //------------- оновлення mastertag 
    let mastertag;
    if (typeof mastertags.tags[tagname] === "object") { //шукаємо спочатку за іменем, 
      mastertag = mastertags.tags[tagname];
    } else if (mastertags.ids[tag.id]) { // якщо не знаходимо, то шукаємо за ID
      let oldtagname = mastertags.ids[tag.id];
      logmsg (`Тег ${oldtagname} з id ${tag.id} переіменовано в ${tag.name}`, 0);
      mastertag = mastertags.tags[tagname];
    } else { //новий тег
      mastertags.tags[tagname] = {}; 
      mastertag = mastertags.tags[tagname];
    }
    //синхронізація об'єктів
    syncobs (mastertag, tag);
    mastertags.ids[mastertag.id] = mastertag.tagname;
    //оновлення репозиторію
    let clsid = mastertag.clsid;
    if (!mastertags.twinsrepo[clsid]) mastertags.twinsrepo[clsid] = {};
    repoclsid = mastertags.twinsrepo[clsid];
    repoclsid[mastertag.id] = {ref : 'tags/' + mastertag.tagname, reftype: 'var' , alias: mastertag.tagname}
 
    //console.log (mastertag.clsid); process.exit()    
  }
  //Позначення усіх обєктів що не увійшли до репозиторію як inv_old
  for (tagname in mastertags.tags){
    if (!dbcmplt.data[tagname]){
      mastertags.tags[tagname].state = 'inv_old';
    }
  }   
}
//отримання інформації зі структур HMI
function VARHMI_to_tags (dbcmplt, mastertags) {
  let sadr; 
  for (tagname in dbcmplt.data) {
    let startadrbyte = -1;//початкова адреса структури 
    let tagplchmi = {};
    let parsetag = dbcmplt.data[tagname];
    tagplchmi = parsetag;
    //------------------- обробка plchmi
    delete tagplchmi.descr; //видалення щоб не дублювати
    //перебор полів структури 
    for (let fieldname in parsetag) {
      if (typeof parsetag[fieldname] !== 'object') continue;
      //шукаємо мінімльну адресу байту зміщення в структурі
      if (typeof parsetag[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(parsetag[fieldname].adr.byte)<startadrbyte)) {
        startadrbyte = parseInt(parsetag[fieldname].adr.byte);
      }   
      //зінюємо формат адреси полів до текстового
      sadr = adr_to_string (parsetag[fieldname].adr, dbcmplt.dbnum);
      parsetag[fieldname].adr = sadr;
    }
    parsetag.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
    //якщо такого тегу ще немає - вивести помилку
    if (typeof mastertags.tags[tagname] !== "object") { 
      logmsg (`ERR: Тегу ${tagname} для HMI не існує `);
      continue
    }
    if (!mastertags.tags[tagname].plchmi) mastertags.tags[tagname].plchmi = {}
    let mastertaghmi = mastertags.tags[tagname].plchmi;
    //синхронізація об'єктів   
    tagplchmi.name = tagname;
    syncobs (mastertaghmi, tagplchmi);
    //меппінг на память
    if (tagplchmi.adr){
      if (!mastertags.memmap) mastertags.memmap = {};
      if (!mastertags.memmap[dbcmplt.dbnum]) mastertags.memmap[dbcmplt.dbnum] = {};
      mastertags.memmap[dbcmplt.dbnum][startadrbyte] = 'tags.' + tagname +'.plchmi';  
    } 
  }
}
//отримання інформації з буфера VAR
function VARBUF_to_tags (dbcmplt, mastertags) {
  //Беру тільки потрібний контент
  if (!dbcmplt.data.VARBUF) {
    logmsg (`Не знайдено об'єкт VARBUF у файлі буферу`);
    return
  }          
  let parsevar = dbcmplt.data.VARBUF;
  let sadr; 
  let startadrbyte = -1;//початкова адреса структури 
  //перебор полів структури 
  for (let fieldname in parsevar) {
    if (typeof parsevar[fieldname] !== 'object') continue;
    //шукаємо мінімльну адресу байту зміщення в структурі
    if (parsevar[fieldname].adr && typeof parsevar[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(parsevar[fieldname].adr.byte)<startadrbyte)) {
      startadrbyte = parseInt(parsevar[fieldname].adr.byte);
    }   
    //зінюємо формат адреси полів до текстового
    sadr = adr_to_string (parsevar[fieldname].adr, dbcmplt.dbnum);
    parsevar[fieldname].adr = sadr;
  }
  parsevar.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
  //меппінг на память
  if (parsevar.adr){
    if (!mastertags.memmap) mastertags.memmap = {};
    if (!mastertags.memmap[dbcmplt.dbnum]) mastertags.memmap[dbcmplt.dbnum] = {};
    mastertags.memmap[dbcmplt.dbnum][startadrbyte] = 'varbuf';  
  }
  mastertags.varbuf = parsevar;  
}

//заносить інформацію про кнали в mastertags з даних про VAR
//парсити усі дані з PLC в Masterdata
function plc_to_chs (masterchs, pathfiles, listfiles) {
  let xmlcontent, parsedata, chs;
  parsedata = {};
  
  //отримання структур
  if (typeof (masterchs.types) !== "object") {masterchs.types = {}};//пошук структур якщо вони вже є в метаданих
  let udtfiles = listfiles.udtfiles;
  for (let i=0; i<udtfiles.length; i++) {
    udtfiles[i] = pathfiles + udtfiles[i] + '.udt'
    logmsg (`Отримую структуру з ${udtfiles[i]}`);       
    parsetypeudt (udtfiles[i], masterchs.types);
  } 
 
  //канали зчитуються з HMI
  if (!masterchs.chs) masterchs.chs = {};
  chs = masterchs.chs; 
  let filename = pathfiles + 'CH.xml';
  logmsg (`Читаю файл ${filename}`);    
  xmlcontent = fs.readFileSync (filename,'utf8');
  logmsg (`Отримую інфорфмацію з CHHMI`); 
  dbcmplt = parsedb (xmlcontent, parsedata);  
  CHHMI_to_chs (dbcmplt,chs);

  //отримання інфорфмації з BUF
  let xmlbuffile = listfiles.xmlbuffile;// 
  xmlbuffile = pathfiles + xmlbuffile ;
  logmsg (`Читаю файл ${xmlbuffile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlbuffile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з BUF`); 
  dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlbuffile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
  CHBUF_to_chs (dbcmplt, masterchs);

  //отримання інфорфмації про модулі
  let xmlmodulesfile = listfiles.xmlmodulesfile;
  xmlmodulesfile = pathfiles + xmlmodulesfile ;
  logmsg (`Читаю файл ${xmlmodulesfile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlmodulesfile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з MODULES`); 
  dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlmodulesfile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
  MODULES_to_chs (dbcmplt, masterchs); 

  //отримання інфорфмації з підмодуля
  let xmlsubmfile = listfiles.xmlsubmodulefile;
  xmlsubmfile = pathfiles + xmlsubmfile ;
  logmsg (`Читаю файл ${xmlsubmfile + '.xml' }`);   
  xmlcontent = fs.readFileSync (xmlsubmfile + '.xml','utf8');
  logmsg (`Отримую інфорфмацію з SUBMODULE`); 
  dbcmplt = parsedb (xmlcontent, parsedata);
  fileparseresult = xmlsubmfile + '.json';
  fs.writeFileSync (fileparseresult, JSON.stringify (dbcmplt), 'utf8');
  SUBMODULE_to_chs (dbcmplt, masterchs);
  
} 
//перетворення рзпарсеного блоку CHHMI в стандартизовану структуру chs   
function CHHMI_to_chs (parsedata, chs) {
  let CHDIs = parsedata.data.CHDI.data;
  let CHDOs = parsedata.data.CHDO.data;
  let CHAIs = parsedata.data.CHAI.data;
  let CHAOs = parsedata.data.CHAO.data;
  if (typeof (chs.statistic) !== "object") {
    chs.statistic = {
      dicnt:CHDIs.length-1, 
      docnt:CHDOs.length-1, 
      aicnt:CHAIs.length-1, 
      aocnt:CHAOs.length-1
    }
  }
  if (typeof (chs.chdis) !== "object") {chs.chdis = {}} 
  if (typeof (chs.chdos) !== "object") {chs.chdos = {}} 
  if (typeof (chs.chais) !== "object") {chs.chais = {}} 
  if (typeof (chs.chaos) !== "object") {chs.chaos = {}}
  
  let adrbyte, adrbit;
  for (let i=0; i<CHDIs.length; i++) {
    let id = i.toString();
    if (typeof chs.chdis[id] === "undefined") chs.chdis[id]={};
    let ch = chs.chdis[id];   
    ch.id = id;
    //adrbyte = +chs.iocfg.dibias + Math.trunc(((+id-1)/8)); adrbit = (+id - 1) % 8; 
    //ch.adr = 'I' + adrbyte + '.' + adrbit;
    if (typeof chs.chdis[id].plchmi === "undefined") chs.chdis[id].plchmi={};
    let chhmi = chs.chdis[id].plchmi
    chhmi.type = "CH_HMI";
    chhmi.adr = 'DB' + parsedata.dbnum + '.' + CHDIs[i].adr.byte + "." + CHDIs[i].adr.bit
  }  
  for (let i=0; i<CHDOs.length; i++) {
    let id = i.toString();
    if (typeof chs.chdos[id] === "undefined") chs.chdos[id]={};
    let ch = chs.chdos[id];
    ch.id = id;
    //adrbyte = +masterchs.iocfg.dobias + Math.trunc(((+id-1)/8)); adrbit = (+id - 1) % 8; 
    //ch.adr = 'Q' + adrbyte + '.' + adrbit;       
    if (typeof chs.chdos[id].plchmi === "undefined") chs.chdos[id].plchmi={};
    let chhmi = chs.chdos[id].plchmi
    chhmi.type = "CH_HMI";
    chhmi.adr = 'DB' + parsedata.dbnum + '.' + CHDOs[i].adr.byte + "." + CHDOs[i].adr.bit
  }  
  for (let i=0; i<CHAIs.length; i++) {
    let id = i.toString();
    if (typeof chs.chais[id] === "undefined") chs.chais[id]={};
    let ch = chs.chais[id];   
    ch.id = id;
    //adrbyte = +masterchs.iocfg.aibias + (+id - 1)*2; 
    //ch.adr = 'IW' + adrbyte;     
    if (typeof chs.chais[id].plchmi === "undefined") chs.chais[id].plchmi={};
    let chhmi = chs.chais[id].plchmi
    chhmi.type = "CH_HMI";
    chhmi.adr = 'DB' + parsedata.dbnum + '.' + CHAIs[i].adr.byte + "." + CHAIs[i].adr.bit
  }  
  for (let i=0; i<CHAOs.length; i++) {
    let id = i.toString();
    if (typeof chs.chaos[id] === "undefined") chs.chaos[id]={};
    let ch = chs.chaos[id];   
    ch.id = id;
    //adrbyte = +masterchs.iocfg.aobias + (+id - 1)*2; 
    //ch.adr = 'QW' + adrbyte;       
    if (typeof chs.chaos[id].plchmi === "undefined") chs.chaos[id].plchmi={};
    let chhmi = chs.chaos[id].plchmi
    chhmi.type = "CH_HMI";
    chhmi.adr = 'DB' + parsedata.dbnum + '.' + CHAOs[i].adr.byte + "." + CHAOs[i].adr.bit
  }  
}
//парсити дані з PLCMAPS
function PLCMAPS_to_chs (masterchs, filename) {
  if (!masterchs.iomapplc) masterchs.iomapplc = {genform:{},plcform:[]};
  if (!masterchs.chs) masterchs.chs = {};
  if (!masterchs.chs.statistic) masterchs.chs.statistic = {};
  

  chs = masterchs.chs; 
  logmsg (`Читаю файл ${filename}`);    
  let txtcontent;
  try {
    txtcontent = fs.readFileSync (filename,'utf8');
  } catch (e) {
    logmsg (`Помилка читання файлу, можливо файлу немає в директорії, завершую роботу `);
    process.exit(); 
  }  
  let arcontent = txtcontent.replace(/[\r\n\t]/g,'') .split (';');
  let curmodule = ''; 
  let modtypestr = '';
  masterchs.chs.modulscnt =0;
  
  iomapplc = masterchs.iomapplc.plcform; 
  //парсимо кожний рядок
  for (let row of arcontent) {
    if ((row.search ('//')>0) && (row.search ('DBMODULES')>0)) {
      row = row.replace ('//', '').trim();  
      curmodule = row.split (' ')[0];
      modtypestr = row.split (' ')[1];
      //masterchs.moduls[curmodule] = {chdis:[], chdos:[], chais:[], chaos:[]};
      masterchs.chs.modulscnt ++;      
    } 
    rowar = row.split(':=');
    let val = '';
    if (rowar.length === 2) {
      val = rowar[1].trim().replace ('16#','');
      //console.log (val);
    } 
    if (row.search (/MODULES\[/)>=0 && curmodule.length>1) {
      let number = rowar[0].split ('[')[1].split(']')[0];
      if (typeof (iomapplc[number]) !== 'object') iomapplc[number] = {
        MODID: curmodule,
        MODTYPESTR: modtypestr 
      };
      //console.log (row);  
      if (row.search('.TYPE')>=0) iomapplc[number].MODTYPE = val;
      if (row.search('.CHCNTS')>=0) iomapplc[number].CHCNTS = val;
      if (row.search(/.STRTNMB\[0\]/)>=0) iomapplc[number].STRTNMB0 = val;                
      if (row.search(/.STRTNMB\[1\]/)>=0) iomapplc[number].STRTNMB1 = val; 
      if (row.search(/.STRTNMB\[2\]/)>=0) iomapplc[number].STRTNMB2 = val; 
      if (row.search(/.STRTNMB\[3\]/)>=0) iomapplc[number].STRTNMB3 = val; 
    }
  }
  //console.log (masterchs.chs.modulscnt);
}
//отримання інформації з буфера VAR
function CHBUF_to_chs (dbcmplt, masterchs) {
  //Беру тільки потрібний контент
  if (!dbcmplt.data.CHBUF) {
    logmsg (`Не знайдено об'єкт CHBUF у файлі буферу`);
    return
  }          
  let parsech = dbcmplt.data.CHBUF;
  let sadr; 
  let startadrbyte = -1;//початкова адреса структури 
  //перебор полів структури 
  for (let fieldname in parsech) {
    if (typeof parsech[fieldname] !== 'object') continue;
    //шукаємо мінімльну адресу байту зміщення в структурі
    if (parsech[fieldname].adr && typeof parsech[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(parsech[fieldname].adr.byte)<startadrbyte)) {
      startadrbyte = parseInt(parsech[fieldname].adr.byte);
    }   
    //зінюємо формат адреси полів до текстового
    sadr = adr_to_string (parsech[fieldname].adr, dbcmplt.dbnum);
    parsech[fieldname].adr = sadr;
  }
  parsech.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
  //меппінг на память
  if (parsech.adr){
    if (!masterchs.memmap) masterchs.memmap = {};
    if (!masterchs.memmap[dbcmplt.dbnum]) masterchs.memmap[dbcmplt.dbnum] = {};
    masterchs.memmap[dbcmplt.dbnum][startadrbyte] = 'chbuf';  
  }
  masterchs.chbuf = parsech;  
}
//отримання інформації з MODULES
function MODULES_to_chs (dbcmplt, masterchs) {
  //Беру тільки потрібний контент
  if (!dbcmplt.data.MODULES) {
    logmsg (`Не знайдено об'єкт MODULES у файлі`);
    return
  }          
  let modules =[];
  let sadr; 
  let datatype = dbcmplt.data.MODULES.type.split('of ')[1]; 
  for (let i=0; i<dbcmplt.data.MODULES.data.length;i++) {
    let module = dbcmplt.data.MODULES.data[i]
    module.type = datatype;
    startadrbyte = multilevel_adrparse (module,  dbcmplt.dbnum);
    module.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 

    //меппінг на память
    if (module.adr){
      if (!masterchs.memmap) masterchs.memmap = {};
      if (!masterchs.memmap[dbcmplt.dbnum]) masterchs.memmap[dbcmplt.dbnum] = {};
      masterchs.memmap[dbcmplt.dbnum][startadrbyte] = 'modules[' + i + ']';  
    }
    modules[i] = module;
  }  
  masterchs.modules = modules;  
}

//отримання інформації з SUBMODULE
function SUBMODULE_to_chs (dbcmplt, masterchs) {
  //Беру тільки потрібний контент
  if (!dbcmplt.data.SUBMODULE) {
    logmsg (`Не знайдено об'єкт SUBMODULE у файлі буферу`);
    return
  }          
  let submodule = dbcmplt.data.SUBMODULE;
  let sadr; 
  let startadrbyte = -1;//початкова адреса структури 
  //перебор полів структури 
  for (let fieldname in submodule) {
    if (typeof submodule[fieldname] !== 'object') continue;
    //шукаємо мінімльну адресу байту зміщення в структурі
    if (submodule[fieldname].adr && typeof submodule[fieldname].adr.byte === 'number' && (startadrbyte<0 || parseInt(submodule[fieldname].adr.byte)<startadrbyte)) {
      startadrbyte = parseInt(submodule[fieldname].adr.byte);
    }   
    //зінюємо формат адреси полів до текстового
    sadr = adr_to_string (submodule[fieldname].adr, dbcmplt.dbnum);
    submodule[fieldname].adr = sadr;
  }
  submodule.adr = adr_to_string ({byte:startadrbyte}, dbcmplt.dbnum);//початкова адреса структури 
  //меппінг на память
  if (submodule.adr){
    if (!masterchs.memmap) masterchs.memmap = {};
    if (!masterchs.memmap[dbcmplt.dbnum]) masterchs.memmap[dbcmplt.dbnum] = {};
    masterchs.memmap[dbcmplt.dbnum][startadrbyte] = 'submodulebuf';  
  }
  masterchs.submodulebuf = submodule;  
}
//парсинг з рекурсією 
function multilevel_adrparse (parsedata, dbnum) {
  let sadr = '';
  startadrbyte = -1;
  if (parsedata.data && Array.isArray (parsedata.data) === true) {
    for (let fieldval of parsedata.data) {
      if (typeof fieldval!== 'object') continue;          
      if (fieldval.adr) {
        if (startadrbyte <0 || fieldval.adr.byte < startadrbyte) startadrbyte = fieldval.adr.byte;   
        sadr = adr_to_string (fieldval.adr, dbnum);
        fieldval.adr = sadr;
        if (fieldval.data && Array.isArray (fieldval.data) === true || (fieldval.STA || fieldval.VAL)) {
          multilevel_adrparse (fieldval, dbnum);
        }  
      }else{
        multilevel_adrparse (fieldval, dbnum)   
      }
    }  
  } else {
    for (let fieldname in parsedata) {
      if (typeof parsedata[fieldname] !== 'object') continue;          
      if (parsedata[fieldname].adr) {
        if (startadrbyte <0 || parsedata[fieldname].adr.byte < startadrbyte) startadrbyte = parsedata[fieldname].adr.byte;   
        sadr = adr_to_string (parsedata[fieldname].adr, dbnum);
        parsedata[fieldname].adr = sadr;
        if (parsedata[fieldname].data && Array.isArray (parsedata[fieldname].data) === true) multilevel_adrparse (parsedata[fieldname], dbnum);  
      }else{
        multilevel_adrparse (parsedata[fieldname], dbnum)   
      }
    }  
  }
  return startadrbyte
} 
//переведення db, adr {byte, bit} string
function adr_to_string (adr, dbnum) {
  let sadr = '';
  if (typeof adr !== 'undefined') {
    sadr = 'DB' + dbnum + '.'; 
    if (typeof (adr.byte) !== 'undefined') sadr += adr.byte.toString();
    if (typeof (adr.bit) !== 'undefined') sadr += '.' + adr.bit.toString();
  }
  return sadr
} 
//пеетворення різних типів констант PLC  вдесяткову форму
function plcconst_to_dec (val) {
  if (typeof val === "undefined") return 0
  if (typeof val !== "string") return val
  let ar = val.split('#');
  if (ar.length>1) {
    switch (parseInt(ar[0])) { //система числення 16, 2
      case 16: val = parseInt(ar[1],16); break;  
      case 2: val = parseInt(ar[1],2); break;
        break;
      default:
        break;
    }
  } 
  return val;
}
//з масиву опцій opts формує тривоги для tag та act, 
//для ALM з посиланям на поле fieldname та bitname в структурі HMI
function opts_to_tag (opts, tag, fieldname, bitname) {
  let tagname;
  if (tag.tagname) {
    tagname = tag.tagname;
  }else if (tag.actname) {
    tagname = tag.actname;
  }  
  let msg = "";
  let alm = {name:'', msg: '', word:'', bit:0, class:''}; 
  let ar = [];
  for (opt of opts.ar){
    ar = opt.split('.');
    switch (ar[0]) {
      case 'A': //тривоги
        if (!tag.alms) tag.alms = {};

        alm.name = tag.hmiprefix + '_' + tagname + '_' + bitname;
        alm.class = ar[1];
        alm.word = fieldname;
        alm.bit = parseInt (ar[2]);
        alm.msg = tag.descr + ': ' + opts.text;
        tag.alms[alm.name] = alm;       
        break;    
      default:
        break;
    } 
    
    //tag.alm  
  
  }    
}  


// --------------- DB XML -----------------------------
//парсить xmlcontent і заносить дані полів по DB parsedata та dbcmplt
//має надлищковість, варто оптимізувати
function parsedb (xmlcontent, parsedata) {
  let docs = xmlparser.xml2js(xmlcontent, {compact: true, spaces: 4}).Document;
  //якщо блок не GlobalDB - завершити виконання
  if (!docs['SW.Blocks.GlobalDB']) {
    console.log (docs);
    return; 
  }
  let ob = docs['SW.Blocks.GlobalDB']['AttributeList'];
  let dbcmplt = {rowparse: ob.Interface};   
  let adrob = {byte:0, bit:0};
  parsesection (parsedata, dbcmplt.rowparse.Sections.Section, adrob);
  dbcmplt.data = parsedata;
  dbcmplt.dbnum = ob.Number._text;
  return dbcmplt;
}
//парсить Section, відноситься до parsedb 
function parsesection (parsedata, Section, adrob) {
  //Корінь дерева - Static
  //поля є елементами масиву, якщо це не масив - тільки одне поле на цьому рівні   
  if (Section.Member.length !== undefined) { 
    for (memberitem of Section.Member) {
      parsemember (parsedata, memberitem, adrob);
    }
    if (adrob.bit>0) {// якщо були біти в попередніх полях 11.09.21
      adrob.byte ++;//зробити приріст на байт
      if ((adrob.byte % 2)!==0) { //якщо непаний - вирівнювання по парному 
        adrob.byte ++;
      }
    }      
    adrob.bit = 0;
    return
  } else {
    let memberitem = Section.Member;
    parsemember (parsedata, memberitem, adrob);   
    if (adrob.bit>0) {// якщо були біти в попередніх полях 11.09.21
      adrob.byte ++;//зробити приріст на байт
      if ((adrob.byte % 2)!==0) { //якщо непаний - вирівнювання по парному 
        adrob.byte ++;
      }
    }  
    adrob.bit = 0; 
    return 
  }
      
}
//парсить memberitem, відноситься до parsedb 
function parsemember (parsedata, memberitem, adrob) {
  //Member може мати інші Member або бути кінцевим
  if (memberitem.Sections) { //якщо має гілки 
    let filedtype = memberitem._attributes.Datatype;
    let fieldname = memberitem._attributes.Name;
    let ob = parsedata [fieldname] = {type: filedtype.replace(/"/g,'')};          
    if (memberitem.Comment) ob.descr = memberitem.Comment.MultiLanguageText._text;  
    //перевірка чи тип є масивом інших типів
    //якщо масив інших типів то секція - це опис одного типу 
    filedtype = filedtype.toLowerCase().replace(/"/g,'');
    if (filedtype.search ('array') !=-1) { 
      filedtype = filedtype.replace ('array[', '').replace(']', '').replace('..', ' ').replace(/"/g,'') ; 
      let typear = filedtype.split (' ');
      let strti = typear[0];
      let endi = typear[1];
      let typei = typear[3];
      parsedata [fieldname].data = [];
      for (let i=strti; i<=endi; i++) {
        //let memberitem
        parsedata [fieldname].data [i] = {adr: {byte : adrob.byte, bit: adrob.bit}};
        parsesection (parsedata [fieldname].data [i] , memberitem.Sections.Section, adrob) 
        //parsemember (parsedata, memberitem, adrob) 
      }      
    } else { 
      parsesection (ob, memberitem.Sections.Section, adrob)
    }            
  } else { //якщо це кінцева гілка гілки 
    parsesingle (parsedata, memberitem, adrob);    
    return 
  }     
}
//парсить скалярні типи, відноситься до parsedb 
function parsesingle (parsedata, memberitem, adrob) {
  let fieldname = memberitem._attributes.Name;
  let filedtype =  memberitem._attributes.Datatype.toLowerCase().replace(/"/g,''); 
  parsedata [fieldname] = {type: filedtype};
  if (memberitem.StartValue) {//07.12.21
    //console.log (memberitem.StartValue);
    let startvalob = memberitem.StartValue["_text"];
    parsedata [fieldname].startval = startvalob; 
  }
  parsedata [fieldname].adr = {byte : adrob.byte, bit: adrob.bit};
  if (filedtype.search ('array') !=-1) {
    filedtype = filedtype.replace ('array[', '').replace(']', '').replace('..', ' ').replace(/"/g,''); 
    let typear = filedtype.split (' ');
    let strti = typear[0];
    let endi = typear[1];
    let typei = typear[3];
    parsedata [fieldname].data = [];
    for (let i=strti; i<=endi; i++) {
      parsedata [fieldname].data [i] = {adr: {byte : adrob.byte, bit: adrob.bit}};
      addaddr (typei, adrob); 
    }
  } else {
    addaddr (filedtype, adrob);      
  }
  newsection = false;//відмітка про те, що це не нова секція 11.09.21
}

//фнкція розрахунку адреси для наступного поля скалярного типу 
//приймає type, adrob:{byte, bit} поепереднє і модифікує його  
function addaddr (type, adrob) {
  let addbyte=0, addbit=0;
  switch (type) {
    case 'bool':
      addbit = 1;
      break;      
    case 'int':
    case 'uint':
      addbyte = 2;
      break;
    case 'real':
    case 'dint':  
    case 'udint':  
      addbyte = 4;
    default:
      //return -1; 
      break;
  }
  adrob.bit += addbit;
  if (adrob.bit>7) {
    adrob.bit = 0; 
    addbyte = 1; 
  }
  if (addbit===0 && (adrob.byte % 2)!==0) {
    adrob.byte ++; 
  }    
  adrob.byte += addbyte;
} 

// --------------------------- udt
//запускає parsetypeudt для усіх файлів .udt що мають в своєму імені 
//_STA  _ALM
function parseudtall (types, udtpath) {
  const udtfiles = [];
  let filelist = fs.readdirSync(udtpath);
  for (filename of filelist){
    //console.log (filename);
    if (filename.search('.udt')>0 && ((filename.search('_STA')>0) || (filename.search('_ALM')>0) || (filename.search('PLC_ALM')>0))) { 
      //console.log ('->' + filename);
      udtfiles.push (udtpath + filename)
    }
  }
  for (filename of udtfiles) {
    parsetypeudt (filename, types);
  }
}

//парсить структуру UDT з filename повертає розпаресені струткури в plctypes
function parsetypeudt (filename, plctypes) {
  let ob = {};
  let udtcontent;
  let lines;
  if (fs.existsSync(filename)) {
    udtcontent = fs.readFileSync (filename,'utf8');
  } else {
    return
  }
  //---------- змінено 11.12.21 добавлено опис descr та коментар comment
  ob.structdescr = '';
  ob.structcomment = '';  
  lines = udtcontent.split(/\r?\n/);
  //шукаємо descr і comment і name в перших 5-ти рядах
  for (let i=0; i<5; i++) {
    let line = lines[i];
    if (line.search ('TYPE')>=0) { //TYPE "ACTTR_CFG"
      structname = line.split('"')[1];
      //console.log (structname);
    }
    if (line.search ('TITLE')>=0) { //TITLE = Універсальний тип
      ob.structdescr = line.split('= ')[1];
      //console.log (ob.structdescr );
    }
    let l = line.search ('//');
    if (l>=0 && l<3 ) { // //Цей тип використовується...
      ob.structcomment = line.substring(l+2, line.length);
      //console.log (ob.structcomment);
    }
  }  
  //----------------
  let structstart = 'STRUCT', structend = 'END_STRUCT', version = 'VERSION';
  let n = udtcontent.search (structstart);
  let m = udtcontent.search (structend);
  let structbody = udtcontent.substring (n + structstart.length , m);
  n = 0; m = udtcontent.search (version); 
  //structname =  udtcontent.substring(n,m).replace (/["\r\n]/g, '').split(' ')[1]; 
  lines = structbody.split(/\r?\n/);
  let byte = 0, bit = 0;  
  let prevtype = '';
  for (line of lines) {
    let res = getAndReplacePlaceholders (line, "{ ", "}", ""); //замінити {} на пусті 
    line = res.text; 
    let ar = line.replace(':','|').replace('//','|').split ('|');
    if (ar.length >= 2) {
      n = line.search ('{');  m = line.search ('}');
      if (n> 1 && m>1) line = line.slice (0, n) + line.slice (m+1);
      let fieldname = ar[0].replace (/ /g, '');
      if (!ar[2]) ar[2] = 'No comments';
      ob[fieldname] = {
      type: ar[1].replace (/[ ;]/g, '').toLowerCase(),      
      descr: ar[2].replace (' ', '')}
      switch (prevtype) {
        case 'bool':
          bit++;
          if (bit>7) {
            byte++;
            bit = 0;
          }
          break;
        case 'int':
        case 'uint':
          byte += 2;
          break;
        case 'dint':
        case 'udint':
        case 'real':
          byte +=4;
          break;
        default:
          break;
      }
      ob[fieldname].byte = byte;
      ob[fieldname].bit = bit;
      prevtype = ob[fieldname].type;
    }
  }
  plctypes[structname] = ob;
}

//шукає в txt замінник в форматі (startsymb текст endsymb) замінює його на replacer
//повертає об'єкт з масивом знайдених текстів і вичищений текст 
function getAndReplacePlaceholders (txt, startsymb, endsymb, replacer) {
  let ar = [];
  let regexp;
  let ar1 = txt.split (startsymb); 
  for (el of ar1) {
      ar2 = el.split(endsymb);
      if (ar2.length>1) {
          ar.push (ar2[0]);
          regexp = new RegExp (startsymb + ar2[0] + endsymb, "g")
          txt = txt.replace (regexp, replacer)  
      } 
  }
  return {text : txt, ar: ar };
}  

module.exports = {
  plcacts_toacts, plcvars_to_tags, plc_to_chs, PLCMAPS_to_chs, 
  parsedb, parsetypeudt, parseudtall, 
  tiaparseall, opts
};

