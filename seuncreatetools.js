const os = require("os");
const fs = require("fs");
let path = require("path");
const xmlparser = require("xml-js"); //https://www.npmjs.com/package/xml-js
const ini = require("ini"); //https://github.com/npm/ini#readme
//const config = ini.parse (fs.readFileSync(global.inipath, 'utf-8'));
const userdir = path.normalize(os.homedir() + "/pacframeworktools");
const masterdatatools = require("./masterdatatools");

const opts = {
  logpath: "log",
  logfile: "general.log",
  resultpath: "tounitypro",
  source: "source",
};

masterdatatools.opts.logfile = opts.logfile;
//скорочені назви функцій
const logmsg = masterdatatools.logmsg;

const xmlxddheader =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const jsDDTExchangeFile = {
  DDTExchangeFile: {
    fileHeader: {
      _attributes: {
        company: "Schneider Automation",
        product: "Unity Pro XL V13.1 - 180823C",
        dateTime: "date_and_time#" + dateTimeSEUN(),
        content: "Derived Data Type source file",
        DTDVersion: "41",
      },
    },
    contentHeader: { _attributes: { name: "Project", version: "0.0.000" } },
  },
};
const jsVariablesExchangeFile = {
  VariablesExchangeFile: {
    fileHeader: {
      _attributes: {
        company: "Schneider Automation",
        product: "Unity Pro XL V13.1 - 180823C",
        dateTime: "date_and_time#" + dateTimeSEUN(),
        content: "Variable source file",
        DTDVersion: "41",
      },
    },
    contentHeader: { _attributes: { name: "Project", version: "0.0.000" } },
  },
};
const jsSTExchangeFile = {
  STExchangeFile: {
    fileHeader: {
      _attributes: {
        company: "Schneider Automation",
        product: "Unity Pro XL V13.1 - 180823C",
        dateTime: "date_and_time#" + dateTimeSEUN(),
        content: "Structured source file",
        DTDVersion: "41",
      },
    },
    contentHeader: { _attributes: { name: "Project", version: "0.0.000" } },
  },
};

//test ();

function create_all(cfgchs, cfgtags, cfgacts) {
  create_chs (cfgchs);
  create_vars(cfgtags);
  create_actrtrs (cfgacts);
}

//Створення імпортних файлів для змінних
function create_chs(cfgchs) {
  logmsg("-------------------- Створюю змінні та сеції CHS");
  let jsprog = createiochsprogram(cfgchs, "SR", "MAST");
  return
  let jsdataBlock = {};
  addvars_to_dataBlock(cfgtags, jsdataBlock);
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  addvar_to_dataBlock("DIH", "DIH", jsdataBlock);
  addvar_to_dataBlock("DOH", "DOH", jsdataBlock);
  addvar_to_dataBlock("AIH", "AIH", jsdataBlock);
  addvar_to_dataBlock("AOH", "AOH", jsdataBlock);
  addvar_to_dataBlock("VARBUF", "VARBUF", jsdataBlock);

  let jsDDTSource = [];
  jsDDTSource.push(createDDTSource("VARS", cfgtags, "VAR_CFG"));
  jsDDTSource.push(createDDTSource("DIH", cfgtags, "DIVAR_HMI"));
  jsDDTSource.push(createDDTSource("DOH", cfgtags, "DOVAR_HMI"));
  jsDDTSource.push(createDDTSource("AIH", cfgtags, "AIVAR_HMI"));
  jsDDTSource.push(createDDTSource("AOH", cfgtags, "AOVAR_HMI"));
  jsSTExchangeFile.STExchangeFile.DDTSource = jsDDTSource;

  //файли імпорту для змінних
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname]; //jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    let xmlcontent =
      xmlxddheader +
      xmlparser.js2xml(jsSTExchangeFile, {
        compact: true,
        ignoreComment: true,
        spaces: 4,
        fullTagEmptyElement: true,
      });
    let filename =
      userdir +
      "\\" +
      opts.resultpath +
      "\\" +
      jsprog[progname].identProgram._attributes.name +
      ".xst";
    if (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync(path.dirname(filename));
    }
    //console.log (filename);
    fs.writeFileSync(filename, xmlcontent);
    logmsg(` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg(` Файл вміщує також усі змінні та типи VARS.`);
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }

  //файли імпорту для ініціалізації
  jsprog = createinitvarsprogram(cfgtags, "SR", "MAST");
  jsSTExchangeFile.STExchangeFile.program = jsprog;
  let xmlcontent =
    xmlxddheader +
    xmlparser.js2xml(jsSTExchangeFile, {
      compact: true,
      ignoreComment: true,
      spaces: 4,
      fullTagEmptyElement: true,
    });
  let filename = userdir + "\\" + opts.resultpath + "\\initvars.xst";
  fs.writeFileSync(filename, xmlcontent);
  logmsg(` Файл імпорту ${filename} створено.`);

  //файли імпорту для операторських екранів
  logmsg(` Створюю файли імпорту для операторських екранів`);
  create_operscrvars(cfgtags);
}

//Створення імпортних файлів для змінних
function create_vars(cfgtags) {
  //cfgtags = JSON.parse(fs.readFileSync ('C:/Users/san/pacframeworktools/result/cfg_tags.json'));
  logmsg("-------------------- Створюю змінні та секції VARS");
  let jsprog = createiovarsprogram(cfgtags, "SR", "MAST");
  let jsdataBlock = {};
  addvars_to_dataBlock(cfgtags, jsdataBlock);
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  addvar_to_dataBlock("DIH", "DIH", jsdataBlock);
  addvar_to_dataBlock("DOH", "DOH", jsdataBlock);
  addvar_to_dataBlock("AIH", "AIH", jsdataBlock);
  addvar_to_dataBlock("AOH", "AOH", jsdataBlock);
  addvar_to_dataBlock("VARBUF", "VARBUF", jsdataBlock);

  let jsDDTSource = [];
  jsDDTSource.push(createDDTSource("VARS", cfgtags, "VAR_CFG"));
  jsDDTSource.push(createDDTSource("DIH", cfgtags, "DIVAR_HMI"));
  jsDDTSource.push(createDDTSource("DOH", cfgtags, "DOVAR_HMI"));
  jsDDTSource.push(createDDTSource("AIH", cfgtags, "AIVAR_HMI"));
  jsDDTSource.push(createDDTSource("AOH", cfgtags, "AOVAR_HMI"));
  jsSTExchangeFile.STExchangeFile.DDTSource = jsDDTSource;

  //файли імпорту для змінних
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname]; //jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    let xmlcontent =
      xmlxddheader +
      xmlparser.js2xml(jsSTExchangeFile, {
        compact: true,
        ignoreComment: true,
        spaces: 4,
        fullTagEmptyElement: true,
      });
    let filename =
      userdir +
      "\\" +
      opts.resultpath +
      "\\" +
      jsprog[progname].identProgram._attributes.name +
      ".xst";
    if (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync(path.dirname(filename));
    }
    //console.log (filename);
    fs.writeFileSync(filename, xmlcontent);
    logmsg(` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg(` Файл вміщує також усі змінні та типи VARS.`);
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }

  //файли імпорту для ініціалізації
  jsprog = createinitvarsprogram(cfgtags, "SR", "MAST");
  jsSTExchangeFile.STExchangeFile.program = jsprog;
  let xmlcontent =
    xmlxddheader +
    xmlparser.js2xml(jsSTExchangeFile, {
      compact: true,
      ignoreComment: true,
      spaces: 4,
      fullTagEmptyElement: true,
    });
  let filename = userdir + "\\" + opts.resultpath + "\\initvars.xst";
  fs.writeFileSync(filename, xmlcontent);
  logmsg(` Файл імпорту ${filename} створено.`);

  //файли імпорту для операторських екранів
  logmsg(` Створюю файли імпорту для операторських екранів`);
  create_operscrvars(cfgtags);
}

//Створення імпортних файлів для ВМ
//create_actrtrs(JSON.parse(fs.readFileSync('C:/Users/san/pacframeworktools/result/cfg_acts.json','utf8')));
function create_actrtrs (cfgacts) {
  logmsg("-------------------- Створюю змінні та секції ACTRS");
  let jsprog = createactrssprogram(cfgacts, "SR", "MAST");
  let jsdataBlock = {};
  addacts_to_dataBlock(cfgacts, jsdataBlock);//змінна ACT типу ACT з інціалізацією параметрів
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  addvar_to_dataBlock("ACTH", "ACTH", jsdataBlock);
  addvar_to_dataBlock("ACTBUF", "ACTTR_CFG", jsdataBlock);
  addvar_to_dataBlock("DIVAR_TMP", "DIVAR_CFG", jsdataBlock);
  addvar_to_dataBlock("AIVAR_TMP", "AIVAR_CFG", jsdataBlock);
  addvar_to_dataBlock("DOVAR_TMP", "DOVAR_CFG", jsdataBlock);
  addvar_to_dataBlock("AOVAR_TMP", "AOVAR_CFG", jsdataBlock);

  let jsDDTSource = [];
  jsDDTSource.push(createDDTSource("ACT", cfgacts, "ACT_CFG"));
  jsDDTSource.push(createDDTSource("ACTH", cfgacts, "ACT_HMI"));
  jsSTExchangeFile.STExchangeFile.DDTSource = jsDDTSource;

  //файли імпорту для ВМ
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname]; //jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    let xmlcontent =
      xmlxddheader +
      xmlparser.js2xml(jsSTExchangeFile, {
        compact: true,
        ignoreComment: true,
        spaces: 4,
        fullTagEmptyElement: true,
      });
    let filename =
      userdir +
      "\\" +
      opts.resultpath +
      "\\" +
      jsprog[progname].identProgram._attributes.name +
      ".xst";
    if (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync(path.dirname(filename));
    }
    //console.log (filename);
    fs.writeFileSync(filename, xmlcontent);
    logmsg(` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg(` Файл вміщує також усі змінні та типи ACTS.`);
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }

  //файли імпорту для операторських екранів
  logmsg(` Створюю файли імпорту для операторських екранів`);
  create_operscracts(cfgacts);
}


function dateTimeSEUN() {
  let now = new Date();
  let dateTime = `${now.getFullYear()}-${
    now.getMonth().toString() + 1
  }-${now.getDate()}-${now.toLocaleTimeString()}`; //'dt#2022-01-16-20:47:30'
  return dateTime;
}

//добавляє DDTcontent в опис структурного типу
function createDDTSource(DDTName, DDTcontent, PACFWtype = "VAR_CFG", version = "0.01") {
  let jsDDTsource = {
    _attributes: {
      DDTName: DDTName,
      version: version,
      dateTime: "dt#" + dateTimeSEUN(),
    },
    structure: { variables: [] },
  };
  //варіант з конфіг тегами 
  if (PACFWtype === "VAR_CFG" && DDTcontent.tags) {
    const tags = DDTcontent.tags;
    for (let tagname in tags) {
      let tag = tags[tagname];
      tag.props.TAGNAME;
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log("Кирилиця в імені " + tag.props.TAGNAME);
        break;
      } else {
        //{ _attributes: { name: 'STA', typeName: 'INT'}, comment: { _text: 'статус' }}
        jsDDTsource.structure.variables.push({
          _attributes: {
            name: tag.props.TAGNAME,
            typeName: tag.props.TYPE + "VAR_CFG",
          },
          comment: { _text: tag.props.DESCRIPTION },
        });
      }
    }
  }
  //варіант з конфіг ACT 
  if (PACFWtype === "ACT_CFG" && DDTcontent.acttrs) {
    const acttrs = DDTcontent.acttrs;
    for (let actname in acttrs) {
      let act = acttrs[actname];
      const acttrtype = DDTcontent.types[act.type];
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(act.name)) {
        console.log("Кирилиця в імені " + act.name);
        break;
      } else {
        jsDDTsource.structure.variables.push({
          _attributes: {
            name: act.name,
            typeName: `${acttrtype.fnname}_CFG`,
          },
          comment: { _text: `${act.description || " "}` },
        });
      }
    }
  }

  //варіант з тегами HMI
  if (PACFWtype.search("VAR_HMI") >= 0 && DDTcontent.tags) {
    const tags = DDTcontent.tags;
    for (let tagname in tags) {
      let tag = tags[tagname];
      tag.props.TAGNAME;
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log("Кирилиця в імені " + tag.props.TAGNAME);
        break;
      } else {
        let pushenbl = false;
        let typeName = PACFWtype;
        //перевірка чи конкретний тип, чи загальні
        switch (PACFWtype) {
          case "DIVAR_HMI":
            pushenbl = tag.props.TYPE === "DI";
            break;
          case "DOVAR_HMI":
            pushenbl = tag.props.TYPE === "DO";
            break;
          case "AIVAR_HMI":
            pushenbl = tag.props.TYPE === "AI";
            break;
          case "AOVAR_HMI":
            pushenbl = tag.props.TYPE === "AO";
            break;
          default:
            pushenbl = true;
            typeName = tag.props.TYPE + "VAR_HMI";
            break;
        }
        if (pushenbl) {
          jsDDTsource.structure.variables.push({
            _attributes: { name: tag.props.TAGNAME, typeName: typeName },
            comment: { _text: tag.props.DESCRIPTION },
          });
        }
      }
    }
  }
  //варіант з ACT HMI
  if (PACFWtype.search("ACT_HMI") >= 0 && DDTcontent.acttrs) {
    const acttrs = DDTcontent.acttrs;
    for (let actname in acttrs) {
      let act = acttrs[actname];
      const acttrtype = DDTcontent.types[act.type];
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(act.name)) {
        console.log("Кирилиця в імені " + act.name);
        break;
      } else {
        jsDDTsource.structure.variables.push({
          _attributes: {
            name: act.name,
            typeName: `${acttrtype.fnname}_HMI`,
          },
          comment: { _text: `${act.description || " "}` },
        });
      }
    }
  }
  return jsDDTsource;
}

//добавляє змінні в dataBlock з означенням значень елементів за замовченням
function addvars_to_dataBlock(cfgtags, jsdataBlock) {
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  //усі змінні
  let jsvariables = jsdataBlock.variables;
  if (cfgtags.tags) {
    //значення структурної змінної VARS
    let jsVARS = {
      _attributes: { name: "VARS", typeName: "VARS" },
      instanceElementDesc: [],
    };
    /*{
    _attributes: { name: 'VARS', typeName: 'VARS' },
    instanceElementDesc: [
      { _attributes: [Object], instanceElementDesc: [Array] },
      { _attributes: [Object], instanceElementDesc: [Array] }]
    }*/
    const tags = cfgtags.tags;
    for (let tagname in tags) {
      let tag = tags[tagname];
      tag.props.TAGNAME;
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log("Кирилиця в імені " + tag.props.TAGNAME);
        break;
      } else {
        /*  _attributes: { name: 'VNabor_T1_OPN' },
            instanceElementDesc: [
            { _attributes: { name: 'ID' }, value:  { _text: '1' } },
            { _attributes: { name: 'CLSID' }, value: { _text: '2' } }
        ]*/
        let jsVAR = {
          _attributes: { name: tag.props.TAGNAME },
          instanceElementDesc: [],
        };
        let chid =
          tag.props.TAGNAME.substr(0, 3).toLowerCase() === "rez"
            ? 0
            : tag.props.CHID;
        //добавлення змінюваних властивостей
        jsVAR.instanceElementDesc.push({
          _attributes: { name: "ID" },
          value: { _text: tag.props.ID.toString() },
        });
        jsVAR.instanceElementDesc.push({
          _attributes: { name: "CHID" },
          value: { _text: chid.toString() },
        });
        jsVAR.instanceElementDesc.push({
          _attributes: { name: "CHIDDF" },
          value: { _text: chid.toString() },
        });
        //добавляємо машстабування, якщо воно вказане
        if (
          (tag.props.TYPE === "AI" || tag.props.TYPE === "AO") &&
          tag.props.SCALE
        ) {
          let scalear = tag.props.SCALE.replace(/[()]/g, "").split("..");
          if (scalear.length === 2) {
            let min = parseFloat(scalear[0]).toFixed(3);
            let max = parseFloat(scalear[1]).toFixed(3);
            jsVAR.instanceElementDesc.push({
              _attributes: { name: "LOENG" },
              value: { _text: min.toString() },
            });
            jsVAR.instanceElementDesc.push({
              _attributes: { name: "HIENG" },
              value: { _text: max.toString() },
            });
          }
        }
        //добавлення тегу до тегів
        jsVARS.instanceElementDesc.push(jsVAR);
      }
    }
    //додавння структурної змінної тегів до змінних dataBlock
    jsvariables.push(jsVARS);
  }
  /*
	<dataBlock>
		<variables name="VARS" typeName="VARSold">
			<instanceElementDesc name="VNabor_T1_OPN">
				<instanceElementDesc name="ID">
					<value>1</value>
				</instanceElementDesc>
				<instanceElementDesc name="CLSID">
					<value>2</value>
				</instanceElementDesc>
			</instanceElementDesc>
			<instanceElementDesc name="VNabor_T2_OPN">
				<instanceElementDesc name="ID">
					<value>3</value>
				</instanceElementDesc>
				<instanceElementDesc name="CLSID">
					<value>4</value>
				</instanceElementDesc>
			</instanceElementDesc>
		</variables>
	</dataBlock>
  */
}
//добавляє ВМ в dataBlock з означенням значень елементів за замовченням
function addacts_to_dataBlock(cfgacts, jsdataBlock) {
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  //усі змінні
  let jsvariables = jsdataBlock.variables;
  if (cfgacts.acttrs) {
    //значення структурної змінної ACT
    let jsVARS = {
      _attributes: { name: "ACT", typeName: "ACT" },
      instanceElementDesc: [],
    };
    const acttrs = cfgacts.acttrs;
    for (let actname in acttrs) {
      let act = acttrs[actname];
      const acttrtype = cfgacts.types[act.type];
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(act.name)) {
        console.log("Кирилиця в імені " + act.name);
        break;
      } else {
        let jsVAR = {
          _attributes: { name: act.name },
          instanceElementDesc: [],
        };
        //добавлення змінюваних властивостей
        jsVAR.instanceElementDesc.push({
          _attributes: { name: "ID" },
          value: { _text: act.id.toString() },
        });
        jsVAR.instanceElementDesc.push({
          _attributes: { name: "CLSID" },
          value: { _text: acttrtype.clsid.toString() },
        });
        if (act.topn && act.topn>0) {
          jsVAR.instanceElementDesc.push({
            _attributes: { name: "T_OPNSP" },
            value: { _text: act.topn.toString() },
          });
        }
        //добавлення тегу до тегів
        jsVARS.instanceElementDesc.push(jsVAR);
      }
    };    
    //додавння структурної змінної тегів до змінних dataBlock
    jsvariables.push(jsVARS);
  }

}
//добавляє змінну заданого типу в dataBlock без означення значень елементів за замовченням
function addvar_to_dataBlock(varname, vartype, jsdataBlock) {
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  jsdataBlock.variables.push({
    _attributes: { name: varname, typeName: vartype },
  });
}


//ствобрює секції обробки каналів
function createiochsprogram(cfgchs, secttype = "SR", task = "MAST") {
  //-------------- CHS
  let bodyDICHS = `FOR i := 1 TO PLC.DICNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHDI[i].ID := INT_TO_UINT(i);
      IF CHDI[i].CLSID = 0 THEN CHDI[i].CLSID := 16#0010;END_IF;
  END_IF;
END_FOR;\n`;
  let bodyDOCHS = `FOR i := 1 TO PLC.DOCNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHDO[i].ID := INT_TO_UINT(i);
      IF CHDO[i].CLSID = 0 THEN CHDO[i].CLSID := 16#0020;END_IF;
  END_IF;
END_FOR;\n`;
  let bodyAICHS = `FOR i := 1 TO PLC.AICNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHAI[i].ID := INT_TO_UINT(i);
      IF CHAI[i].CLSID = 0 THEN CHAI[i].CLSID := 16#0030;END_IF;
  END_IF;
END_FOR;\n`;
  let bodyAOCHS = `FOR i := 1 TO PLC.AOCNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHAO[i].ID := INT_TO_UINT(i);
      IF CHAO[i].CLSID = 0 THEN CHAO[i].CLSID := 16#0040;END_IF;
  END_IF;
END_FOR;\n`;
  let jsdichsprog = {identProgram: {_attributes: { name: "dichs", type: secttype, task: task }},STSource: {}};
  let jsdochsprog = {identProgram: {_attributes: { name: "dochs", type: secttype, task: task }},STSource: {}};
  let jsaichsprog = {identProgram: {_attributes: { name: "aichs", type: secttype, task: task }},STSource: {}};
  let jsaochsprog = {identProgram: {_attributes: { name: "aochs", type: secttype, task: task }},STSource: {}};
  let chs = cfgchs.chs;
  for (let chnmb in chs.chdis) {
    let ch = chs.chdis[chnmb];
    bodyDICHS +=`CHDIFN (RAW := ${ch.adr},  CHCFG := CHDI[${chnmb}],  CHHMI := CHDI_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (let chnmb in chs.chdos) {
    let ch = chs.chdos[chnmb];
    bodyDOCHS +=`CHDOFN (RAW := ${ch.adr},  CHCFG := CHDO[${chnmb}],  CHHMI := CHDO_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (let chnmb in chs.chais) {
    let ch = chs.chais[chnmb];
    bodyAICHS +=`CHAIFN (RAW := ${ch.adr},  CHCFG := CHAI[${chnmb}],  CHHMI := CHAI_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (let chnmb in chs.chaos) {
    let ch = chs.chaos[chnmb];
    bodyAOCHS +=`CHDIFN (RAW := ${ch.adr},  CHCFG := CHAO[${chnmb}],  CHHMI := CHAO_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  
  const progdescr =
    "(* Ця секція згенерована автоматично PACFramework Tools " +
    new Date().toLocaleString() +
    "*)\n";
  jsdichsprog.STSource = progdescr + bodyDICHS;
  jsdochsprog.STSource = progdescr + bodyDOCHS;
  jsaichsprog.STSource = progdescr + bodyAICHS;
  jsaochsprog.STSource = progdescr + bodyAOCHS;
  
  //-------------- PLC MAPS
  let jsmapsprog = {identProgram: {_attributes: { name: "plcmaps", type: secttype, task: task }},STSource: {}};
  let dicnt = chs.statistic.dicnt;
  let docnt = chs.statistic.docnt;
  let aicnt = chs.statistic.aicnt;
  let aocnt = chs.statistic.aocnt;
  let modulscnt = chs.statistic.modulscnt; 
  let bodyPLCMAPS = `(*кількість каналів та модулів*)
  PLC.DICNT := ${dicnt};\n  PLC.DOCNT := ${docnt};\n  PLC.AICNT := ${aicnt};\n  PLC.AOCNT := ${aocnt};\n  PLC.MODULSCNT := ${modulscnt};
  (*завантажити в буфер підмодуль 0 модуля 0*)\n  MODULES[0].STA.11 := true;\n\n(*типи 1- DICH, 2- DOCH, 3- AICH, 4 – AOCH, 5 - COM*)\n`;
  let modules = cfgchs.iomapplc.plcform;
  for (let i=0; i<modulscnt; i++) {
    let module = modules[i];
    bodyPLCMAPS += ``
  } 
  jsmapsprog.STSource = progdescr + bodyPLCMAPS;
  return
  return {jsdichsprog, jsdochsprog, jsaichsprog, jsaochsprog, jsmapsprog};
}
//ствобрює секції обробки змінних
function createiovarsprogram(cfgtags, secttype = "SR", task = "MAST") {
  let bodyDIVARS = "",
    bodyDOVARS = "",
    bodyAIVARS = "",
    bodyAOVARS = "";
  let jsdivarsprog = {
    identProgram: {
      _attributes: { name: "divars", type: secttype, task: task },
    },
    STSource: {},
  };
  let jsdovarsprog = {
    identProgram: {
      _attributes: { name: "dovars", type: secttype, task: task },
    },
    STSource: {},
  };
  let jsaivarsprog = {
    identProgram: {
      _attributes: { name: "aivars", type: secttype, task: task },
    },
    STSource: {},
  };
  let jsaovarsprog = {
    identProgram: {
      _attributes: { name: "aovars", type: secttype, task: task },
    },
    STSource: {},
  };

  const tags = [];
  for (let tagname in cfgtags.tags) {
    tags.push(cfgtags.tags[tagname]);
  }
  tags.sort(function (a, b) {
    return a.props.ID - b.props.ID;
  });
  for (tag of tags) {
    switch (tag.props.TYPE) {
      case "DI":
        bodyDIVARS += `DIVARFN(CHCFG := CHDI[VARS.${tag.props.TAGNAME}.CHID], DIVARCFG := VARS.${tag.props.TAGNAME}, DIVARHMI := DIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI); (*${tag.props.DESCRIPTION}*) \n`;
        //`DIVARFN (CHCFG := CHDI[VARS.VNabor_T1_OPN.CHID],  DIVARCFG := VARS.VNabor_T1_OPN,  DIVARHMI := VAR_HMI.VNabor_T1_OPN,  VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI);`
        break;
      case "DO":
        bodyDOVARS += `DOVARFN(CHCFG := CHDO[VARS.${tag.props.TAGNAME}.CHID], DOVARCFG := VARS.${tag.props.TAGNAME}, DOVARHMI := DOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDO := CHDO); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      case "AI":
        bodyAIVARS += `AIVARFN(CHCFG := CHAI[VARS.${tag.props.TAGNAME}.CHID], AIVARCFG := VARS.${tag.props.TAGNAME}, AIVARHMI := AIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAI := CHAI); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      case "AO":
        bodyAOVARS += `AOVARFN(CHCFG := CHAO[VARS.${tag.props.TAGNAME}.CHID], AOVARCFG := VARS.${tag.props.TAGNAME}, AOVARHMI := AOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAO := CHAO); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      default:
        break;
    }
  }

  const progdescr =
    "(* Ця секція згенерована автоматично PACFramework Tools " +
    new Date().toLocaleString() +
    "*)\n";
  jsdivarsprog.STSource = progdescr + bodyDIVARS;
  jsdovarsprog.STSource = progdescr + bodyDOVARS;
  jsaivarsprog.STSource = progdescr + bodyAIVARS;
  jsaovarsprog.STSource = progdescr + bodyAOVARS;

  return { jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog };
  /*
  	<identProgram name="INPUTS" type="SR" task="MAST"></identProgram>
		<STSource>FOR i := 1 TO PLC.DICNT DO
  */
}
//ствобрює секцію ініціалізації
function createinitvarsprogram(cfgtags, secttype = "SR", task = "MAST") {
  let jsprog = {
    identProgram: {
      _attributes: { name: "initvars", type: secttype, task: task },
    },
    STSource: {},
  };
  let bodyprog = "";

  const tags = [];
  for (let tagname in cfgtags.tags) {
    tags.push(cfgtags.tags[tagname]);
  }
  tags.sort(function (a, b) {
    return a.props.ID - b.props.ID;
  });
  for (tag of tags) {
    let tagname = tag.props.TAGNAME;
    let chid =
      tag.props.TAGNAME.substr(0, 3).toLowerCase() === "rez"
        ? 0
        : tag.props.CHID;
    let id = tag.props.ID.toString();
    jsprog.STSource += `VARS.${tagname}.ID:=${id}; VARS.${tagname}.CHID:=${chid}; VARS.${tagname}.CHIDDF:=${chid};\n`;
    //VARS.VNabor_T1_OPN.ID:=10001;  VARS.VNabor_T1_OPN.CHID:=1;   VARS.VNabor_T1_OPN.CHIDDF:=1;
  }
  const progdescr =
    "(* Ця секція згенерована автоматично PACFramework Tools " +
    new Date().toLocaleString() +
    "*)\n";
  jsprog.STSource = progdescr + bodyprog;
  return jsprog;
}
//ствобрює секцію обробки ВМ
function createactrssprogram(cfgacts, secttype = "SR", task = "MAST") {
  let jsprog = {identProgram: {_attributes: { name: "actrs", type: secttype, task: task }},STSource: {}};
  let jsresolution = {identProgram: {_attributes: { name: "resolution", type: secttype, task: task }},STSource: {}};

  let bodyPROG = `DIVAR_TMP.ID:=0; DIVAR_TMP.CLSID:=0;\nDOVAR_TMP.ID:=0; DOVAR_TMP.CLSID:=0;\nAIVAR_TMP.ID:=0; AIVAR_TMP.CLSID:=0;\nAOVAR_TMP.ID:=0; AOVAR_TMP.CLSID:=0;\n`;
  bodyresPROG = '(* Якщо не відправляється команда TRUE, ВМ не виконує жодної команди керування*)\n';
  const acts = cfgacts.acttrs;
  //упорядкування по типу
  //стоврення нового обєкту, прототипу з типів
  let acttrsbytypes = JSON.parse (JSON.stringify(cfgacts.types));
  for (acttrname in acts) {
    const act = acts[acttrname];
    const acttype = act.type;
    if (!acttrsbytypes[acttype].acttrs) acttrsbytypes[acttype].acttrs = {};
    acttrsbytypes[acttype].acttrs[acttrname] = act;
  }
  for (acttrtypename in acttrsbytypes) {
    acttrtype = acttrsbytypes[acttrtypename];
    bodyPROG += `(* ----------- Виконавчі механізми ${acttrtypename} - ${acttrtype.typedescr} ----------------- *)\n`;
    //перебір виконавчих механізмів відповідно до типу
    for (actrname in acttrtype.acttrs) {
      const acttr = acttrtype.acttrs[actrname];      
      const io = acttr.io;
      //якщо є нелінковані теги нписати про це
      if (io.unlinked && io.unlinked.length>0) {
        bodyPROG += `//неліноковані теги: ${JSON.stringify(io.unlinked)} \n     `;
      }
      bodyPROG += `${acttrtype.fnname}FN(ACTCFG:=ACT.${actrname}, ACTHMI:=ACTH.${actrname}`;
      bodyresPROG += `ACT.${actrname}.CMD.CMD_RESOLUTION:=TRUE;\n`;   
      //перебор по інтерфейсу
      for (ioname in io) {
        if (ioname !== 'unlinked') {
          const ionameinfn = ioname.split ('/')[0]; //назва в функції завжди ліва назва з альтернативних варіантів суфіксів
          const ioval = io[ioname];
          bodyPROG += `, ${ionameinfn}:=`
          if (ioval.length>0) { //для привязаного IO
            bodyPROG += `VARS.${ioval}`
          } else { //для непривязаного IO ставимо пустишки
            let vartype = acttrtype.io[ioname].type;
            //console.log (`${ionameinfn} -> ${vartype}`);
            switch (vartype) {
              case 'DI': 
                bodyPROG += 'DIVAR_TMP'; 
                break
              case 'AI':
                bodyPROG += 'AIVAR_TMP'; 
                break
              case 'DO':
                bodyPROG += 'DOVAR_TMP'; 
                break
              case 'AO':
                bodyPROG += 'AOVAR_TMP';  
                break 
            }
          } 
        }
      }
      bodyPROG += `, PLCCFG := PLC, ACTBUF := ACTBUF ); (* ${ (acttr.description) ? acttr.description : ""} *) \n`;      
    }

  }

  const progdescr =
    "(* Ця секція згенерована автоматично PACFramework Tools " +
    new Date().toLocaleString() +
    "*)\n";
  jsprog.STSource = progdescr + bodyPROG;
  jsresolution.STSource = progdescr + bodyresPROG;
  return {jsprog, jsresolution};
}
//створює операторські екрани для змінних
function create_operscrvars(cfgtags) {
  let replacers = { DI: [], DO: [], AI: [], AO: [] };
  for (tagname in cfgtags.tags) {
    let tag = cfgtags.tags[tagname];
    if (tag.props.TYPE) {
      replacers[tag.props.TYPE].push({ main: tagname });
    }
  }
  operatorscreen_dupreplace("divar.xcr", "DIH", replacers.DI, "DIVARS");
  operatorscreen_dupreplace("dovar.xcr", "DOH", replacers.DO, "DOVARS");
  operatorscreen_dupreplace("aivar.xcr", "AIH", replacers.AI, "AIVARS");
  operatorscreen_dupreplace("aovar.xcr", "AOH", replacers.AO, "AOVARS");
}
//створює операторські екрани для ВМ
function create_operscracts(cfgacts) {
  let replacers = {};
  const types = cfgacts.types;
  for (actname in cfgacts.acttrs) {
    let act = cfgacts.acttrs[actname];
    let type = types[act.type].fnname;
    if (type) {
      if (typeof (replacers[type]) === 'undefined') {
        replacers[type] = []; 
      } 
      replacers[type].push({ main: actname });
    }
  }
  for (typename in replacers) {
    const tmpltname = typename.toLowerCase() + '.xcr'; //наприклад "vlvd.xcr"
    const filename = typename; //наприклад "VLVD"
    operatorscreen_dupreplace(tmpltname, "ACTH", replacers[typename], filename);
  }   
}

function operatorscreen_dupreplace(filename, prefixin = "DIH", replacer, newscreenname, elmsperpage = 32) {
  //elmsperpage - поділ на сторінки, to do
  let fullfilename = userdir + "\\" + opts.source + "\\" + filename;
  let xmlorig;
  try {
    xmlorig = fs.readFileSync(fullfilename, "utf8");
  } catch (error) {
    logmsg(
      `WRN: Не вдалося завантажити файл ${fullfilename}, перевірте наявність файлу`
    );
    return;
  }
  //<screen name="PACFramework_DIVAR"
  let oldscreenname = xmlorig.split('<screen name="')[1].split('"')[0];
  xmlorig = xmlorig.replace(
    '<screen name="' + oldscreenname,
    '<screen name="' + newscreenname
  );
  //console.log (oldscreenname);
  let xmlar = xmlorig
    .replace(/<object/g, "!!!!!!!!!!<object")
    .replace(/<\/screen>/g, "!!!!!!!!!!</screen>")
    .split("!!!!!!!!!!");
  //пошук prefix

  prefix = 'name="' + prefixin + ".";
  let group,
    isgroup = false,
    i = 0;
  let found = false;
  for (j = 0; j < xmlar.length; j++) {
    txtline = xmlar[j];
    let pos = txtline.search('<object objectID="2"');
    if (pos >= 0) {
      i = 0;
      isgroup = true;
      xmlline = xmlparser.xml2js(txtline, { compact: true });
      let ob = xmlline.object._attributes.description;
      let cord = ob.replace("(", "").split("),")[0].split(",");
      group = {
        txtelm: [],
        props: {
          start: j,
          content: txtline,
          mainoldlink: "",
          y1: parseInt(cord[0]),
          x1: parseInt(cord[1]),
          y2: parseInt(cord[2]),
          x2: parseInt(cord[3]),
          cnt: parseInt(ob.replace("(", "").split("),")[1]),
        },
      };
    } else if (isgroup === true) {
      //ми поки в групі
      group.txtelm.push(txtline);
      i++;
      if (i >= group.props.cnt) {
        //останній елемент в групі
        isgroup = false;
        group.props.end = j;
        if (found === true) {
          //шукана група
          break; //завершуємо пошук
        }
      }
      //console.log (xmlparser.xml2js(txtline, {compact: true}))
    }
    pos = txtline.search(prefix);
    if (isgroup && pos >= 0) {
      group.props.mainoldlink = txtline.split(prefix)[1].split(".")[0];
      found = true;
    }
  }
  //обробка знайденого
  if (found === true) {
    let i = group.props.end + 1; //починаємо вставку з останнього елементу
    let newlink = "";
    for (let j = 1; j < replacer.length; j++) {
      let y1 = group.props.y2 + 1;
      let deltay = group.props.y2 - group.props.y1;
      let txtelm = "";
      newlink = replacer[j].main;
      //створення нової копії
      txtelm = screenelm_replace(
        group.props.content,
        0,
        deltay,
        group.props.mainoldlink,
        newlink
      );
      xmlar.splice(i, 0, txtelm); //вставляємо позначення групи
      i++;
      for (let k = 0; k < group.props.cnt; k++) {
        txtelm = screenelm_replace(
          group.txtelm[k],
          0,
          deltay * j,
          group.props.mainoldlink,
          newlink
        );
        //кординати, зміст
        xmlar.splice(i, 0, txtelm); //вставляємо в i-ту позицію k-й елемент групи, видаляємо 0 елементів
        i++;
      }
    }
    //заміна властивостей існуючого елементу
    newlink = replacer[0].main;
    txtelm = screenelm_replace(
      group.props.content,
      0,
      0,
      group.props.mainoldlink,
      newlink
    );
    xmlar[group.props.start] = txtelm;
    for (let k = 0; k < group.props.cnt; k++) {
      txtelm = screenelm_replace(
        group.txtelm[k],
        0,
        0,
        group.props.mainoldlink,
        newlink
      );
      xmlar[group.props.start + k + 1] = txtelm;
    }
    //console.log (group);
    let xmlout = xmlar.join("");
    //console.log (xmlout);
    let outfilename = userdir + "\\" + opts.resultpath + "\\" + filename;
    fs.writeFileSync(outfilename, xmlout);
    logmsg(`Файл імпорту операторських екранів ${outfilename} створено`);
  } else {
    logmsg (`WRN: Не вдалося знайти в шаблоні операторських екранів ${filename} прив'язки з вказаним перфіксом "${prefixin}", перевірте файл шаблону`)
  }

  //
  //console.log (jscontent.SCRExchangeFile.IOScreen.screen.object);
  //console.log (xmlar.length);
}

function screenelm_replace(elem, dtx = 0, dty = 0, oldlink, newlink) {
  elem = elem.replace(oldlink, newlink);
  let part1 = elem.split('description="(')[0] + 'description="(';
  let part2 = elem.split('description="(')[1].split("),")[0];
  let part3 = elem.split(part2)[1];
  let arcord = part2.split(",");
  arcord[0] = parseInt(arcord[0]) + dty;
  arcord[2] = parseInt(arcord[2]) + dty;
  arcord[1] = parseInt(arcord[1]) + dtx;
  arcord[3] = parseInt(arcord[3]) + dtx;
  let newtxt = part1 + arcord.join() + part3;
  //console.log (newtxt);
  return newtxt;
}

module.exports = {
  create_all, create_chs, create_vars, create_actrtrs
};
