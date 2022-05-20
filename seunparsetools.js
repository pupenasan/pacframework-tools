/* модуль для конвертування змісту проекту UnityPRO/ControlExpert в Master Data *.xef
*/
const path = require("path");
const fs = require("fs");
const xmlparser = require("xml-js"); //https://www.npmjs.com/package/xml-js
const masterdatatools = require("./masterdatatools.js");
const ini = require("ini"); //https://github.com/npm/ini#readme
const config = ini.parse(fs.readFileSync(global.inipath, "utf-8"));

const opts = {
  logpath: "log",
  logfile: "seunparsetools.log",
  clsiddefault: {
    var: 0x10f0,
    DI: 0x1010,
    DO: 0x1020,
    AI: 0x1030,
    AO: 0x1040,
    NDI: 0x1050,
    NDO: 0x1060,
    NAI: 0x1070,
    NAO: 0x1080,
    ch: 0x00f0,
    chdi: 0x0010,
    chdo: 0x0020,
    chai: 0x0030,
    chao: 0x0040,
    act: 0x20f0,
  },
};


//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;
const syncobs = masterdatatools.syncobs;

function xefparseall () {
  masterdatatools.opts.logfile = "seunparsetools.log";
  masterdatatools.opts.source = config.seunparsetools.pathsource;
  masterdatatools.opts.logpath = config.seunparsetools.pathlog;

  const seunsoucefiles = path.normalize(config.seunparsetools.pathsource + "/");
  const seunresultfiles = path.normalize(config.seunparsetools.pathresult + "/");
  const xefsourcefilename = path.normalize(seunsoucefiles + config.seunparsetools.xeffile + ".xef");
  logmsg("-------------------- Отримання мастерданих з XEF про PLCs");
  try {
    xmlcontent = fs.readFileSync(xefsourcefilename, "utf8");
  } catch (e) {
    logmsg(
      `Помилка читання файлу ${xefsourcefilename} , можливо файлу немає в директорії, завершую роботу `
    );
    process.exit();
  }
  
  let jscontent = xmlparser.xml2js (xmlcontent, {compact: true, spaces: 4 }).FEFExchangeFile;
  /*
  let DDTSource = jscontent.DDTSource;
  let variables = jscontent.dataBlock.variables;
  let program = jscontent.dataBlock.program;
  */
  
  let alltypes = {};
  //перша ітерація тримання загальної інформації по типам
  for (let DDTSource of  jscontent.DDTSource) {
    let pfwtype = alltypes [DDTSource._attributes.DDTName] = {};
    DDTtotype (DDTSource, pfwtype)
  }
  logmsg("Усі типи з файлу отримані");
  let plcblocks = {};
  for (let variable of  jscontent.dataBlock.variables) {
    let varblockname = variable._attributes.name;
    plcblocks[varblockname] = variable;
  }
  logmsg("Усі змінні з фвйлу отримані, перетворюю в базу даних...");
  /*
  //назви типів 
  let typeblocknames = {
    PLC_CFG:"PLC_CFG", MODULE:"MODULE", SUBMODULE:"SUBMODULE", CH_BUF:"CH_BUF", ACT:"ACT", ACTH:"ACTH", ACTTR_CFG:"ACTTR_CFG"  
  };
  //назви змінних
  let varblocknames = {
    PLC:"PLC", MODULES:"MODULES", SUBMODULE:"SUBMODULE", CH_BUF:"CH_BUF", ACT:"ACT", ACTH:"ACTH", ACTBUF:"ACTBUF"
  };*/  
  
  
  logmsg("------------------ Формування тегів");
  let plctags = {
    types:{}, tags:{}, ids: {}, twinsrepo: {}, memmap: {}, varbuf: {}
  };
  //назви типів та змінних
  let typeblocknames = {VARS:"VARS", DIH:"DIH", DOH:"DOH", AIH:"AIH", AOH:"AOH", VARBUF:"VARBUF"};
  let varblocknames = {VARS:"VARS", DIH:"DIH", DOH:"DOH", AIH:"AIH", AOH:"AOH", VARBUF:"VARBUF"}; 
  let typeblocknames_ini = config.seunparsetools.tag_typeblocknames ? JSON.parse(config.seunparsetools.tag_typeblocknames):{};
  let varblocknames_ini = config.seunparsetools.tag_varblocknames ? JSON.parse(config.seunparsetools.tag_varblocknames):{};
  //якщо означені в ini
  for (typename in typeblocknames) {
    if (typeblocknames_ini[typename]) typeblocknames[typename] = typeblocknames_ini[typename]
  }
  for (tagname in varblocknames) {
    if (varblocknames_ini[tagname]) varblocknames[tagname] = varblocknames_ini[tagname]
  }  
  //перевірка чи знайдені усі змінні
  let found = true;
  for (let typeblockname in typeblocknames) {
    //для кожного типу каркасу можуть бути по кілька блоків
    let types = [];
    if (typeof typeblocknames[typeblockname] === 'object') {
      types = typeblocknames[typeblockname]
    } else {
      types.push (typeblocknames[typeblockname]);     
    }
    for (typename of types) {
      if (!alltypes[typename]) {
        logmsg(`ERR: Не знайдено тип ${typename}`);
        found = false;
      }
      plctags.types[typename] = alltypes[typename]
    }   
  }  
  for (let varblockname in varblocknames) {
    //для кожної змінної каркасу можуть бути по кілька блоків
    let tags = [];
    if (typeof varblocknames[varblockname] === 'object') {
      tags = varblocknames[varblockname]
    } else {
      tags.push (varblocknames[varblockname])
    }
    for (tagname of tags) {
      if (!plcblocks[tagname]) {
        logmsg(`ERR: Не знайдена змінна ${tagname}`);
        found = false;
      }
    }
  }
  if (!found) {
    logmsg("Подальше перетворення неможливе!");
    return
  } 

  //-------------------- формування бази тегів по VAR
  let mastertags = {};
  //приведення до типу масив
  let varblocknms = (typeof varblocknames.VARS === 'object') ? varblocknames.VARS : [varblocknames.VARS];
  for (let varblocknm of varblocknms) {//перебираємо усі VAR
    let typename = plcblocks[varblocknm]._attributes.typeName;
    let typeblock = alltypes[typename];
    logmsg(`Блок ${typename} в PLC:`,0);
    //теги всередині vars
    for (let vartag of plcblocks[varblocknm].instanceElementDesc) {
      let tagname = vartag._attributes.name;
      mastertags [tagname] = {
        tagname : tagname
      }
      //console.log (tagname);
      //перебір по полям
      for (field of vartag.instanceElementDesc) {
        let fieldname = field._attributes.name.toLowerCase();
        let fieldval =  field.value._text;
        mastertags [tagname][fieldname] = fieldval;
      }
      let plctpname = typeblock[tagname].type;
      mastertags [tagname].type = plctpname[0] === 'N' ? plctpname.substr(0,2) :  plctpname.substr(0,2);//NDI vs DI
      if (mastertags [tagname].clsid) {
        mastertags [tagname].clsid = parseInt(mastertags[tagname].clsid)
      } else {
        mastertags [tagname].clsid = parseInt(opts.clsiddefault[mastertags [tagname].type])
      }
      if (!mastertags [tagname].descr) {
        mastertags [tagname].descr = typeblock[tagname].descr
      }
      let plccfg = mastertags [tagname].plccfg = {type:plctpname};
      //заповнюємо поля з типу
      for (let fieldname in alltypes[typeblock[tagname].type]){
        plccfg[fieldname] = {type : alltypes[typeblock[tagname].type][fieldname].type}
      }
      logmsg(`Змінна ${tagname} добавлено в БД:`,0) 
    }
  }
  let hmitypes =  ["DIH","DOH","AIH","AOH"];
  for (hmitype of hmitypes) {
    //DIH приведення до типу масив
    varblocknms = (typeof varblocknames[hmitype] === 'object') ? varblocknames[hmitype] : [varblocknames[hmitype]];
    for (let varblocknm of varblocknms) {//перебираємо усі VAR_HMI
      let typename = plcblocks[varblocknm]._attributes.typeName;
      let typeblock = alltypes[typename];
      let topoadr = plcblocks[varblocknm]._attributes.topologicalAddress;
      let mwbias = parseInt(topoadr.toUpperCase().replace('%MW',''));
      
      logmsg(`Блок ${varblocknm} в PLC:`,0);
      adrob = {byte:mwbias*2, bit:0,  word:mwbias, bitinword:0}
      //теги всередині vars
      for (let vartagname in typeblock) {
        if (!mastertags [vartagname]) {
          logmsg (`Не знайдено тег ${vartagname} в базі конфігураційних тегів! Наступне перетворення не можливе!`)
          return ;
        }
        let taghmi = mastertags[vartagname].plchmi = {type: typeblock[vartagname].type};
        let typehmi = alltypes[typeblock[vartagname].type];
        taghmi.adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
        for (let fieldname in typehmi) {
          taghmi[fieldname] = {type: typehmi[fieldname].type};
          taghmi[fieldname].adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
          addaddr (typehmi[fieldname].type, adrob);
        }
        logmsg(`Змінна ${vartagname} добавлено в БД:`,0)   
        //console.log (mastertags [vartagname])
      }   
    }
  } 
  plctags.tags = mastertags;
  //adrob:{word, bitinword, byte, bit}
  //name	"AOH" typeName	"AOH" topologicalAddress	"%MW550"
  logmsg(`Змінні добавлено в БД`) 
  //------------------ формування VARBUF
  let varbuf = plctags.varbuf = JSON.parse(JSON.stringify(plctags.types[varblocknames.VARBUF]));
  varbuf.type = varblocknames.VARBUF; 
  varbuf.adr = plcblocks[varblocknames.VARBUF]._attributes.topologicalAddress;
  logmsg(`${varblocknames.VARBUF} добавлено в БД`) 
  
  logmsg("------------------ Формування бази даних каналів");
  let plc_chs = {
    types:{}, chs:{}, memmap:{}, chbuf:{}, modules:[], submodulebuf: {}, iomapplc:{}
  };
  //назви типів та змінних
  typeblocknames = {CH_CFG:"CH_CFG", CH_HMI:"CH_HMI", CH_BUF:"CH_BUF", MODULE:"MODULE", SUBMODULE:"SUBMODULE"};
  varblocknames = {MODULES:"MODULES", SUBMODULE: "SUBMODULE", CH_BUF:"CH_BUF"}; 
  found = true;
  for (let typeblockname in typeblocknames) {
    //для кожного типу каркасу можуть бути по кілька блоків
    let types = [];
    if (typeof typeblocknames[typeblockname] === 'object') {
      types = typeblocknames[typeblockname]
    } else {
      types.push (typeblocknames[typeblockname]);     
    }
    for (typename of types) {
      if (!alltypes[typename]) {
        logmsg(`ERR: Не знайдено тип ${typename}`);
        found = false;
      }
      plc_chs.types[typename] = alltypes[typename]
    }   
  }
  //модулі
  let modulenmb=0; 
  let startadr = plcblocks[varblocknames.MODULES]._attributes.topologicalAddress;
  let mwbias = parseInt(startadr.toUpperCase().replace('%MW',''));
  adrob = {byte:mwbias*2, bit:0,  word:mwbias, bitinword:0}
  for (let modulexml of plcblocks[varblocknames.MODULES].instanceElementDesc) {
    let module = {};
    module.adr = '%MW' + adrob.word + '.' + adrob.bitinword;
    module.type = typeblocknames.MODULE;
    module.modid = modulexml.comment._text;
    for (let fieldname in plc_chs.types.MODULE) {
      module[fieldname] = {type: plc_chs.types.MODULE[fieldname].type};
      module[fieldname].adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
      addaddr (module[fieldname].type, adrob);
    }
    logmsg(`Добавлено інформацію по MODULE${modulenmb}`)
    modulenmb++; 
    plc_chs.modules.push (module);
  }

  //CH_BUF
  startadr = plcblocks[varblocknames.CH_BUF]._attributes.topologicalAddress;
  mwbias = parseInt(startadr.toUpperCase().replace('%MW',''));
  adrob = {byte:mwbias*2, bit:0,  word:mwbias, bitinword:0};
  let chbuf = plc_chs.chbuf;
  chbuf.adr = '%MW' + adrob.word + '.' + adrob.bitinword;
  chbuf.type = typeblocknames.CH_BUF;
  for (let fieldname in plc_chs.types.CH_BUF) {
    chbuf[fieldname] = {type: plc_chs.types.CH_BUF[fieldname].type};
    chbuf[fieldname].adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
    addaddr (chbuf[fieldname].type, adrob);
  }
  logmsg(`Добавлено інформацію по CH_BUF`);

  //SUbMODULE_BUF
  startadr = plcblocks[varblocknames.SUBMODULE]._attributes.topologicalAddress;
  mwbias = parseInt(startadr.toUpperCase().replace('%MW',''));
  adrob = {byte:mwbias*2, bit:0,  word:mwbias, bitinword:0};
  let submodulebuf = plc_chs.submodulebuf;
  submodulebuf.adr = '%MW' + adrob.word + '.' + adrob.bitinword;
  submodulebuf.type = typeblocknames.SUBMODULE;
  for (let fieldname in plc_chs.types.SUBMODULE) {
    submodulebuf[fieldname] = {type: plc_chs.types.SUBMODULE[fieldname].type};
    submodulebuf[fieldname].adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
    addaddr (submodulebuf[fieldname].type, adrob);
  }
  logmsg(`Добавлено інформацію по SUBMODULE`);
  //process.exit();
  
  logmsg("------------------ Формування бази даних ПЛК");
  let plc_plcs = {
    types:{}, memap:{}, plc:{}
  };
  typeblocknames = {PLC_CFG:"PLC_CFG"};
  varblocknames = {PLC:"PLC"}; 
  found = true;
  for (let typeblockname in typeblocknames) {
    //для кожного типу каркасу можуть бути по кілька блоків
    let types = [];
    if (typeof typeblocknames[typeblockname] === 'object') {
      types = typeblocknames[typeblockname]
    } else {
      types.push (typeblocknames[typeblockname]);     
    }
    for (typename of types) {
      if (!alltypes[typename]) {
        logmsg(`ERR: Не знайдено тип ${typename}`);
        found = false;
      }
      plc_plcs.types[typename] = alltypes[typename]
    }   
  }
  startadr = plcblocks[varblocknames.PLC]._attributes.topologicalAddress;
  mwbias = parseInt(startadr.toUpperCase().replace('%MW',''));
  adrob = {byte:mwbias*2, bit:0,  word:mwbias, bitinword:0};
  let plc = plc_plcs.plc;
  plc.adr = '%MW' + adrob.word + '.' + adrob.bitinword;
  plc.type = typeblocknames.PLC;
  for (let fieldname in plc_plcs.types.PLC_CFG) {
    plc[fieldname] = {type: plc_plcs.types.PLC_CFG[fieldname].type};
    plc[fieldname].adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
    plc[fieldname].descr = plc_plcs.types.PLC_CFG[fieldname].descr;
    addaddr (plc[fieldname].type, adrob);
  }
  logmsg(`Добавлено інформацію по PLC`);

  fs.writeFileSync (seunresultfiles + 'plc_tags.json',JSON.stringify(plctags),"utf8");
  fs.writeFileSync (seunresultfiles + 'plc_chs.json',JSON.stringify(plc_chs),"utf8");
  fs.writeFileSync (seunresultfiles + 'plc_plcs.json',JSON.stringify(plc_plcs),"utf8");
  writetolog(1);
}

//
function DDTtotype (DDTSource, pfwtype) {
  let i=0;
  let fields = [];
  if (DDTSource.structure.variables[0]) {//якщо масив
    fields = DDTSource.structure.variables;
  } else {
    fields.push (DDTSource.structure.variables);
  }
  let adrob = {word:0, bitinword:0, byte:0, bit:0}; 
  for (let field of fields) { 
    DDTfield = pfwtype [field._attributes.name] = {
      type: field._attributes.typeName,
      descr: field.comment ? field.comment._text: ''
    }
    //якщо тип представлений структурою
    if (DDTSource.structure.variables[i+1] && DDTSource.structure.variables[i+1].attribute && DDTSource.structure.variables[i+1].attribute._attributes.name === 'ExtractBit' && DDTfield.type !== 'BOOL') {
      DDTfield.type = DDTSource._attributes.DDTName.split('_')[0] + '_' + field._attributes.name;
      DDTSource
    }
    switch (DDTfield.type) {
      case 'INT':
      case 'UINT':
      case 'DINT':
      case 'UDINT':
      case 'REAL':
      case 'BOOL':  
        DDTfield.type = DDTfield.type.toLowerCase();  
    }
     
    DDTfield.byte = adrob.byte;
    DDTfield.bit = adrob.bit;
    DDTfield.word = adrob.word;
    DDTfield.bitinword = adrob.bitinword;
    addaddr (DDTfield.type, adrob);
    //field.attribute._attributes.name = 'ExtractBit'
    //field.attribute._attributes.value    
    i++;
  }
}

//фнкція розрахунку адреси для наступного поля скалярного типу
//приймає type, adrob:{word, bitinword, byte, bit} поепереднє і модифікує його
function addaddr(type, adrob) {
  let addbyte = 0, addbit = 0; //для IoTGateway
  let addword = 0, addbitinword = 0;//для Modbus
  switch (type) {
    case "bool":
      addbit = 1;
      addbitinword = 1;
      break;
    case "int":
    case "uint":
      addbyte = 2;
      addword = 1;
      break;
    case "real":
    case "dint":
    case "udint":
      addbyte = 4;
      addword = 2;
      break;
    default:
      //return -1;
      type = type.toLowerCase();
      if (type.search('array')>-1) {
        let ar = type.split(' of ');
        let scalartype = ar[1];
        let startend = ar[0].split('[')[1].split(']')[0];
        let start = startend.split('..')[0];
        let finish = startend.split('..')[1];
        for (i=start; i<=finish; i++) {
          addaddr(scalartype, adrob)
        }
      }
      break;
  }
  adrob.bit += addbit;
  adrob.bitinword += addbitinword;
  if (adrob.bit > 7) {
    adrob.bit = 0;
    addbyte = 1;
  }
  if (adrob.bitinword > 15) {
    adrob.bitinword = 0;
    addword = 1;
  }
  if (addbit === 0 && (adrob.byte % 2 !== 0)) {
    adrob.byte++;
  }
  /*if (addbitinword === 0 && (adrob.word % 2 !== 0)) {
    adrob.word++;
  }*/
  adrob.byte += addbyte;
  adrob.word += addword;
}

module.exports = {
  xefparseall,
  opts,
};