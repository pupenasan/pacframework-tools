const os = require('os');
const fs = require('fs');
const path = require('path');
const masterdatatools = require('../common/masterdatatools');
// const envvar = require ('./const.js');

const opts = {
  logpath: 'log',
  logfile: 'general.log',
  resultpath: 'totia',
  source: 'source',
};

masterdatatools.opts.logfile = opts.logfile;
// скорочені назви функцій
const { logmsg } = masterdatatools;

function create_all(cfgchs, cfgtags, cfgacts) {
  logmsg('-------------------- Створення програмних блоків для TIA');
  create_pstsdb(cfgchs);
  create_chdb(cfgchs);
  create_dbmodulesdb(cfgchs);
  create_plcmapsscl(cfgchs);
  create_vardb(cfgtags);
  create_varshmi(cfgtags);
  create_actrtrsdb(cfgacts);
}

function create_plcmapsscl(cfgchs) {
  const iomap = cfgchs.iomapplc.plcform;
  const header = `FUNCTION "PLCMAPS" : Void
  { S7_Optimized_Access := 'TRUE' }
  VERSION : 0.1
  
  BEGIN
    `;
  const footer = `
  END_FUNCTION

  `;

  let body = `// цей код згенеровано ${Date()}  
    "SYS".PLCCFG.DICNT := ${cfgchs.chs.statistic.dicnt};
	  "SYS".PLCCFG.DOCNT := ${cfgchs.chs.statistic.docnt};
	  "SYS".PLCCFG.AICNT := ${cfgchs.chs.statistic.aicnt};
	  "SYS".PLCCFG.AOCNT := ${cfgchs.chs.statistic.aocnt};
	  "SYS".PLCCFG.MODULSCNT := ${cfgchs.chs.statistic.modulscnt};
	  "DBMODULES".MODULES[0].STA.%X11 := true;
  `;
  for (let i = 0; i < cfgchs.chs.statistic.modulscnt; i++) {
    const modulename = iomap[i].MODID;
    body += `
      //${modulename} ${iomap[i].MODTYPESTR} 
      "DBMODULES".MODULES[${i}].TYPE := 16#${iomap[i].MODTYPE}; 
      "DBMODULES".MODULES[${i}].CHCNTS := 16#${iomap[i].CHCNTS};
      "DBMODULES".MODULES[${i}].STRTNMB[0] := ${iomap[i].STRTNMB0};
      "DBMODULES".MODULES[${i}].STRTNMB[1] := ${iomap[i].STRTNMB1};
      "DBMODULES".MODULES[${i}].STRTNMB[2] := ${iomap[i].STRTNMB2};
      "DBMODULES".MODULES[${i}].STRTNMB[3] := ${iomap[i].STRTNMB3};
    `;
  }
  const filecontent = header + body + footer;
  const filename = `${opts.resultpath}/PLCMAPS.scl`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_chdb(cfgchs) {
  filecontent = `DATA_BLOCK "CH"
    { S7_Optimized_Access := 'FALSE' }
    VERSION : 0.1
    NON_RETAIN
       STRUCT 
          CHDI { S7_SetPoint := 'False'} : Array[0..${cfgchs.chs.statistic.dicnt}] of "CH_HMI";
          CHDO { S7_SetPoint := 'False'} : Array[0..${cfgchs.chs.statistic.docnt}] of "CH_HMI";
          CHAI : Array[0..${cfgchs.chs.statistic.aicnt}] of "CH_HMI";
          CHAO : Array[0..${cfgchs.chs.statistic.aocnt}] of "CH_HMI";
       END_STRUCT;
    
    
    BEGIN
    
    END_DATA_BLOCK
    `;
  const filename = `${opts.resultpath}/CH.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, filecontent, 'utf8');
}

function create_pstsdb(cfgchs) {
  filecontent = `DATA_BLOCK "SYS"
  { S7_Optimized_Access := 'FALSE' }
  VERSION : 0.1
  NON_RETAIN
     STRUCT 
        PLCCFG : "PLC_CFG";
        CHDI : Array[0..${cfgchs.chs.statistic.dicnt}] of "CH_CFG";
        CHDO : Array[0..${cfgchs.chs.statistic.docnt}] of "CH_CFG";
        CHAI : Array[0..${cfgchs.chs.statistic.aicnt}] of "CH_CFG";
        CHAO : Array[0..${cfgchs.chs.statistic.aocnt}] of "CH_CFG";
     END_STRUCT;
  
  
  BEGIN\n`;
  for (let i = 1; i <= cfgchs.chs.statistic.dicnt; i++) {
    const clsid = getclsidfromch(cfgchs, cfgchs.chs.chdis[i], 'plchex');
    filecontent += `   CHDI[${i}].CLSID := ${clsid};CHDI[${i}].ID := ${i};\n`;
  }
  for (let i = 1; i <= cfgchs.chs.statistic.docnt; i++) {
    const clsid = getclsidfromch(cfgchs, cfgchs.chs.chdos[i], 'plchex');
    filecontent += `   CHDO[${i}].CLSID := ${clsid};CHDO[${i}].ID := ${i};\n`;
  }
  for (let i = 1; i <= cfgchs.chs.statistic.aicnt; i++) {
    const clsid = getclsidfromch(cfgchs, cfgchs.chs.chais[i], 'plchex');
    filecontent += `   CHAI[${i}].CLSID := ${clsid};CHAI[${i}].ID := ${i};\n`;
  }
  for (let i = 1; i <= cfgchs.chs.statistic.aocnt; i++) {
    const clsid = getclsidfromch(cfgchs, cfgchs.chs.chaos[i], 'plchex');
    filecontent += `   CHAO[${i}].CLSID := ${clsid};CHAO[${i}].ID := ${i};\n`;
  }
  filecontent += `END_DATA_BLOCK
  `;
  const filename = `${opts.resultpath}/SYS.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function getclsidfromch(cfgchs, ch, format) {
  const { type } = ch;
  const subtype = ch.subtype || 'dflt';
  let val;
  let dectype = 0;
  if (cfgchs.chs.types[type] && cfgchs.chs.types[type][subtype]) {
    dectype = parseInt(cfgchs.chs.types[type][subtype].clsid || 0, 16);
  }
  switch (format) {
    case 'plchex':
      val = `16#${dectype.toString(16)}`;
      // console.log (val)
      break;

    default:
      break;
  }
  return val;
}

function create_dbmodulesdb(cfgchs) {
  const iomap = cfgchs.iomapplc.plcform;
  body = `MODULES[${0}].STA := 1;`;
  for (let i = 0; i < cfgchs.chs.statistic.modulscnt; i++) {
    const modulename = iomap[i].MODID;
    body += `    
      MODULES[${i}]."TYPE" := 16#${iomap[i].MODTYPE};
      MODULES[${i}].CHCNTS := 16#${iomap[i].CHCNTS};
      MODULES[${i}].STRTNMB[0] := ${iomap[i].STRTNMB0};
      MODULES[${i}].STRTNMB[1] := ${iomap[i].STRTNMB1};
      MODULES[${i}].STRTNMB[2] := ${iomap[i].STRTNMB2};
      MODULES[${i}].STRTNMB[3] := ${iomap[i].STRTNMB3};`;
  }

  filecontent = `
    DATA_BLOCK "DBMODULES"
    { S7_Optimized_Access := 'FALSE' }
    VERSION : 0.2
    NON_RETAIN
      STRUCT 
          MODULES { S7_SetPoint := 'False'} : Array[0..${cfgchs.chs.statistic.modulscnt - 1}] of "MODULE";
      END_STRUCT;
    BEGIN
      ${body}
    END_DATA_BLOCK
  `;
  const filename = `${opts.resultpath}/DBMODULES.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_vardb(cfgtags) {
  let bodyvar = ''; let
    bodyval = '';
  const { tags } = cfgtags;
  for (const tagname in tags) {
    const tag = tags[tagname];
    // check CYRYLYC
    const rforeign = /[^\u0000-\u007f]/;
    if (rforeign.test(tag.props.TAGNAME)) {
      console.log(`Кирилиця в імені ${tag.props.TAGNAME}`);
      break;
    } else {
      bodyvar += `${tag.props.TAGNAME}: "${tag.props.TYPE}VAR_CFG"; // ${tag.props.DESCRIPTION}
      `;
      const chid = tag.props.TAGNAME.substr(0, 3).toLowerCase() === 'rez' ? 0 : tag.props.CHID;
      bodyval += `${tag.props.TAGNAME}.ID := ${tag.props.ID}; ${tag.props.TAGNAME}.CHID := ${chid}; ${tag.props.TAGNAME}.CHIDDF := ${chid};`;
      // добавляємо машстабування, якщо воно вказане
      if ((tag.props.TYPE === 'AI' || tag.props.TYPE === 'AO') && tag.props.SCALE) {
        const scalear = tag.props.SCALE.replace(/[()]/g, '').split('..');
        if (scalear.length === 2) {
          const min = (parseFloat(scalear[0])).toFixed(3);
          const max = (parseFloat(scalear[1])).toFixed(3);
          bodyval += `${tag.props.TAGNAME}.LOENG:= ${min};${tag.props.TAGNAME}.HIENG:= ${max};\n`;
        }
      } else {
        bodyval += '\n';
      }
    }
  }
  filecontent = `DATA_BLOCK "VAR"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
NON_RETAIN
  STRUCT 
    ${bodyvar}
  END_STRUCT;
BEGIN
  ${bodyval}  
END_DATA_BLOCK
`;
  const filename = `${opts.resultpath}/VAR.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_varshmi(cfgtags) {
  let bodyvarDIH = ''; let bodyvarDOH = ''; let bodyvarAIH = ''; let
    bodyvarAOH = '';
  let bodyDIVARS = `// цей код згенеровано ${Date()}\n`; let bodyDOVARS = `// цей код згенеровано ${Date()}\n`; let bodyAIVARS = `// цей код згенеровано ${Date()}\n`; let
    bodyAOVARS = `// цей код згенеровано ${Date()}\n`;
  const tags = [];
  for (const tagname in cfgtags.tags) {
    tags.push(cfgtags.tags[tagname]);
  }
  // ---------------------------- create DIH.db DOH.db AIH.db AOH.db
  // упорядкування елементів по зростанню ID в кожному типі
  tags.sort((a, b) => a.props.ID - b.props.ID);
  for (tag of tags) {
    switch (tag.props.TYPE) {
      case 'DI':
        bodyvarDIH += `${tag.props.TAGNAME} : "${tag.props.TYPE}VAR_HMI"; // ${tag.props.DESCRIPTION} \{${tag.props.DEV}\} 
        `;
        bodyDIVARS += `"DIVARFN"(CHCFG := "SYS".CHDI["VAR".${tag.props.TAGNAME}.CHID], DIVARCFG := "VAR".${tag.props.TAGNAME}, DIVARHMI := "DIH".${tag.props.TAGNAME});
        `;
        break;
      case 'DO':
        bodyvarDOH += `${tag.props.TAGNAME} : "${tag.props.TYPE}VAR_HMI"; // ${tag.props.DESCRIPTION} \{${tag.props.DEV}\} 
        `;
        bodyDOVARS += `"DOVARFN"(CHCFG := "SYS".CHDO["VAR".${tag.props.TAGNAME}.CHID], DOVARCFG := "VAR".${tag.props.TAGNAME}, DOVARHMI := "DOH".${tag.props.TAGNAME});
        `;
        break;
      case 'AI':
        bodyvarAIH += `${tag.props.TAGNAME} : "${tag.props.TYPE}VAR_HMI"; // ${tag.props.DESCRIPTION} \{${tag.props.DEV}\} 
        `;
        bodyAIVARS += `"AIVARFN"(CHCFG := "SYS".CHAI["VAR".${tag.props.TAGNAME}.CHID], AIVARCFG := "VAR".${tag.props.TAGNAME}, AIVARHMI := "AIH".${tag.props.TAGNAME});
        `;
        break;
      case 'AO':
        bodyvarAOH += `${tag.props.TAGNAME} : "${tag.props.TYPE}VAR_HMI"; // ${tag.props.DESCRIPTION} \{${tag.props.DEV}\} 
        `;
        bodyAOVARS += `"AOVARFN"(CHCFG := "SYS".CHAO["VAR".${tag.props.TAGNAME}.CHID], AOVARCFG := "VAR".${tag.props.TAGNAME}, AOVARHMI := "AOH".${tag.props.TAGNAME});
        `;
        break;
      default:
        break;
    }
  }

  filecontent = `
    DATA_BLOCK "DIH"
    { S7_Optimized_Access := 'FALSE' }
    VERSION : 0.1
    NON_RETAIN
      STRUCT 
        ${bodyvarDIH}
      END_STRUCT;
    BEGIN
    END_DATA_BLOCK
  `;
  let filename = `${opts.resultpath}/DIH.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    DATA_BLOCK "DOH"
    { S7_Optimized_Access := 'FALSE' }
    VERSION : 0.1
    NON_RETAIN
      STRUCT 
        ${bodyvarDOH}
      END_STRUCT;
    BEGIN
    END_DATA_BLOCK
  `;
  fs.writeFileSync(`${opts.resultpath}/DOH.db`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    DATA_BLOCK "AIH"
    { S7_Optimized_Access := 'FALSE' }
    VERSION : 0.1
    NON_RETAIN
      STRUCT 
        ${bodyvarAIH}
      END_STRUCT;
    BEGIN
    END_DATA_BLOCK
  `;
  fs.writeFileSync(`${opts.resultpath}/AIH.db`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
  DATA_BLOCK "AOH"
  { S7_Optimized_Access := 'FALSE' }
  VERSION : 0.1
  NON_RETAIN
    STRUCT 
      ${bodyvarAOH}
    END_STRUCT;
  BEGIN
  END_DATA_BLOCK
  `;
  fs.writeFileSync(`${opts.resultpath}/AOH.db`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  // ---------------------------- create DIVARS.scl DOVARS.scl AIVARS.scl AOVARS.scl
  filecontent = `
    FUNCTION "DIVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyDIVARS}
    END_FUNCTION
  `;
  filename = `${opts.resultpath}/DIVARS.scl`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    FUNCTION "DOVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyDOVARS}
    END_FUNCTION
  `;
  fs.writeFileSync(`${opts.resultpath}/DOVARS.scl`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    FUNCTION "AIVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyAIVARS}
    END_FUNCTION
  `;
  fs.writeFileSync(`${opts.resultpath}/AIVARS.scl`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    FUNCTION "AOVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyAOVARS}
    END_FUNCTION
  `;
  fs.writeFileSync(`${opts.resultpath}/AOVARS.scl`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_actrtrsdb(cfgacts) {
  let bodyvar = ''; let
    bodyval = '';
  let bodyvarHMI = ''; const
    bodyvalHMI = '';
  const acts = cfgacts.acttrs;
  for (actname in acts) {
    // check CYRYLYC
    const act = acts[actname];
    const acttrtype = cfgacts.types[act.type];
    const rforeign = /[^\u0000-\u007f]/;
    if (rforeign.test(actname)) {
      console.log(`Кирилиця в імені виконавчого механізма ${actname}`);
      break;
    } else {
      bodyvar += `${actname} : "${acttrtype.fnname}_CFG"; // ${act.description}
      `;
      bodyvarHMI += `${actname} : "${acttrtype.fnname}_HMI"; // ${act.description}
      `;
      bodyval += `${actname}.ID := ${act.id}; ${actname}.CLSID := ${acttrtype.clsid}; ${actname}.T_OPNSP := ${act.topn || 100};
      `;
    }
  }
  filecontent = `DATA_BLOCK "ACT"
  { S7_Optimized_Access := 'TRUE' }
  VERSION : 0.1
  NON_RETAIN
    STRUCT 
      ${bodyvar}
      END_STRUCT;
  BEGIN
    ${bodyval}  
  END_DATA_BLOCK
  `;

  let filename = `${opts.resultpath}/ACT.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `DATA_BLOCK "ACTH"
  { S7_Optimized_Access := 'FALSE' }
  VERSION : 0.1
  NON_RETAIN
    STRUCT 
      ${bodyvarHMI}
      END_STRUCT;
  BEGIN
    ${bodyvalHMI}  
  END_DATA_BLOCK
  `;

  filename = `${opts.resultpath}/ACTH.db`;
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  // ---------------------------- create ACTTRS.scl
  let bodyPROG = '';
  // упорядкування по типу
  // стоврення нового обєкту, прототипу з типів
  const acttrsbytypes = JSON.parse(JSON.stringify(cfgacts.types));
  for (acttrname in acts) {
    const act = acts[acttrname];
    const acttype = act.type;
    if (!acttrsbytypes[acttype].acttrs) acttrsbytypes[acttype].acttrs = {};
    acttrsbytypes[acttype].acttrs[acttrname] = act;
  }
  for (acttrtypename in acttrsbytypes) {
    acttrtype = acttrsbytypes[acttrtypename];
    bodyPROG += `// ----------- Виконавчі механізми ${acttrtypename} - ${acttrtype.typedescr} ----------------- \n     `;
    // перебір виконавчих механізмів відповідно до типу
    for (actrname in acttrtype.acttrs) {
      // console.log (actrname);
      const acttr = acttrtype.acttrs[actrname];
      const { io } = acttr;
      // якщо є нелінковані теги нписати про це
      if (io.unlinked && io.unlinked.length > 0) {
        bodyPROG += `//неліноковані теги: ${JSON.stringify(io.unlinked)} \n     `;
      }
      bodyPROG += `"${acttrtype.fnname}"(ACTCFG:="ACT".${actrname}, ACTHMI:="ACTH".${actrname}`;
      // перебор по інтерфейсу
      for (ioname in io) {
        if (ioname !== 'unlinked') {
          const ionameinfn = ioname.split('/')[0]; // назва в функції завжди ліва назва з альтернативних варіантів суфіксів
          const ioval = io[ioname];
          bodyPROG += `, ${ionameinfn}:=`;
          if (ioval.length > 0) { // для привязаного IO
            bodyPROG += `"VAR".${ioval}`;
          } else { // для непривязаного IO ставимо пустишки
            const vartype = acttrtype.io[ioname].type;
            // console.log (`${ionameinfn} -> ${vartype}`);
            switch (vartype) {
              case 'DI':
                bodyPROG += '#DIVAR_TMP';
                break;
              case 'AI':
                bodyPROG += '#AIVAR_TMP';
                break;
              case 'DO':
                bodyPROG += '#DOVAR_TMP';
                break;
              case 'AO':
                bodyPROG += '#AOVAR_TMP';
                break;
            }
          }
        }
      }
      bodyPROG += `); // ${acttr.description} \n     `;
    }
  }

  filecontent = `
   FUNCTION "ACTTRS" : Void
   { S7_Optimized_Access := 'TRUE' }
   VERSION : 0.1
    VAR_TEMP 
      DIVAR_TMP : "DIVAR_CFG";
      DOVAR_TMP : "DOVAR_CFG";
      AIVAR_TMP : "AIVAR_CFG"; 
      AOVAR_TMP : "AOVAR_CFG";
    END_VAR
   BEGIN
    // цей код згенеровано ${Date()}   
    // темпорарі змінні-болванки ---
     DIVAR_TMP.ID := 0; DOVAR_TMP.ID := 0; AIVAR_TMP.ID := 0; AOVAR_TMP.ID := 0;
     DIVAR_TMP.STA.VALB := 0; DOVAR_TMP.STA.VALB :=0; AIVAR_TMP.VAL := 0; AOVAR_TMP.VAL := 0;
     DIVAR_TMP.STA.WRN := 0; AIVAR_TMP.STA.WRN :=0; 
     DIVAR_TMP.STA.ALM:=0; AIVAR_TMP.STA.ALM:=0;   
     // -----------------------------
     ${bodyPROG}
   END_FUNCTION
 `;
  filename = `${opts.resultpath}/ACTTRS.scl`;
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

// сира недороблена, може й не потрібна
function create_dbsinfo(masterdata) {
  let initvals = '';
  let DBNMB; let BIAS; let
    CNTBYTE;
  const DBs = [,
  ];
  initvals += `
  BLCKSENDCFG[${i}].DBNMB := 6;
  BLCKSENDCFG[${i}].BIAS := 2000;
  BLCKSENDCFG[${i}].CNTBYTE := 304;`;

  filecontent = `DATA_BLOCK "IOTGW_CTRL"
  { S7_Optimized_Access := 'TRUE' }
  VERSION : 0.1
  NON_RETAIN
    VAR 
        UDPSEND : Bool;
        UDPCONN : Bool;
        CNTSEND : UInt;
        CNTERR : UInt;
        CNTBUSY : UInt;
        CNTTMOUT : UInt;
        LASTERR : UInt;
        STEP1 : UInt;
        T_STEP1 : UDInt;
        T_PREV : UDInt;
        CNTBLCKS : UInt;
        BLCKSENDCFG : Array[0..${blockcounts - 1}] of "IOTBLCFG";
    END_VAR


  BEGIN
    UDPSEND := false;
    UDPCONN := true;
    CNTBLCKS := 2;
    ${initvals}
  END_DATA_BLOCK`;
  filename = `${envvar.codepath}Program blocks/NET/IOTGW_CTRL.db`;
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

module.exports = {
  create_plcmapsscl,
  create_pstsdb,
  create_chdb,
  create_dbmodulesdb,
  create_vardb,
  create_varshmi,
  create_all,
  create_actrtrsdb,
  opts,
};
