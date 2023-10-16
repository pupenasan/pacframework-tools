// https://github.com/SheetJS/sheetjs

const fs = require('fs');
const path = require('path');
const envvar = require('./const.js');

const { masterpath } = envvar;

function create_all(masterdata) {
  create_plcmapsscl(masterdata);
  create_pstsdb(masterdata);
  create_chdb(masterdata);
  create_dbmodulesdb(masterdata);
  create_vardb(masterdata);
  create_varshmi(masterdata);
  create_actrtrsdb(masterdata);
}

function create_plcmapsscl(masterdata) {
  const iomap = masterdata.iomapplc.plcform;
  const header = `FUNCTION "PLCMAPS" : Void
  { S7_Optimized_Access := 'TRUE' }
  VERSION : 0.1
  
  BEGIN
    `;
  const footer = `
  END_FUNCTION

  `;

  let body = `// цей код згенеровано ${Date()}  
    "SYS".PLCCFG.DICNT := ${masterdata.iostatistic.dicnt};
	  "SYS".PLCCFG.DOCNT := ${masterdata.iostatistic.docnt};
	  "SYS".PLCCFG.AICNT := ${masterdata.iostatistic.aicnt};
	  "SYS".PLCCFG.AOCNT := ${masterdata.iostatistic.aocnt};
	  "SYS".PLCCFG.MODULSCNT := ${masterdata.iostatistic.modulscnt};
	  "DBMODULES".MODULES[0].STA.%X11 := true;
  `;
  for (let i = 0; i < masterdata.iostatistic.modulscnt; i++) {
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
  const filename = `${envvar.codepath}Program blocks/PLC/PLCMAPS.scl`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_pstsdb(masterdata) {
  filecontent = `DATA_BLOCK "SYS"
  { S7_Optimized_Access := 'FALSE' }
  VERSION : 0.1
  NON_RETAIN
     STRUCT 
        PLCCFG : "PLC_CFG";
        CHDI : Array[0..${masterdata.iostatistic.dicnt - 1}] of "CH_CFG";
        CHDO : Array[0..${masterdata.iostatistic.docnt - 1}] of "CH_CFG";
        CHAI : Array[0..${masterdata.iostatistic.aicnt - 1}] of "CH_CFG";
        CHAO : Array[0..${masterdata.iostatistic.aocnt - 1}] of "CH_CFG";
     END_STRUCT;
  
  
  BEGIN\n`;
  for (let i = 1; i <= masterdata.iostatistic.dicnt; i++) {
    if (masterdata.chs.DI[i] && masterdata.chs.DI[i].CLSID) {
      filecontent += `   CHDI[${i}].CLSID := ${masterdata.chs.DI[i].CLSID};CHDI[${i}].ID := ${i};\n`;
    }
  }
  for (let i = 1; i <= masterdata.iostatistic.aicnt; i++) {
    if (masterdata.chs.AI[i] && masterdata.chs.AI[i].CLSID) {
      filecontent += `   CHAI[${i}].CLSID := ${masterdata.chs.AI[i].CLSID};CHAI[${i}].ID := ${i};\n`;
    }
  }
  for (let i = 1; i <= masterdata.iostatistic.docnt; i++) {
    if (masterdata.chs.DO[i] && masterdata.chs.DO[i].CLSID) {
      filecontent += `   CHDO[${i}].CLSID := ${masterdata.chs.DO[i].CLSID};CHDO[${i}].ID := ${i};\n`;
    }
  }
  for (let i = 1; i <= masterdata.iostatistic.aocnt; i++) {
    if (masterdata.chs.AO[i] && masterdata.chs.AO[i].CLSID) {
      filecontent += `   CHAO[${i}].CLSID := ${masterdata.chs.AO[i].CLSID};CHAO[${i}].ID := ${i};\n`;
    }
  }
  filecontent += `END_DATA_BLOCK
  `;
  const filename = `${envvar.codepath}Program blocks/PLC/SYS.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_chdb(masterdata) {
  filecontent = `DATA_BLOCK "CH"
    { S7_Optimized_Access := 'FALSE' }
    VERSION : 0.1
    NON_RETAIN
       STRUCT 
          CHDI { S7_SetPoint := 'False'} : Array[0..${masterdata.iostatistic.dicnt}] of "CH_HMI";
          CHDO { S7_SetPoint := 'False'} : Array[0..${masterdata.iostatistic.docnt}] of "CH_HMI";
          CHAI : Array[0..${masterdata.iostatistic.aicnt}] of "CH_HMI";
          CHAO : Array[0..${masterdata.iostatistic.aocnt}] of "CH_HMI";
       END_STRUCT;
    
    
    BEGIN
    
    END_DATA_BLOCK
    `;
  const filename = `${envvar.codepath}Program blocks/CH/CH.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, filecontent, 'utf8');
}

function create_dbmodulesdb(masterdata) {
  const iomap = masterdata.iomapplc.plcform;
  body = `MODULES[${0}].STA := 1;`;
  for (let i = 0; i < masterdata.iostatistic.modulscnt; i++) {
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
          MODULES { S7_SetPoint := 'False'} : Array[0..${masterdata.iostatistic.modulscnt - 1}] of "MODULE";
      END_STRUCT;
    BEGIN
      ${body}
    END_DATA_BLOCK
  `;
  const filename = `${envvar.codepath}Program blocks/PLC/DBMODULES.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_vardb(masterdata) {
  let bodyvar = ''; let
    bodyval = '';
  const { tags } = masterdata;
  for (tag of tags) {
    // check CYRYLYC
    const rforeign = /[^\u0000-\u007f]/;
    if (rforeign.test(tag.TAGNAME)) {
      console.log(`Кирилиця в імені ${tag.TAGNAME}`);
      break;
    } else {
      bodyvar += `${tag.TAGNAME} { S7_SetPoint := 'False'} : "${tag.TYPE}VAR_CFG"; // ${tag.DESCRIPTION}
      `;
      const chid = tag.TAGNAME.substr(0, 3).toLowerCase() === 'rez' ? 0 : tag.CHID;
      bodyval += `${tag.TAGNAME}.ID := ${tag.ID}; ${tag.TAGNAME}.CHID := ${chid}; ${tag.TAGNAME}.CHIDDF := ${chid};
      `;
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
  const filename = `${envvar.codepath}Program blocks/VAR/VAR.db`;
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_varshmi(masterdata) {
  let bodyvarDIH = ''; let bodyvarDOH = ''; let bodyvarAIH = ''; let
    bodyvarAOH = '';
  let bodyDIVARS = ''; let bodyDOVARS = ''; let bodyAIVARS = ''; let
    bodyAOVARS = '';
  const { tags } = masterdata;
  // ---------------------------- create DIH.db DOH.db AIH.db AOH.db
  // упорядкування елементів по зростанню CHID в кожному типі
  tags.sort((a, b) => a.ID - b.ID);
  for (tag of tags) {
    switch (tag.TYPE) {
      case 'DI':
        bodyvarDIH += `${tag.TAGNAME} { S7_SetPoint := 'False'} : "${tag.TYPE}VAR_HMI"; // ${tag.DESCRIPTION}
        `;
        bodyDIVARS += `"DIVARFN"(CHCFG := "SYS".CHDI["VAR".${tag.TAGNAME}.CHID], DIVARCFG := "VAR".${tag.TAGNAME}, DIVARHMI := "DIH".${tag.TAGNAME});
        `;
        break;
      case 'DO':
        bodyvarDOH += `${tag.TAGNAME} { S7_SetPoint := 'False'} : "${tag.TYPE}VAR_HMI"; // ${tag.DESCRIPTION}
        `;
        bodyDOVARS += `"DOVARFN"(CHCFG := "SYS".CHDO["VAR".${tag.TAGNAME}.CHID], DOVARCFG := "VAR".${tag.TAGNAME}, DOVARHMI := "DOH".${tag.TAGNAME});
        `;
        break;
      case 'AI':
        bodyvarAIH += `${tag.TAGNAME} { S7_SetPoint := 'False'} : "${tag.TYPE}VAR_HMI"; // ${tag.DESCRIPTION}
        `;
        bodyAIVARS += `"AIVARFN"(CHCFG := "SYS".CHAI["VAR".${tag.TAGNAME}.CHID], AIVARCFG := "VAR".${tag.TAGNAME}, AIVARHMI := "AIH".${tag.TAGNAME});
        `;
        break;
      case 'AO':
        bodyvarAOH += `${tag.TAGNAME} { S7_SetPoint := 'False'} : "${tag.TYPE}VAR_HMI"; // ${tag.DESCRIPTION}
        `;
        bodyAOVARS += `"AOVARFN"(CHCFG := "SYS".CHAO["VAR".${tag.TAGNAME}.CHID], AOVARCFG := "VAR".${tag.TAGNAME}, AOVARHMI := "AOH".${tag.TAGNAME});
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
  let filename = `${envvar.codepath}Program blocks/HMI/DIH.db`;
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
  fs.writeFileSync(`${envvar.codepath}Program blocks/HMI/DOH.db`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

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
  fs.writeFileSync(`${envvar.codepath}Program blocks/HMI/AIH.db`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

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
  fs.writeFileSync(`${envvar.codepath}Program blocks/HMI/AOH.db`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  // ---------------------------- create DIVARS.scl DOVARS.scl AIVARS.scl AOVARS.scl
  filecontent = `
    FUNCTION "DIVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyDIVARS}
    END_FUNCTION
  `;
  filename = `${envvar.codepath}Program blocks/VAR/DIVARS.scl`;
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
  fs.writeFileSync(`${envvar.codepath}Program blocks/VAR/DOVARS.scl`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    FUNCTION "AIVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyAIVARS}
    END_FUNCTION
  `;
  fs.writeFileSync(`${envvar.codepath}Program blocks/VAR/AIVARS.scl`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  filecontent = `
    FUNCTION "AOVARS" : Void
    { S7_Optimized_Access := 'TRUE' }
    VERSION : 0.1
    BEGIN
      ${bodyAOVARS}
    END_FUNCTION
  `;
  fs.writeFileSync(`${envvar.codepath}Program blocks/VAR/AOVARS.scl`, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');
}

function create_actrtrsdb(masterdata) {
  let bodyvar = ''; let
    bodyval = '';
  let bodyvarHMI = ''; const
    bodyvalHMI = '';
  const actprops = masterdata.acttrprops;
  for (actpropname in actprops) {
    // check CYRYLYC
    const actprop = actprops[actpropname];
    const acttrtype = masterdata.acttrtypes[actprop.type];
    const rforeign = /[^\u0000-\u007f]/;
    if (rforeign.test(actpropname)) {
      console.log(`Кирилиця в імені виконавчого механізма ${actpropname}`);
      break;
    } else {
      bodyvar += `${actpropname} { S7_SetPoint := 'False'} : "${acttrtype.fnname}_CFG"; // ${actprop.description}
      `;
      bodyvarHMI += `${actpropname} { S7_SetPoint := 'False'} : "${acttrtype.fnname}_HMI"; // ${actprop.description}
      `;
      bodyval += `${actpropname}.ID := ${actprop.ID}; ${actpropname}.CLSID := ${acttrtype.CLSID}; ${actpropname}.T_OPNSP := ${actprop.topn};
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

  let filename = `${envvar.codepath}Program blocks/ACTTRS/ACT.db`;
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

  filename = `${envvar.codepath}Program blocks/HMI/ACTH.db`;
  fs.writeFileSync(filename, `\ufeff${filecontent.replace(/\x0A/g, '\x0D\x0A')}`, 'utf8');

  // ---------------------------- create ACTTRS.scl
  let bodyPROG = '';
  // упорядкування по типу
  const acttrsbytypes = JSON.parse(JSON.stringify(masterdata.acttrtypes));
  for (acttrname in actprops) {
    const actprop = actprops[acttrname];
    const acttype = actprop.type;
    if (!acttrsbytypes[acttype].acttrs) acttrsbytypes[acttype].acttrs = {};
    acttrsbytypes[acttype].acttrs[acttrname] = actprop;
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
              case 'DIVAR_CFG':
                bodyPROG += '#DIVAR_TMP';
                break;
              case 'AIVAR_CFG':
                bodyPROG += '#AIVAR_TMP';
                break;
              case 'DOVAR_CFG':
                bodyPROG += '#DOVAR_TMP';
                break;
              case 'AOVAR_CFG':
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
     // темпорарі змінні-болванки ---
     DIVAR_TMP.ID := 0; DOVAR_TMP.ID := 0; AIVAR_TMP.ID := 0; AOVAR_TMP.ID := 0;
     DIVAR_TMP.STA.VALB := 0; DOVAR_TMP.STA.VALB :=0; AIVAR_TMP.VAL := 0; AOVAR_TMP.VAL := 0;
     DIVAR_TMP.STA.WRN := 0; AIVAR_TMP.STA.WRN :=0; 
     DIVAR_TMP.STA.ALM:=0; AIVAR_TMP.STA.ALM:=0;   
     // -----------------------------
     ${bodyPROG}
   END_FUNCTION
 `;
  filename = `${envvar.codepath}Program blocks/ACTTRS/ACTTRS.scl`;
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
};
