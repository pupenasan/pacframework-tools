/* модуль для конвертування змісту проекту UnityPRO/ControlExpert в Master Data *.xef
*/
const path = require("path");
const fs = require("fs");
const xmlparser = require("xml-js"); //https://www.npmjs.com/package/xml-js
const masterdatatools = require("./masterdatatools");
const ini = require("ini"); //https://github.com/npm/ini#readme
const config = ini.parse(fs.readFileSync(global.inipath, "utf-8"));

const opts = {
  logpath: "log",
  logfile: "tiaparsetools.log",
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

masterdatatools.opts.logfile = "tiaparsetools.log";
masterdatatools.opts.source = config.tiaparsetools.pathsource;
masterdatatools.opts.logpath = config.tiaparsetools.pathlog;

//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;
const syncobs = masterdatatools.syncobs;

function xefparseall () {
  const tiasoucefiles = path.normalize(config.seunparsetools.pathsource + "/");
  const tiaresultfiles = path.normalize(config.seunparsetools.pathresult + "/");
  const xefsourcefilename = path.normalize(tiasoucefiles + config.seunparsetools.xeffile + ".xef");
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
  logmsg("Усі типи отримані");
  let plcblocks = {};
  for (let variable of  jscontent.dataBlock.variables) {
    let varblockname = variable._attributes.name;
    plcblocks[varblockname] = variable;
  }
  logmsg("Усі змінні отримані");
  /*
  //назви типів 
  let typeblocknames = {
    PLC_CFG:"PLC_CFG", MODULE:"MODULE", SUBMODULE:"SUBMODULE", CH_BUF:"CH_BUF", ACT:"ACT", ACTH:"ACTH", ACTTR_CFG:"ACTTR_CFG"  
  };
  //назви змінних
  let varblocknames = {
    PLC:"PLC", MODULES:"MODULES", SUBMODULE:"SUBMODULE", CH_BUF:"CH_BUF", ACT:"ACT", ACTH:"ACTH", ACTBUF:"ACTBUF"
  };*/  
  
  
  logmsg("----- Формування тегів");
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
      
      adrob = {byte:mwbias*2, bit:0,  word:mwbias, bitinword:0}
      //теги всередині vars
      for (let vartagname in typeblock) {
        if (!mastertags [vartagname]) {
          console.log (`Не знайдено тег ${vartagname} в базі конфігураційних тегів! Наступне перетворення не можливе!`)
          return ;
        }
        let taghmi = mastertags[vartagname].plchmi = {type: typeblock[vartagname].type};
        let typehmi = alltypes[typeblock[vartagname].type];
        for (let fieldname in typehmi) {
          taghmi[fieldname] = {type: typehmi[fieldname].type};
          taghmi[fieldname].adr = '%MW' + adrob.word + '.' + adrob.bitinword; 
          addaddr (typehmi[fieldname].type, adrob);
        }
        //console.log (mastertags [vartagname])
      } 
    }
  } 
  plctags.tags = mastertags;
  //adrob:{word, bitinword, byte, bit}

  /*
  switch (variable._attributes.typeName) {
    case 'VARS':
      break;
    case 'DIH':        
      break;
    case 'DOH':        
      break;
    case 'AIH':        
      break;
    case 'AOH':        
      break;
  
    default:
      break;
  }
  */
  //name	"AOH" typeName	"AOH" topologicalAddress	"%MW550"
  


  fs.writeFileSync (tiaresultfiles + 'plc_tags.json',JSON.stringify(plctags),"utf8");
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