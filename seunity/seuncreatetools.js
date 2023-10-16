const os = require('os');
const fs = require('fs');
const path = require('path');
const xmlparser = require('xml-js'); // https://www.npmjs.com/package/xml-js
// https://github.com/npm/ini#readme
const userdir = path.normalize(`${os.homedir()}/pacframeworktools`);
const masterdatatools = require('../common/masterdatatools');

const opts = {
  logpath: 'log',
  logfile: 'general.log',
  resultpath: 'tounitypro',
  source: 'source',
};
let memmap; // рошарена змінна для збереження мепінгу усіх змінних на адреси, заповнюється при виклику оновлення тегів

masterdatatools.opts.logfile = opts.logfile;
// скорочені назви функцій
const { logmsg } = masterdatatools;

const xmlxddheader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const jsSTExchangeFile = {
  STExchangeFile: {
    fileHeader: {
      _attributes: {
        company: 'Schneider Automation',
        product: 'Unity Pro XL V13.1 - 180823C',
        dateTime: `date_and_time#${dateTimeSEUN()}`,
        content: 'Structured source file',
        DTDVersion: '41',
      },
    },
    contentHeader: { _attributes: { name: 'Project', version: '0.0.000' } },
  },
};

let jsSTExchangeFileAll; // загальний файл для обміну
// загальний файл імпорту - ініціалізація
jsSTExchangeFileAll = JSON.parse(JSON.stringify(jsSTExchangeFile));
jsSTExchangeFileAll.STExchangeFile.dataBlock = { variables: [] };
jsSTExchangeFileAll.STExchangeFile.program = [];
jsSTExchangeFileAll.STExchangeFile.DDTSource = [];
jsSTExchangeFileAll.STExchangeFile.program.push(JSON.parse(JSON.stringify(createmainprogram('section', 'MAST'))));

// test ();

function create_all(cfgchs, cfgtags, cfgacts) {
  memmap = cfgtags.memmap;
  create_chs(cfgchs);
  create_vars(cfgtags);
  create_actrtrs(cfgacts);

  // загальний файл імпорту: запис
  const xmlcontent = xmlxddheader + xmlparser.js2xml(jsSTExchangeFileAll, {
    compact: true,
    ignoreComment: true,
    spaces: 4,
    fullTagEmptyElement: true,
  });
  const filename = `${userdir}\\${opts.resultpath}\\` + 'mainPFW.xst';
  if (fs.existsSync(path.dirname(filename)) === false) {
    fs.mkdirSync(path.dirname(filename));
  }
  fs.writeFileSync(filename, xmlcontent);
  logmsg(` Файл імпорту ${filename} створено.`);
  if (jsSTExchangeFile.STExchangeFile.DDTSource) {
    logmsg(' Файл вміщує також усі змінні та типи VARS.');
  }
}

// Створення імпортних файлів для каналів
function create_chs(cfgchs) {
  logmsg('-------------------- Створюю змінні та сеції CHS');
  const jsprog = createiochsprogram(cfgchs, 'SR', 'MAST');
  const jsdataBlock = {};

  const stat = cfgchs.chs.statistic;
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  // кількість DI та NDI і т.п. в масиві повинна бути однакова, та співпадати з означеним в інтерфейсі
  const dicnt = stat.dicnt > stat.ndicnt ? stat.dicnt : stat.ndicnt;
  const docnt = stat.docnt > stat.ndocnt ? stat.docnt : stat.ndocnt;
  const aicnt = stat.aicnt > stat.naicnt ? stat.aicnt : stat.naicnt;
  const aocnt = stat.aocnt > stat.naocnt ? stat.aocnt : stat.naocnt;
  logmsg('ATTENTION: Масив в параметрах функціях виклику повинен бути розмірів:');
  logmsg(`DI/NDI:${dicnt} DO/NDO:${docnt} AI/NAI:${aicnt} AO/NAO:${aocnt}`);

  addvar_to_dataBlock('CHDI', `ARRAY[0..${dicnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHDI_HMI', `ARRAY[0..${dicnt}] OF CH_HMI`, jsdataBlock);
  addvar_to_dataBlock('CHDO', `ARRAY[0..${docnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHDO_HMI', `ARRAY[0..${docnt}] OF CH_HMI`, jsdataBlock);
  addvar_to_dataBlock('CHAI', `ARRAY[0..${aicnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHAI_HMI', `ARRAY[0..${aicnt}] OF CH_HMI`, jsdataBlock);
  addvar_to_dataBlock('CHAO', `ARRAY[0..${aocnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHAO_HMI', `ARRAY[0..${aocnt}] OF CH_HMI`, jsdataBlock);

  addvar_to_dataBlock('CHNDI', `ARRAY[0..${dicnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHNDI_HMI', `ARRAY[0..${dicnt}] OF CH_HMI`, jsdataBlock);
  addvar_to_dataBlock('CHNDO', `ARRAY[0..${docnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHNDO_HMI', `ARRAY[0..${docnt}] OF CH_HMI`, jsdataBlock);
  addvar_to_dataBlock('CHNAI', `ARRAY[0..${aicnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHNAI_HMI', `ARRAY[0..${aicnt}] OF CH_HMI`, jsdataBlock);
  addvar_to_dataBlock('CHNAO', `ARRAY[0..${aocnt}] OF CH_CFG`, jsdataBlock);
  addvar_to_dataBlock('CHNAO_HMI', `ARRAY[0..${aocnt}] OF CH_HMI`, jsdataBlock);

  addvar_to_dataBlock('CH_BUF', 'CH_BUF', jsdataBlock);

  // добавлення MODULES
  const modules = [];
  for (let i = 0; i < stat.modulscnt; i++) {
    modules.push({ _attributes: { name: `[${i}]` }, comment: { _text: `${cfgchs.iomapplc.plcform[i].MODID}` } });
  }
  jsdataBlock.variables.push({
    _attributes: { name: 'MODULES', typeName: `ARRAY[0..${stat.modulscnt - 1}] OF MODULE` },
    instanceElementDesc: modules,
  });
  datablockvars_map(jsdataBlock);
  // загальний файл імпорту
  for (const variable of jsdataBlock.variables) {
    jsSTExchangeFileAll.STExchangeFile.dataBlock.variables.push(JSON.parse(JSON.stringify(variable)));
  }
  for (const progname in jsprog) {
    jsSTExchangeFileAll.STExchangeFile.program.push(JSON.parse(JSON.stringify(jsprog[progname])));
  }

  // файли імпорту для каналів
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname]; // jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    const xmlcontent = xmlxddheader
      + xmlparser.js2xml(jsSTExchangeFile, {
        compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true,
      });
    const filename = `${userdir
    }\\${
      opts.resultpath
    }\\${
      jsprog[progname].identProgram._attributes.name
    }.xst`;
    if (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync(path.dirname(filename));
    }
    // console.log (filename);
    fs.writeFileSync(filename, xmlcontent);
    logmsg(` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg(' Файл вміщує також усі змінні CHS та Mapping.');
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }

  // файли імпорту для операторських екранів
  logmsg(' Створюю файли імпорту для операторських екранів');
  create_operscmaps(cfgchs);
}

// Створення імпортних файлів для змінних
function create_vars(cfgtags) {
  // cfgtags = JSON.parse(fs.readFileSync ('C:/Users/san/pacframeworktools/result/cfg_tags.json'));
  logmsg('-------------------- Створюю змінні та секції VARS');
  let jsprog = createiovarsprogram(cfgtags, 'SR', 'MAST');
  const jsdataBlock = {};
  addvars_to_dataBlock(cfgtags, jsdataBlock);
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  if (cfgtags.statistic.DI && cfgtags.statistic.DI.count || cfgtags.statistic.NDI && cfgtags.statistic.NDI.count) addvar_to_dataBlock('DIH', 'DIH', jsdataBlock);
  if (cfgtags.statistic.DO && cfgtags.statistic.DO.count || cfgtags.statistic.NDO && cfgtags.statistic.NDO.count) addvar_to_dataBlock('DOH', 'DOH', jsdataBlock);
  if (cfgtags.statistic.AI && cfgtags.statistic.AI.count || cfgtags.statistic.NAI && cfgtags.statistic.NAI.count) addvar_to_dataBlock('AIH', 'AIH', jsdataBlock);
  if (cfgtags.statistic.AO && cfgtags.statistic.AO.count || cfgtags.statistic.NAO && cfgtags.statistic.NAO.count) addvar_to_dataBlock('AOH', 'AOH', jsdataBlock);
  addvar_to_dataBlock('VARBUF', 'VARBUF', jsdataBlock);
  datablockvars_map(jsdataBlock);
  // console.log (cfgtags.statistic.DI);

  const jsDDTSource = [];
  jsDDTSource.push(createDDTSource('VARS', cfgtags, 'VAR_CFG'));
  jsDDTSource.push(createDDTSource('DIH', cfgtags, 'DIVAR_HMI'));
  jsDDTSource.push(createDDTSource('DOH', cfgtags, 'DOVAR_HMI'));
  jsDDTSource.push(createDDTSource('AIH', cfgtags, 'AIVAR_HMI'));
  jsDDTSource.push(createDDTSource('AOH', cfgtags, 'AOVAR_HMI'));

  jsSTExchangeFile.STExchangeFile.DDTSource = jsDDTSource;

  // загальний файл імпорту
  for (const variable of jsdataBlock.variables) {
    jsSTExchangeFileAll.STExchangeFile.dataBlock.variables.push(JSON.parse(JSON.stringify(variable)));
  }
  for (const DDTSource of jsDDTSource) {
    jsSTExchangeFileAll.STExchangeFile.DDTSource.push(JSON.parse(JSON.stringify(DDTSource)));
  }
  for (const progname in jsprog) {
    jsSTExchangeFileAll.STExchangeFile.program.push(JSON.parse(JSON.stringify(jsprog[progname])));
  }

  // файли імпорту для змінних
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname]; // jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    const xmlcontent = xmlxddheader
      + xmlparser.js2xml(jsSTExchangeFile, {
        compact: true,
        ignoreComment: true,
        spaces: 4,
        fullTagEmptyElement: true,
      });
    const filename = `${userdir
    }\\${
      opts.resultpath
    }\\${
      jsprog[progname].identProgram._attributes.name
    }.xst`;
    if (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync(path.dirname(filename));
    }
    // console.log (filename);
    fs.writeFileSync(filename, xmlcontent);
    logmsg(` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg(' Файл вміщує також усі змінні та типи VARS.');
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }

  // файли імпорту для ініціалізації
  jsprog = createinitvarsprogram(cfgtags, 'SR', 'MAST');
  jsSTExchangeFile.STExchangeFile.program = jsprog;
  jsSTExchangeFileAll.STExchangeFile.program.push(JSON.parse(JSON.stringify(jsprog)));
  const xmlcontent = xmlxddheader
    + xmlparser.js2xml(jsSTExchangeFile, {
      compact: true,
      ignoreComment: true,
      spaces: 4,
      fullTagEmptyElement: true,
    });
  const filename = `${userdir}\\${opts.resultpath}\\A_initvars.xst`;
  fs.writeFileSync(filename, xmlcontent);
  logmsg(` Файл імпорту ${filename} створено.`);

  // файли імпорту для операторських екранів
  logmsg(' Створюю файли імпорту для операторських екранів');
  create_operscrvars(cfgtags);
}

// Створення імпортних файлів для ВМ
// create_actrtrs(JSON.parse(fs.readFileSync('C:/Users/san/pacframeworktools/result/cfg_acts.json','utf8')));
function create_actrtrs(cfgacts) {
  logmsg('-------------------- Створюю змінні та секції ACTRS');
  let jsprog = createactrssprogram(cfgacts, 'SR', 'MAST');
  const jsdataBlock = {};
  addacts_to_dataBlock(cfgacts, jsdataBlock);// змінна ACT типу ACT з інціалізацією параметрів
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  addvar_to_dataBlock('ACTH', 'ACTH', jsdataBlock);
  addvar_to_dataBlock('ACTBUF', 'ACTTR_CFG', jsdataBlock);
  // addvar_to_dataBlock("DIVAR_TMP", "DIVAR_CFG", jsdataBlock); перенесено в PFWV, видалити після тестування
  // addvar_to_dataBlock("AIVAR_TMP", "AIVAR_CFG", jsdataBlock);
  // addvar_to_dataBlock("DOVAR_TMP", "DOVAR_CFG", jsdataBlock);
  // addvar_to_dataBlock("AOVAR_TMP", "AOVAR_CFG", jsdataBlock);
  datablockvars_map(jsdataBlock);

  const jsDDTSource = [];
  jsDDTSource.push(createDDTSource('ACT', cfgacts, 'ACT_CFG'));
  jsDDTSource.push(createDDTSource('ACTH', cfgacts, 'ACT_HMI'));
  jsSTExchangeFile.STExchangeFile.DDTSource = jsDDTSource;

  // загальний файл імпорту
  for (const variable of jsdataBlock.variables) {
    jsSTExchangeFileAll.STExchangeFile.dataBlock.variables.push(JSON.parse(JSON.stringify(variable)));
  }
  for (const DDTSource of jsDDTSource) {
    jsSTExchangeFileAll.STExchangeFile.DDTSource.push(JSON.parse(JSON.stringify(DDTSource)));
  }
  for (const progname in jsprog) {
    jsSTExchangeFileAll.STExchangeFile.program.push(JSON.parse(JSON.stringify(jsprog[progname])));
  }

  // файли імпорту для ВМ
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname]; // jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    const xmlcontent = xmlxddheader
      + xmlparser.js2xml(jsSTExchangeFile, {
        compact: true,
        ignoreComment: true,
        spaces: 4,
        fullTagEmptyElement: true,
      });
    const filename = `${userdir
    }\\${
      opts.resultpath
    }\\${
      jsprog[progname].identProgram._attributes.name
    }.xst`;
    if (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync(path.dirname(filename));
    }
    // console.log (filename);
    fs.writeFileSync(filename, xmlcontent);
    logmsg(` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg(' Файл вміщує також усі змінні та типи ACTS.');
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }

  // файли імпорту для ініціалізації
  jsprog = createinitactsprogram(cfgacts, 'SR', 'MAST');
  jsSTExchangeFile.STExchangeFile.program = jsprog;
  jsSTExchangeFileAll.STExchangeFile.program.push(JSON.parse(JSON.stringify(jsprog)));
  const xmlcontent = xmlxddheader + xmlparser.js2xml(jsSTExchangeFile, {
    compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement: true,
  });
  const filename = `${userdir}\\${opts.resultpath}\\A_initacts.xst`;
  fs.writeFileSync(filename, xmlcontent);
  logmsg(` Файл імпорту ${filename} створено.`);

  // файли імпорту для операторських екранів
  logmsg(' Створюю файли імпорту для операторських екранів');
  create_operscracts(cfgacts);
}

function dateTimeSEUN() {
  const now = new Date();
  const dateTime = `${now.getFullYear()}-${
    (now.getMonth() + 1).toString()
  }-${now.getDate()}-${now.toLocaleTimeString()}`; // 'dt#2022-01-16-20:47:30'
  return dateTime;
}

// добавляє DDTcontent в опис структурного типу
function createDDTSource(DDTName, DDTcontent, PACFWtype = 'VAR_CFG', version = '0.01') {
  const jsDDTsource = {
    _attributes: {
      DDTName,
      version,
      dateTime: `dt#${dateTimeSEUN()}`,
    },
    structure: { variables: [] },
  };
  // варіант з конфіг тегами
  if (PACFWtype === 'VAR_CFG' && DDTcontent.tags) {
    const { tags } = DDTcontent;
    for (const tagname in tags) {
      const tag = tags[tagname];
      tag.props.TAGNAME;
      // check CYRYLYC
      const rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log(`Кирилиця в імені ${tag.props.TAGNAME}`);
        break;
      } else {
        // { _attributes: { name: 'STA', typeName: 'INT'}, comment: { _text: 'статус' }}
        let vartype = tag.props.TYPE;
        if (vartype[0].toUpperCase() === 'N') vartype = vartype.replace('N', '');
        jsDDTsource.structure.variables.push({
          _attributes: {
            name: tag.props.TAGNAME,
            typeName: `${vartype}VAR_CFG`,
          },
          comment: { _text: tag.props.DESCRIPTION },
        });
      }
    }
  }
  // варіант з конфіг ACT
  if (PACFWtype === 'ACT_CFG' && DDTcontent.acttrs) {
    const { acttrs } = DDTcontent;
    for (const actname in acttrs) {
      const act = acttrs[actname];
      const acttrtype = DDTcontent.types[act.type];
      if (!acttrtype) {
        logmsg(`Не знайдено тип ВМ для ${actname}!`);
        continue;// тільки при помилках
      }
      // check CYRYLYC
      const rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(act.name)) {
        console.log(`Кирилиця в імені ${act.name}`);
        break;
      } else {
        jsDDTsource.structure.variables.push({
          _attributes: {
            name: act.name,
            typeName: `${acttrtype.fnname}_CFG`,
          },
          comment: { _text: `${act.description || ' '}` },
        });
      }
    }
  }

  // варіант з тегами HMI
  if (PACFWtype.search('VAR_HMI') >= 0 && DDTcontent.tags) {
    const { tags } = DDTcontent;
    for (const tagname in tags) {
      const tag = tags[tagname];
      tag.props.TAGNAME;
      // check CYRYLYC
      const rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log(`Кирилиця в імені ${tag.props.TAGNAME}`);
        break;
      } else {
        let pushenbl = false;
        let typeName = PACFWtype;
        // перевірка чи конкретний тип, чи загальні
        switch (PACFWtype) {
          case 'DIVAR_HMI':
            pushenbl = tag.props.TYPE === 'DI' || tag.props.TYPE === 'NDI';
            break;
          case 'DOVAR_HMI':
            pushenbl = tag.props.TYPE === 'DO' || tag.props.TYPE === 'NDO';
            break;
          case 'AIVAR_HMI':
            pushenbl = tag.props.TYPE === 'AI' || tag.props.TYPE === 'NAI';
            break;
          case 'AOVAR_HMI':
            pushenbl = tag.props.TYPE === 'AO' || tag.props.TYPE === 'NAO';
            break;
          default:
            pushenbl = true;
            typeName = `${tag.props.TYPE}VAR_HMI`;
            break;
        }
        if (pushenbl) {
          jsDDTsource.structure.variables.push({
            _attributes: { name: tag.props.TAGNAME, typeName },
            comment: { _text: tag.props.DESCRIPTION },
          });
        }
      }
    }
  }
  // варіант з ACT HMI
  if (PACFWtype.search('ACT_HMI') >= 0 && DDTcontent.acttrs) {
    const { acttrs } = DDTcontent;
    for (const actname in acttrs) {
      const act = acttrs[actname];
      const acttrtype = DDTcontent.types[act.type];
      if (!acttrtype) {
        logmsg(`Не знайдено тип ВМ для ${actname}!`);
        continue;// тільки при помилках
      }
      // check CYRYLYC
      const rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(act.name)) {
        console.log(`Кирилиця в імені ${act.name}`);
        break;
      } else {
        jsDDTsource.structure.variables.push({
          _attributes: {
            name: act.name,
            typeName: `${acttrtype.fnname}_HMI`,
          },
          comment: { _text: `${act.description || ' '}` },
        });
      }
    }
  }
  if (jsDDTsource.structure.variables.length > 0) {
    return jsDDTsource;
  }
  return null;
}

// добавляє змінні в dataBlock з означенням значень елементів за замовченням
function addvars_to_dataBlock(cfgtags, jsdataBlock) {
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  // усі змінні
  const jsvariables = jsdataBlock.variables;
  if (cfgtags.tags) {
    // значення структурної змінної VARS
    const jsVARS = {
      _attributes: { name: 'VARS', typeName: 'VARS' },
      instanceElementDesc: [],
    };
    /* вигляд в парсеному XML
    {_attributes: { name: 'VARS', typeName: 'VARS' },
      instanceElementDesc: [
      { _attributes: [Object], instanceElementDesc: [Array] },
      { _attributes: [Object], instanceElementDesc: [Array] }]
    } */
    const { tags } = cfgtags;
    for (const tagname in tags) {
      const tag = tags[tagname];
      tag.props.TAGNAME;
      // check CYRYLYC
      const rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        logmsg(`Кирилиця в імені ${tag.props.TAGNAME}`);
        break;
      } else {
        /*  _attributes: { name: 'VNabor_T1_OPN' },
            instanceElementDesc: [
            { _attributes: { name: 'ID' }, value:  { _text: '1' } },
            { _attributes: { name: 'CLSID' }, value: { _text: '2' } }
        ] */
        const jsVAR = {
          _attributes: { name: tag.props.TAGNAME },
          instanceElementDesc: [],
        };
        let chid = tag.props.TAGNAME.substr(0, 3).toLowerCase() === 'rez' ? 0 : tag.props.CHID;
        chid = !tag.props.CHID ? 0 : tag.props.CHID;
        // добавлення змінюваних властивостей
        jsVAR.instanceElementDesc.push({
          _attributes: { name: 'ID' },
          value: { _text: tag.props.ID.toString() },
        });
        jsVAR.instanceElementDesc.push({
          _attributes: { name: 'CHID' },
          value: { _text: chid.toString() },
        });
        jsVAR.instanceElementDesc.push({
          _attributes: { name: 'CHIDDF' },
          value: { _text: chid.toString() },
        });
        // добавляємо машстабування, якщо воно вказане
        if ((tag.props.TYPE === 'AI' || tag.props.TYPE === 'AO' || tag.props.TYPE === 'NAI' || tag.props.TYPE === 'NAO') && tag.props.SCALE) {
          const scalesAr = tag.props.SCALE.split(')(');
          const scaleOut = scalesAr[scalesAr.length - 1];
          let scalear = scaleOut.replace(/[()]/g, '').split('..'); // tag.props.SCALE.replace(/[()]/g, "").split("..");
          if (scalear.length === 2) {
            const min = parseFloat(scalear[0]).toFixed(3);
            const max = parseFloat(scalear[1]).toFixed(3);
            jsVAR.instanceElementDesc.push({
              _attributes: { name: 'LOENG' },
              value: { _text: min.toString() },
            });
            jsVAR.instanceElementDesc.push({
              _attributes: { name: 'HIENG' },
              value: { _text: max.toString() },
            });
          }
          // якщо масива два, то є ще вхідний діапазон
          if (scalesAr.length === 2) {
            const scaleIn = scalesAr[0];
            scalear = scaleIn.replace(/[()]/g, '').split('..'); // tag.props.SCALE.replace(/[()]/g, "").split("..");
            if (scalear.length === 2) {
              const min = parseInt(scalear[0]);
              const max = parseInt(scalear[1]);
              jsVAR.instanceElementDesc.push({
                _attributes: { name: 'LORAW' },
                value: { _text: min.toString() },
              });
              jsVAR.instanceElementDesc.push({
                _attributes: { name: 'HIRAW' },
                value: { _text: max.toString() },
              });
              // console.log (tag);
            }
          }
        }
        // добавлення тегу до тегів
        jsVARS.instanceElementDesc.push(jsVAR);
      }
    }
    // додавння структурної змінної тегів до змінних dataBlock
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
// добавляє ВМ в dataBlock з означенням значень елементів за замовченням
function addacts_to_dataBlock(cfgacts, jsdataBlock) {
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  // усі змінні
  const jsvariables = jsdataBlock.variables;
  if (cfgacts.acttrs) {
    // значення структурної змінної ACT
    const jsVARS = {
      _attributes: { name: 'ACT', typeName: 'ACT' },
      instanceElementDesc: [],
    };
    const { acttrs } = cfgacts;
    for (const actname in acttrs) {
      const act = acttrs[actname];
      const acttrtype = cfgacts.types[act.type];
      if (!acttrtype) {
        logmsg(`Не знайдено тип ВМ для ${actname}!`);
        continue; // тільки при помилці
      }
      // check CYRYLYC
      const rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(act.name)) {
        console.log(`Кирилиця в імені ${act.name}`);
        break;
      } else {
        const jsVAR = {
          _attributes: { name: act.name },
          instanceElementDesc: [],
        };
        // добавлення змінюваних властивостей
        jsVAR.instanceElementDesc.push({
          _attributes: { name: 'ID' },
          value: { _text: act.id.toString() },
        });
        jsVAR.instanceElementDesc.push({
          _attributes: { name: 'CLSID' },
          value: { _text: acttrtype.clsid.toString() },
        });
        if (act.topn && act.topn > 0) {
          jsVAR.instanceElementDesc.push({
            _attributes: { name: 'T_OPNSP' },
            value: { _text: act.topn.toString() },
          });
        }
        // добавлення тегу до тегів
        jsVARS.instanceElementDesc.push(jsVAR);
      }
    }
    // додавння структурної змінної тегів до змінних dataBlock
    jsvariables.push(jsVARS);
  }
}
// добавляє змінну заданого типу в dataBlock без означення значень елементів за замовченням
function addvar_to_dataBlock(varname, vartype, jsdataBlock) {
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  const var1 = { _attributes: { name: varname, typeName: vartype } };
  jsdataBlock.variables.push(var1);
}

// меппінг змінних на блоки даних
function datablockvars_map(jsdataBlock) {
  if (!memmap) {
    logmsg('WRN: Не означені адреси в майстерданих, адреси назначатися не будуть');
    return;
  }
  for (variable of jsdataBlock.variables) {
    let varname; let
      adr;
    if (variable._attributes) {
      varname = variable._attributes.name;
    }
    // console.log (varname);
    // якщо є адреса, добавляємо і її
    if (varname && memmap[varname] && memmap[varname].addr) {
      adr = memmap[varname].addr.value;
      if (adr) {
        variable._attributes.topologicalAddress = adr.toString();
        // console.log (variable);
      }
    }
  }
}

// ствобрює секцію main
function createmainprogram(secttype = 'section', task = 'MAST') {
  const body = `PLCFN (PLC := PLC);
  (*виклик при старті*)
  IF PLC.STA_SCN1 THEN
    A_plcmaps();
    A_initvars();
    A_initacts();
  END_IF;
  
  (*обробка входів*)
  A_dichs();
  A_aichs();
  A_ndichs();
  A_naichs();

  A_divars ();
  A_aivars ();
  A_write_parahmi();

  (*обробка виконавчих механізмів*)
  A_resolution();
  A_actrs();
  
  (*обробка виходів*)
  A_dovars();
  A_aovars();
  A_dochs();
  A_aochs();
  A_ndochs();
  A_naochs();
  
  A_moduls();`;

  const progdescr = `(* Ця секція згенерована автоматично PACFramework Tools ${
    new Date().toLocaleString()
  }*)\n`;
  const jsprog = { identProgram: { _attributes: { name: 'mainPFW', type: secttype, task } }, STSource: progdescr + body };
  return jsprog;
}

// ствобрює секції обробки каналів
function createiochsprogram(cfgchs, secttype = 'SR', task = 'MAST') {
  // -------------- CHS
  let bodyDICHS = `FOR i := 1 TO PLC.DICNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHDI[i].ID := INT_TO_UINT(i);
      IF CHDI[i].CLSID = 0 THEN CHDI[i].CLSID := 16#0010;END_IF;
  END_IF;
END_FOR;\n\n`;
  let bodyDOCHS = `FOR i := 1 TO PLC.DOCNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHDO[i].ID := INT_TO_UINT(i);
      IF CHDO[i].CLSID = 0 THEN CHDO[i].CLSID := 16#0020;END_IF;
  END_IF;
END_FOR;\n\n`;
  let bodyAICHS = `FOR i := 1 TO PLC.AICNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHAI[i].ID := INT_TO_UINT(i);
      IF CHAI[i].CLSID = 0 THEN CHAI[i].CLSID := 16#0030;END_IF;
  END_IF;
END_FOR;\n\n`;
  let bodyAOCHS = `FOR i := 1 TO PLC.AOCNT DO
  (*на першому циклі ініціалізуємо змінні ID + CLSID*)
  IF PLC.STA_SCN1 THEN
      CHAO[i].ID := INT_TO_UINT(i);
      IF CHAO[i].CLSID = 0 THEN CHAO[i].CLSID := 16#0040;END_IF;
  END_IF;
END_FOR;\n\n`;

  let bodyNDICHS = `FOR i := 1 TO ${cfgchs.chs.statistic.ndicnt} DO
(*на першому циклі ініціалізуємо змінні ID + CLSID*)
IF PLC.STA_SCN1 THEN
    CHNDI[i].ID := INT_TO_UINT(i);
    IF CHNDI[i].CLSID = 0 THEN CHNDI[i].CLSID := 16#0060;END_IF;
END_IF;
END_FOR;\n\n`;
  let bodyNDOCHS = `FOR i := 1 TO ${cfgchs.chs.statistic.ndocnt} DO
(*на першому циклі ініціалізуємо змінні ID + CLSID*)
IF PLC.STA_SCN1 THEN
    CHNDO[i].ID := INT_TO_UINT(i);
    IF CHNDO[i].CLSID = 0 THEN CHNDO[i].CLSID := 16#0070;END_IF;
END_IF;
END_FOR;\n\n`;
  let bodyNAICHS = `FOR i := 1 TO ${cfgchs.chs.statistic.naicnt} DO
(*на першому циклі ініціалізуємо змінні ID + CLSID*)
IF PLC.STA_SCN1 THEN
    CHNAI[i].ID := INT_TO_UINT(i);
    IF CHNAI[i].CLSID = 0 THEN CHNAI[i].CLSID := 16#0080;END_IF;
END_IF;
END_FOR;\n\n`;
  let bodyNAOCHS = `FOR i := 1 TO ${cfgchs.chs.statistic.naocnt} DO
(*на першому циклі ініціалізуємо змінні ID + CLSID*)
IF PLC.STA_SCN1 THEN
    CHNAO[i].ID := INT_TO_UINT(i);
    IF CHNAO[i].CLSID = 0 THEN CHNAO[i].CLSID := 16#0090;END_IF;
END_IF;
END_FOR;\n\n`;

  const jsdichsprog = { identProgram: { _attributes: { name: 'A_dichs', type: secttype, task } }, STSource: {} };
  const jsdochsprog = { identProgram: { _attributes: { name: 'A_dochs', type: secttype, task } }, STSource: {} };
  const jsaichsprog = { identProgram: { _attributes: { name: 'A_aichs', type: secttype, task } }, STSource: {} };
  const jsaochsprog = { identProgram: { _attributes: { name: 'A_aochs', type: secttype, task } }, STSource: {} };
  const jsndichsprog = { identProgram: { _attributes: { name: 'A_ndichs', type: secttype, task } }, STSource: {} };
  const jsndochsprog = { identProgram: { _attributes: { name: 'A_ndochs', type: secttype, task } }, STSource: {} };
  const jsnaichsprog = { identProgram: { _attributes: { name: 'A_naichs', type: secttype, task } }, STSource: {} };
  const jsnaochsprog = { identProgram: { _attributes: { name: 'A_naochs', type: secttype, task } }, STSource: {} };

  const { chs } = cfgchs;

  bodyDICHS += '(* ------------ Діагностика каналів -------------- *)\n';
  bodyDOCHS += '(* ------------ Діагностика каналів -------------- *)\n';
  bodyAICHS += '(* ------------ Діагностика каналів -------------- *)\n';
  bodyAOCHS += '(* ------------ Діагностика каналів -------------- *)\n';
  for (const chnmb in chs.chdis) {
    const ch = chs.chdis[chnmb];
    if (ch.adr.toUpperCase().search('%I') >= 0) {
      // CHAI[1].STA_BAD:=%i0.4.0.err;
      bodyDICHS += `CHDI[${chnmb}].STA_BAD := %I${ch.adr.toUpperCase().replace('%I', '')}.err;\n`;
    }
  }
  for (const chnmb in chs.chdos) {
    const ch = chs.chdos[chnmb];
    if (ch.adr.toUpperCase().search('%Q') >= 0) {
      bodyDOCHS += `CHDO[${chnmb}].STA_BAD := %I${ch.adr.toUpperCase().replace('%Q', '')}.err;\n`;
    }
  }
  for (const chnmb in chs.chais) {
    const ch = chs.chais[chnmb];
    if (ch.adr.toUpperCase().search('%IW') >= 0) {
      bodyAICHS += `CHAI[${chnmb}].STA_BAD := %I${ch.adr.toUpperCase().replace('%IW', '')}.err;\n`;
    }
  }
  for (const chnmb in chs.chaos) {
    const ch = chs.chaos[chnmb];
    if (ch.adr.toUpperCase().search('%QW') >= 0) {
      bodyAOCHS += `CHAO[${chnmb}].STA_BAD := %I${ch.adr.toUpperCase().replace('%QW', '')}.err;\n`;
    }
  }

  bodyDICHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyDOCHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyAICHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyAOCHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyNDICHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyNDOCHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyNAICHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';
  bodyNAOCHS += '\n(* ------------ Прив\'язка до реальних каналів -------------- *)\n';

  for (const chnmb in chs.chdis) {
    const ch = chs.chdis[chnmb];
    bodyDICHS += `CHDIFN (RAW := ${ch.adr},  CHCFG := CHDI[${chnmb}],  CHHMI := CHDI_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (const chnmb in chs.chdos) {
    const ch = chs.chdos[chnmb];
    bodyDOCHS += `CHDOFN (CHCFG := CHDO[${chnmb}],  CHHMI := CHDO_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF, RAW => ${ch.adr});\n`;
  }
  for (const chnmb in chs.chais) {
    const ch = chs.chais[chnmb];
    bodyAICHS += `CHAIFN (RAWINT := ${ch.adr}, CHCFG := CHAI[${chnmb}], CHHMI := CHAI_HMI[${chnmb}], PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (const chnmb in chs.chaos) {
    const ch = chs.chaos[chnmb];
    bodyAOCHS += `CHAOFN (CHCFG := CHAO[${chnmb}], CHHMI := CHAO_HMI[${chnmb}], PLCCFG := PLC, CHBUF := CH_BUF, RAWINT => ${ch.adr});\n`;
  }
  // net
  for (const chnmb in chs.chndis) {
    bodyNDICHS += `CHDIFN (RAW :=  CHNDI[${chnmb}].STA_VRAW,  CHCFG := CHNDI[${chnmb}],  CHHMI := CHNDI_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (const chnmb in chs.chndos) {
    bodyNDOCHS += `CHDOFN (CHCFG := CHNDO[${chnmb}],  CHHMI := CHNDO_HMI[${chnmb}],  PLCCFG := PLC, CHBUF := CH_BUF, RAW => CHNDO[${chnmb}].STA_VRAW);\n`;
  }
  for (const chnmb in chs.chnais) {
    bodyNAICHS += `CHAIFN (RAWINT :=  CHNAI[${chnmb}].VAL, CHCFG := CHNAI[${chnmb}], CHHMI := CHNAI_HMI[${chnmb}], PLCCFG := PLC, CHBUF := CH_BUF);\n`;
  }
  for (const chnmb in chs.chnaos) {
    bodyNAOCHS += `CHAOFN (CHCFG := CHNAO[${chnmb}], CHHMI := CHNAO_HMI[${chnmb}], PLCCFG := PLC, CHBUF := CH_BUF, RAWINT => CHNAO[${chnmb}].VAL);\n`;
  }

  const progdescr = `(* Ця секція згенерована автоматично PACFramework Tools ${
    new Date().toLocaleString()
  }*)\n`;
  jsdichsprog.STSource = progdescr + bodyDICHS;
  jsdochsprog.STSource = progdescr + bodyDOCHS;
  jsaichsprog.STSource = progdescr + bodyAICHS;
  jsaochsprog.STSource = progdescr + bodyAOCHS;
  jsndichsprog.STSource = progdescr + bodyNDICHS;
  jsndochsprog.STSource = progdescr + bodyNDOCHS;
  jsnaichsprog.STSource = progdescr + bodyNAICHS;
  jsnaochsprog.STSource = progdescr + bodyNAOCHS;

  // -------------- PLC MAPS
  const jsmapsprog = { identProgram: { _attributes: { name: 'A_plcmaps', type: secttype, task } }, STSource: {} };
  const { dicnt } = chs.statistic;
  const { docnt } = chs.statistic;
  const { aicnt } = chs.statistic;
  const { aocnt } = chs.statistic;
  const { modulscnt } = chs.statistic;
  let bodyPLCMAPS = `(*кількість каналів та модулів*)
  PLC.DICNT := ${dicnt};\n  PLC.DOCNT := ${docnt};\n  PLC.AICNT := ${aicnt};\n  PLC.AOCNT := ${aocnt};\n  PLC.MODULSCNT := ${modulscnt};
  (*завантажити в буфер підмодуль 0 модуля 0*)\n  MODULES[0].STA.11 := true;\n\n(*типи 1- DICH, 2- DOCH, 3- AICH, 4 – AOCH, 5 - COM, 6- NDICH, 7- NDOCH, 8- NAICH, 9 – NAOCH*)\n`;
  const modules = cfgchs.iomapplc.plcform;
  for (let i = 0; i < modulscnt; i++) {
    const module = modules[i];
    if (!module) {
      logmsg(`ERR: Не знайдено модуль з номером ${i}, помилка в коді програми `);
      continue;
    }
    bodyPLCMAPS += `MODULES[${i}].TYPE1 := 16#${module.MODTYPE}; (*${module.MODTYPESTR}*)\n`;
    bodyPLCMAPS += `MODULES[${i}].CHCNTS := 16#${module.CHCNTS};(*${module.CHCNTSD}*)\n`;
    bodyPLCMAPS += `MODULES[${i}].STRTNMB[0] := ${module.STRTNMB0};\n`;
    bodyPLCMAPS += `MODULES[${i}].STRTNMB[1] := ${module.STRTNMB1};\n`;
    bodyPLCMAPS += `MODULES[${i}].STRTNMB[2] := ${module.STRTNMB2};\n`;
    bodyPLCMAPS += `MODULES[${i}].STRTNMB[3] := ${module.STRTNMB3};\n\n`;
  }

  jsmapsprog.STSource = progdescr + bodyPLCMAPS;

  return {
    jsdichsprog, jsdochsprog, jsaichsprog, jsaochsprog, jsndichsprog, jsndochsprog, jsnaichsprog, jsnaochsprog, jsmapsprog,
  };
}
// ствобрює секції обробки змінних
function createiovarsprogram(cfgtags, secttype = 'SR', task = 'MAST') {
  let bodyDIVARS = '';
  let bodyDOVARS = '';
  let bodyAIVARS = '';
  let bodyAOVARS = '';
  let bodyAIVARSadd = '(* Додаткові налаштування змінних для подальшого експортування в SCADA\n при ручній зміні дотрмуватися форматування \n {PFWEXPORTSTART}{"AIVARS":{\n';
  const jsdivarsprog = {
    identProgram: {
      _attributes: { name: 'A_divars', type: secttype, task },
    },
    STSource: {},
  };
  const jsdovarsprog = {
    identProgram: {
      _attributes: { name: 'A_dovars', type: secttype, task },
    },
    STSource: {},
  };
  const jsaivarsprog = {
    identProgram: {
      _attributes: { name: 'A_aivars', type: secttype, task },
    },
    STSource: {},
  };
  const jsaovarsprog = {
    identProgram: {
      _attributes: { name: 'A_aovars', type: secttype, task },
    },
    STSource: {},
  };

  const tags = [];
  for (const tagname in cfgtags.tags) {
    tags.push(cfgtags.tags[tagname]);
  }
  tags.sort((a, b) => a.props.ID - b.props.ID);
  for (tag of tags) {
    switch (tag.props.TYPE) {
      case 'DI':
        bodyDIVARS += `DIVARFN(CHCFG := CHDI[VARS.${tag.props.TAGNAME}.CHID], DIVARCFG := VARS.${tag.props.TAGNAME}, DIVARHMI := DIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI); (*${tag.props.DESCRIPTION}*) \n`;
        // `DIVARFN (CHCFG := CHDI[VARS.VNabor_T1_OPN.CHID],  DIVARCFG := VARS.VNabor_T1_OPN,  DIVARHMI := VAR_HMI.VNabor_T1_OPN,  VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI);`
        break;
      case 'DO':
        bodyDOVARS += `DOVARFN(CHCFG := CHDO[VARS.${tag.props.TAGNAME}.CHID], DOVARCFG := VARS.${tag.props.TAGNAME}, DOVARHMI := DOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDO := CHDO); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      case 'AI':
        bodyAIVARS += `AIVARFN(CHCFG := CHAI[VARS.${tag.props.TAGNAME}.CHID], AIVARCFG := VARS.${tag.props.TAGNAME}, AIVARHMI := AIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAI := CHAI); (*${tag.props.DESCRIPTION}*) \n`;
        const eu = tag.props.UNIT || '';
        const frmt = tag.props.FRMT || '';
        const scale = tag.props.SCALE || '';
        bodyAIVARSadd += `"${tag.props.TAGNAME}":{"eu":"${eu}", "frmt": "${frmt}", "scale":"${scale}"},\n`;
        break;
      case 'AO':
        bodyAOVARS += `AOVARFN(CHCFG := CHAO[VARS.${tag.props.TAGNAME}.CHID], AOVARCFG := VARS.${tag.props.TAGNAME}, AOVARHMI := AOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAO := CHAO); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      // net
      case 'NDI':
        bodyDIVARS += `DIVARFN(CHCFG := CHNDI[VARS.${tag.props.TAGNAME}.CHID], DIVARCFG := VARS.${tag.props.TAGNAME}, DIVARHMI := DIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHNDI); (*${tag.props.DESCRIPTION}*) \n`;
        // `DIVARFN (CHCFG := CHDI[VARS.VNabor_T1_OPN.CHID],  DIVARCFG := VARS.VNabor_T1_OPN,  DIVARHMI := VAR_HMI.VNabor_T1_OPN,  VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI);`
        break;
      case 'NDO':
        bodyDOVARS += `DOVARFN(CHCFG := CHNDO[VARS.${tag.props.TAGNAME}.CHID], DOVARCFG := VARS.${tag.props.TAGNAME}, DOVARHMI := DOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDO := CHNDO); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      case 'NAI':
        bodyAIVARS += `AIVARFN(CHCFG := CHNAI[VARS.${tag.props.TAGNAME}.CHID], AIVARCFG := VARS.${tag.props.TAGNAME}, AIVARHMI := AIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAI := CHNAI); (*${tag.props.DESCRIPTION}*) \n`;
        break;
      case 'NAO':
        bodyAOVARS += `AOVARFN(CHCFG := CHNAO[VARS.${tag.props.TAGNAME}.CHID], AOVARCFG := VARS.${tag.props.TAGNAME}, AOVARHMI := AOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAO := CHNAO); (*${tag.props.DESCRIPTION}*) \n`;
        break;

      default:
        break;
    }
  }

  const progdescr = `(* Ця секція згенерована автоматично PACFramework Tools ${
    new Date().toLocaleString()
  }*)\n`;

  bodyAIVARSadd = bodyAIVARSadd.slice(0, -2);// забираємо останню кому
  bodyAIVARSadd += '}}{PFWEXPORTEND}*)\n';

  jsdivarsprog.STSource = progdescr + bodyDIVARS;
  jsdovarsprog.STSource = progdescr + bodyDOVARS;
  jsaivarsprog.STSource = progdescr + bodyAIVARS + bodyAIVARSadd;
  jsaovarsprog.STSource = progdescr + bodyAOVARS;

  return {
    jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog,
  };
}
// ствобрює секцію ініціалізації
function createinitvarsprogram(cfgtags, secttype = 'SR', task = 'MAST') {
  const jsprog = {
    identProgram: {
      _attributes: { name: 'A_initvars', type: secttype, task },
    },
    STSource: {},
  };
  let bodyprog = '';

  const tags = [];
  for (const tagname in cfgtags.tags) {
    tags.push(cfgtags.tags[tagname]);
  }
  tags.sort((a, b) => a.props.ID - b.props.ID);
  for (tag of tags) {
    const tagname = tag.props.TAGNAME;
    const chid = tag.props.TAGNAME.substr(0, 3).toLowerCase() === 'rez' ? 0 : tag.props.CHID;
    const id = tag.props.ID.toString();
    bodyprog += `VARS.${tagname}.ID:=${id}; VARS.${tagname}.CHID:=${chid}; VARS.${tagname}.CHIDDF:=${chid};\n`;
    // VARS.VNabor_T1_OPN.ID:=10001;  VARS.VNabor_T1_OPN.CHID:=1;   VARS.VNabor_T1_OPN.CHIDDF:=1;
  }
  const progdescr = `(* Ця секція згенерована автоматично PACFramework Tools ${
    new Date().toLocaleString()
  }*)\n`;
  jsprog.STSource = progdescr + bodyprog;
  return jsprog;
}

// ствобрює секцію ініціалізації
function createinitactsprogram(cfgacts, secttype = 'SR', task = 'MAST') {
  const jsprog = {
    identProgram: {
      _attributes: { name: 'A_initacts', type: secttype, task },
    },
    STSource: {},
  };
  let bodyprog = '';

  const acttrs = [];
  for (const actname in cfgacts.acttrs) {
    acttrs.push(cfgacts.acttrs[actname]);
  }
  acttrs.sort((a, b) => a.id - b.id);
  for (act of acttrs) {
    const actname = act.name;
    const id = act.id.toString();
    bodyprog += `ACT.${actname}.ID:=${id};`;
    let acttype;
    if (act.type) {
      acttype = cfgacts.types[act.type];
      let { clsid } = acttype;
      if (clsid > 0) {
        clsid = clsid.toString(16);
        bodyprog += `ACT.${actname}.CLSID:=16#${clsid};\n`;
        // ACT.VLVD1.ID:=1; ACT.VLVD1.CLSID:=16#2011;
      }
    }
  }
  const progdescr = `(* Ця секція згенерована автоматично PACFramework Tools ${
    new Date().toLocaleString()
  }*)\n`;
  jsprog.STSource = progdescr + bodyprog;
  return jsprog;
}

// ствобрює секцію обробки ВМ
function createactrssprogram(cfgacts, secttype = 'SR', task = 'MAST') {
  const jsprog = { identProgram: { _attributes: { name: 'A_actrs', type: secttype, task } }, STSource: {} };
  const jsresolution = { identProgram: { _attributes: { name: 'A_resolution', type: secttype, task } }, STSource: {} };

  let bodyPROG = 'PFWV.DIVAR_TMP.ID:=0; PFWV.DIVAR_TMP.CLSID:=0;\nPFWV.DOVAR_TMP.ID:=0; PFWV.DOVAR_TMP.CLSID:=0;\nPFWV.AIVAR_TMP.ID:=0; PFWV.AIVAR_TMP.CLSID:=0;\nPFWV.AOVAR_TMP.ID:=0; PFWV.AOVAR_TMP.CLSID:=0;\n';
  bodyresPROG = '(* Якщо не відправляється команда TRUE, ВМ не виконує жодної команди керування*)\n';
  const acts = cfgacts.acttrs;
  // упорядкування по типу
  // стоврення нового обєкту, прототипу з типів
  const acttrsbytypes = JSON.parse(JSON.stringify(cfgacts.types));
  for (acttrname in acts) {
    const act = acts[acttrname];
    const acttype = act.type;
    if (!acttrsbytypes[acttype]) {
      logmsg(`Не знайдено тип ВМ для ${acttrname}!`);
      continue;// тільки при помилках
    }
    if (!acttrsbytypes[acttype].acttrs) acttrsbytypes[acttype].acttrs = {};
    acttrsbytypes[acttype].acttrs[acttrname] = act;
  }
  for (acttrtypename in acttrsbytypes) {
    acttrtype = acttrsbytypes[acttrtypename];
    bodyPROG += `(* ----------- Виконавчі механізми ${acttrtypename} - ${acttrtype.typedescr} ----------------- *)\n`;
    // перебір виконавчих механізмів відповідно до типу
    for (actrname in acttrtype.acttrs) {
      const acttr = acttrtype.acttrs[actrname];
      const { io } = acttr;
      // якщо є нелінковані теги нписати про це
      if (io.unlinked && io.unlinked.length > 0) {
        bodyPROG += `//неліноковані теги: ${JSON.stringify(io.unlinked)} \n     `;
      }
      bodyPROG += `${acttrtype.fnname}FN(ACTCFG:=ACT.${actrname}, ACTHMI:=ACTH.${actrname}`;
      bodyresPROG += `ACT.${actrname}.CMD.CMD_RESOLUTION:=TRUE;\n`;
      // перебор по інтерфейсу
      for (ioname in io) {
        if (ioname !== 'unlinked') {
          const ionameinfn = ioname.split('/')[0]; // назва в функції завжди ліва назва з альтернативних варіантів суфіксів
          const ioval = io[ioname];
          bodyPROG += `, ${ionameinfn}:=`;
          if (ioval.length > 0) { // для привязаного IO
            bodyPROG += `VARS.${ioval}`;
          } else { // для непривязаного IO ставимо пустишки
            const vartype = acttrtype.io[ioname].type;
            // console.log (`${ionameinfn} -> ${vartype}`);
            switch (vartype) {
              case 'DI':
                bodyPROG += 'PFWV.DIVAR_TMP';
                break;
              case 'AI':
                bodyPROG += 'PFWV.AIVAR_TMP';
                break;
              case 'DO':
                bodyPROG += 'PFWV.DOVAR_TMP';
                break;
              case 'AO':
                bodyPROG += 'PFWV.AOVAR_TMP';
                break;
            }
          }
        }
      }
      bodyPROG += `, PLCCFG := PLC, ACTBUF := ACTBUF ); (* ${(acttr.description) ? acttr.description : ''} *) \n`;
    }
  }

  const progdescr = `(* Ця секція згенерована автоматично PACFramework Tools ${
    new Date().toLocaleString()
  }*)\n`;
  jsprog.STSource = progdescr + bodyPROG;
  jsresolution.STSource = progdescr + bodyresPROG;
  return { jsprog, jsresolution };
}
// створює операторські екрани для змінних
function create_operscrvars(cfgtags) {
  const replacers = {
    DI: [], DO: [], AI: [], AO: [],
  };

  for (tagname in cfgtags.tags) {
    const tag = cfgtags.tags[tagname];
    if (tag.props.TYPE) {
      let tagtype = tag.props.TYPE;
      if (tagtype[0].toUpperCase() === 'N') {
        tagtype = tagtype.replace('N', '');
      } // NDI,NDO,NAI,NAO
      replacers[tagtype].push({ main: tagname });
    }
  }
  if (replacers.DI.length > 0) operatorscreen_dupreplace('divar.xcr', 'DIH', replacers.DI, 'DIVARS');
  if (replacers.DO.length > 0) operatorscreen_dupreplace('dovar.xcr', 'DOH', replacers.DO, 'DOVARS');
  if (replacers.AI.length > 0) operatorscreen_dupreplace('aivar.xcr', 'AIH', replacers.AI, 'AIVARS');
  if (replacers.AO.length > 0) operatorscreen_dupreplace('aovar.xcr', 'AOH', replacers.AO, 'AOVARS');
}
// створює операторські екрани для ВМ
function create_operscracts(cfgacts) {
  const replacers = {};
  const { types } = cfgacts;
  for (actname in cfgacts.acttrs) {
    const act = cfgacts.acttrs[actname];
    if (!act.type || !types[act.type]) {
      logmsg(`Не знайдено тип ВМ для ${actname}!`);
      continue;// тільки при помилках
    }
    const type = types[act.type].fnname;
    if (type) {
      if (typeof (replacers[type]) === 'undefined') {
        replacers[type] = [];
      }
      replacers[type].push({ main: actname });
    }
  }
  for (typename in replacers) {
    const tmpltname = `${typename.toLowerCase()}.xcr`; // наприклад "vlvd.xcr"
    const filename = typename; // наприклад "VLVD"
    operatorscreen_dupreplace(tmpltname, 'ACTH', replacers[typename], filename);
  }
}

// створює операторські екрани для відображення каналів
function create_operscmaps(cfgchs) {
  const moduls = cfgchs.iomapplc.plcform;
  const replacers = [];
  for (let i = 0; i < moduls.length; i++) {
    module = moduls[i];
    replacers.push({ main: `MODULES[${i.toString()}]` });
  }
  const tmpltname = 'moduls.xcr';
  const filename = 'moduls.xcr';
  operatorscreen_dupreplace(tmpltname, 'MODULES[0]', replacers, filename, 32);
}

function operatorscreen_dupreplace(filename, prefixin = 'DIH', replacer, newscreenname, elmsperpage = 32) {
  // elmsperpage - поділ на сторінки, to do
  const fullfilename = `${userdir}\\${opts.source}\\${filename}`;
  let xmlorig;
  try {
    xmlorig = fs.readFileSync(fullfilename, 'utf8');
  } catch (error) {
    logmsg(
      `WRN: Не вдалося завантажити файл ${fullfilename}, перевірте наявність файлу`,
    );
    return;
  }
  // <screen name="PACFramework_DIVAR"
  const oldscreenname = xmlorig.split('<screen name="')[1].split('"')[0];
  xmlorig = xmlorig.replace(
    `<screen name="${oldscreenname}`,
    `<screen name="${newscreenname}`,
  );
  // console.log (oldscreenname);
  const xmlar = xmlorig
    .replace(/<object/g, '!!!!!!!!!!<object')
    .replace(/<\/screen>/g, '!!!!!!!!!!</screen>')
    .split('!!!!!!!!!!');
  // пошук prefix
  if (prefixin === 'MODULES[0]') {
    prefix = `name="${prefixin}`;
  } else {
    prefix = `name="${prefixin}.`;
  }

  let group;
  let isgroup = false;
  let i = 0;
  let found = false;
  for (j = 0; j < xmlar.length; j++) {
    txtline = xmlar[j];
    let pos = txtline.search('<object objectID="2"');
    if (pos >= 0) {
      i = 0;
      isgroup = true;
      xmlline = xmlparser.xml2js(txtline, { compact: true });
      const ob = xmlline.object._attributes.description;
      const cord = ob.replace('(', '').split('),')[0].split(',');
      group = {
        txtelm: [],
        props: {
          start: j,
          content: txtline,
          mainoldlink: '',
          y1: parseInt(cord[0]),
          x1: parseInt(cord[1]),
          y2: parseInt(cord[2]),
          x2: parseInt(cord[3]),
          cnt: parseInt(ob.replace('(', '').split('),')[1]),
        },
      };
    } else if (isgroup === true) {
      // ми поки в групі
      group.txtelm.push(txtline);
      i++;
      if (i >= group.props.cnt) {
        // останній елемент в групі
        isgroup = false;
        group.props.end = j;
        if (found === true) {
          // шукана група
          break; // завершуємо пошук
        }
      }
      // console.log (xmlparser.xml2js(txtline, {compact: true}))
    }

    const prefix1 = prefix.replace('[', '\\[').replace(']', '\\]');// заміна слуюбових символів регулярних виразів
    pos = txtline.search(prefix1);
    if (isgroup && pos >= 0) {
      // console.log (txtline.split(prefix)[1]);
      // process.exit();
      if (prefixin === 'MODULES[0]') {
        group.props.mainoldlink = 'MODULES[0]';
      } else {
        group.props.mainoldlink = txtline.split(prefix)[1].split('.')[0];
      }

      found = true;
    }
  }
  // обробка знайденого
  if (found === true) {
    let i = group.props.end + 1; // починаємо вставку з останнього елементу
    let newlink = '';
    for (let j = 1; j < replacer.length; j++) {
      const deltay = group.props.y2 - group.props.y1;
      let txtelm = '';
      newlink = replacer[j].main;
      // створення нової копії
      txtelm = screenelm_replace(group.props.content, 0, deltay, group.props.mainoldlink, newlink);
      xmlar.splice(i, 0, txtelm); // вставляємо позначення групи
      i++;
      for (let k = 0; k < group.props.cnt; k++) {
        txtelm = screenelm_replace(group.txtelm[k], 0, deltay * j, group.props.mainoldlink, newlink);
        // кординати, зміст
        xmlar.splice(i, 0, txtelm); // вставляємо в i-ту позицію k-й елемент групи, видаляємо 0 елементів
        i++;
      }
    }
    // заміна властивостей існуючого елементу
    if (!replacer[0]) {
      logmsg('Не знайдено елемент');
      return;
    }
    newlink = replacer[0].main;
    txtelm = screenelm_replace(group.props.content, 0, 0, group.props.mainoldlink, newlink);
    xmlar[group.props.start] = txtelm;
    for (let k = 0; k < group.props.cnt; k++) {
      txtelm = screenelm_replace(group.txtelm[k], 0, 0, group.props.mainoldlink, newlink);
      xmlar[group.props.start + k + 1] = txtelm;
    }
    // console.log (group);
    const xmlout = xmlar.join('');
    // console.log (xmlout);
    const outfilename = `${userdir}\\${opts.resultpath}\\${filename}`;
    fs.writeFileSync(outfilename, xmlout);
    logmsg(`Файл імпорту операторських екранів ${outfilename} створено`);
  } else {
    logmsg(`WRN: Не вдалося знайти в шаблоні операторських екранів ${filename} прив'язки з вказаним префіксом "${prefixin}", перевірте файл шаблону`);
  }

  //
  // console.log (jscontent.SCRExchangeFile.IOScreen.screen.object);
  // console.log (xmlar.length);
}

function screenelm_replace(elem, dtx = 0, dty = 0, oldlink, newlink) {
  const re = new RegExp(oldlink, 'g');
  // elem = elem.replace(oldlink, newlink);
  elem = elem.replace(re, newlink);
  // console.log (oldlink + '  ' + newlink);
  const part1 = `${elem.split('description="(')[0]}description="(`;
  const part2 = elem.split('description="(')[1].split('),')[0];
  const part3 = elem.split(part2)[1];
  const arcord = part2.split(',');
  arcord[0] = parseInt(arcord[0]) + dty;
  arcord[2] = parseInt(arcord[2]) + dty;
  arcord[1] = parseInt(arcord[1]) + dtx;
  arcord[3] = parseInt(arcord[3]) + dtx;
  const newtxt = part1 + arcord.join() + part3;
  // console.log (newtxt);
  return newtxt;
}

module.exports = {
  create_all, create_chs, create_vars, create_actrtrs,
};
