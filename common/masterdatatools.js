/* Загальні, незалежні від бренду та продукту утиліти роботу з майстерданими
tagsdif (plctags, cfgtags) => difob - порівняння мастердат в plctags та cfgtags, наразі не використовується
chsmap_fromplc (plchs, plctags) => chsmap - формує меппінг каналів і змінних з даних, витягнутих з програми plc
chsmap_fromcfgfn cfgchs, cfgtags, chstype) => cfgchmap - формує канали, меппінг каналів і змінних з даних CFG
iomapplcform_togenform (chs) формує загальну форму по формі ПЛК, моифікує chs
chsmapfn (chsmap, chdis, dimap, 'di') =>
iomaptoplcform (cfgchs) - перетворення даних IOMAP в форму PACFramework, моифікує cfgchs
getactrtsinfo (cfgtags, cfgtypes) - отримує обєкт-список виконавчих механізмів за мастердата тегами та означеними типами
attrlinktag (cfgacts, act, ioname, withoutlink = false) - прив'язка act.io[ioname] до привязаних тегів act за шаблонами типу, якщо withoutlink=false, повертає true якщо знайдено
syncobs (masterob, newob, deleteoldfields = 0) - синхронізація нового об'єкту з мастерданими, наразі не використовується
logmsg (msg, toconsole=1) - виведення повідомлення msg на консоль (при toconsole=1) та в msglog DEPRECATED
writetolog (createnew = 0) - виведення msglog в файл, при createnew = 1 - створюється новий файл, перезаписуючи старий
*/
const path = require('path');
const fs = require('fs');
const msgar = [];
const opts = {
  inipath: './',
  logpath: 'log',
  logfile: 'general.log',
  source: 'undefined',
};
let msglog = '';
// порівняння мастердат plc та cfg
function tagsdif(plctags, cfgtags) {
  const difob = {
    listtagsinfo: {
      equal: { cnt: 0, tags: {} },
      onlycfg: { cnt: 0, tags: {} },
      onlyplc: { cnt: 0, tags: {} },
    },
  };
  logmsgar('Зведення загального переліку тегів', 'master-tagsdif', 'msg', msgar);
  for (const tagname in plctags.tags) {
    const { tags } = difob.listtagsinfo.onlyplc;
    if (plctags.tags[tagname].state === 'valid') {
      difob.listtagsinfo.onlyplc.cnt++;
      tags[tagname] = {
        id: plctags.tags[tagname].id,
      };
    }
  }
  for (const tagname in cfgtags.tags) {
    const { tags } = difob.listtagsinfo.onlycfg;
    if (!difob.listtagsinfo.onlyplc.tags[tagname]) {
      difob.listtagsinfo.onlycfg.cnt++;
      tags[tagname] = {
        id: cfgtags.tags[tagname].id,
      };
      logmsgar(`Тег ${tagname} не знайдений в ПЛК`, 1, 'master-tagsdif', 'WRN', msgar);
    } else {
      difob.listtagsinfo.equal.cnt++;
      difob.listtagsinfo.equal.tags[tagname] = {
        id: cfgtags.tags[tagname].id,
      };
      delete difob.listtagsinfo.onlyplc.tags[tagname];
      difob.listtagsinfo.onlyplc.cnt--;
    }
  }

  // console.log (difob);
  return (difob);
}

// формує меппінг каналів і змінних з даних ПЛК
function chsmap_fromplc(plchs, plctags) {
  const chsmap = {
    dimap: [], domap: [], aimap: [], aomap: [], ndimap: [], ndomap: [], naimap: [], naomap: [],
  };
  const { chdis } = plchs.chs;
  const { chdos } = plchs.chs;
  const { chais } = plchs.chs;
  const { chaos } = plchs.chs;
  const { chndis } = plchs.chs;
  const { chndos } = plchs.chs;
  const { chnais } = plchs.chs;
  const { chanos } = plchs.chs;
  const dimap = []; const domap = []; const aimap = []; const
    aomap = [];
  for (const tagname in plctags.tags) {
    const tag = plctags.tags[tagname];
    const chnum = parseInt(tag.chid);
    if (chnum > 0) {
      switch (tag.type) {
        case 'DI':
          if (dimap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${dimap[chnum]}`, 1, 'master-chsmap_fromplc', 'WRN', msgar);
            dimap[chnum] += `;${tagname}`;
          } else {
            dimap[chnum] = tagname;
          }
          break;
        case 'DO':
          if (domap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${domap[chnum]}`, 1, 'master-chsmap_fromplc', 'WRN', msgar);
            domap[chnum] += `;${tagname}`;
          } else {
            domap[chnum] = tagname;
          }
          break;
        case 'AI':
          if (aimap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aimap[chnum]}`, 1, 'master-chsmap_fromplc', 'WRN', msgar);
            aimap[chnum] += `;${tagname}`;
          } else {
            aimap[chnum] = tagname;
          }
          break;
        case 'AO':
          if (aomap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aomap[chnum]}`, 1, 'master-chsmap_fromplc', 'WRN', msgar);
            aomap[chnum] += `;${tagname}`;
          } else {
            aomap[chnum] = tagname;
          }
          break;
        default:
          break;
      }
    }
    // tag.chid chadr
  }

  chsmapfn(chsmap, chdis, dimap, 'di');
  chsmapfn(chsmap, chdos, domap, 'do');
  chsmapfn(chsmap, chais, aimap, 'ai');
  chsmapfn(chsmap, chaos, aomap, 'ao');
  return (chsmap);
}

// формує канали, меппінг каналів і змінних з даних CFG
function chsmap_fromcfgfn(cfgchs, cfgtags, chstype) {
  const cfgchmap = {
    dimap: [], domap: [], aimap: [], aomap: [], ndimap: [], ndomap: [], naimap: [], naomap: [],
  };
  cfgchs.devs = {};
  cfgchs.moduls = {};
  cfgchs.chs = {
    types: chstype,
    statistic: {
      dicnt: 0, docnt: 0, aicnt: 0, aocnt: 0, modulscnt: 0, ndicnt: 0, ndocnt: 0, naicnt: 0, naocnt: 0,
    },
    chdis: {},
    chdos: {},
    chais: {},
    chaos: {},
    chndis: {},
    chndos: {},
    chnais: {},
    chnaos: {},
  };
  const { chdis } = cfgchs.chs;
  const { chdos } = cfgchs.chs;
  const { chais } = cfgchs.chs;
  const { chaos } = cfgchs.chs;
  const { chndis } = cfgchs.chs;
  const { chndos } = cfgchs.chs;
  const { chnais } = cfgchs.chs;
  const { chnaos } = cfgchs.chs;
  const dimap = []; const domap = []; const aimap = []; const
    aomap = [];
  const ndimap = []; const ndomap = []; const naimap = []; const
    naomap = [];
  for (const tagname in cfgtags.tags) {
    const tag = cfgtags.tags[tagname];
    const chnum = tag.props.CHID;
    // тільки для локальних каналів
    if (tag.props.TYPE !== 'AI' && tag.props.TYPE !== 'DI' && tag.props.TYPE !== 'AO' && tag.props.TYPE !== 'DO' && tag.props.TYPE !== 'NAI' && tag.props.TYPE !== 'NDI' && tag.props.TYPE !== 'NAO' && tag.props.TYPE !== 'NDO') continue;
    if (chnum > 0) {
      const ch = {
        id: chnum,
        adr: tag.props.SRCADR, // адреса, напр IW200
        ch: tag.props.CH, // номер канала на модулі, напр 1
        type: tag.props.TYPE, // тип каналу в модулі
        subtype: tag.props.SUBTYPE, // позначення підтипу каналу, напр 4-20mA
        modid: tag.props.MODID, // повне позначення модуля, напр CJF01_A3AI
        dev: tag.props.DEV, // острів/пристрій, напр CJF01
        modnmb: tag.props.MODNMB || 0, // номер модуля в острові/пристрої, напр 1
        modalias: tag.props.MODNM, // коротке позначення модуля, напр A3
      };
      const chinmod = { // стрктура для мепінгу в модулі
        type: tag.props.TYPE, // тип каналу в модулі
        id: chnum, // ідентифікатор каналу
        ch: tag.props.CH || 0, // номер канала на модулі, напр 1-1
        modid: tag.props.MODID, // повне позначення модуля, напр CJF01_A3AI
      };
      // формування пристрою (острову) та модуля в ньому
      if (!cfgchs.devs[ch.dev]) cfgchs.devs[ch.dev] = {};
      const dev = cfgchs.devs[ch.dev];
      if (!dev[chinmod.modid]) {
        dev[chinmod.modid] = { dev: ch.dev, modnmb: ch.modnmb, modalias: ch.modalias };// {submdicnt:0, submdocnt:0, submaicnt:0, submaocnt:0, submodules:{}};
        cfgchs.chs.statistic.modulscnt++;
      }
      if (!cfgchs.moduls[chinmod.modid]) {
        cfgchs.moduls[chinmod.modid] = {
          chdis: [], chdos: [], chais: [], chaos: [], chndis: [], chndos: [], chnais: [], chnaos: [],
        };
      }
      const { statistic } = cfgchs.chs;
      const modul = cfgchs.moduls[chinmod.modid];
      switch (tag.props.TYPE) {
        case 'DI':
          chdis[chnum] = ch;
          if (chnum > statistic.dicnt) statistic.dicnt = chnum;
          if (modul.chdis[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chdis[chinmod.ch] = chinmod;
          }
          if (dimap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${dimap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            dimap[chnum] += `; ${tagname}`;
          } else {
            dimap[chnum] = tagname;
          }
          break;
        case 'DO':
          chdos[chnum] = ch;
          if (chnum > statistic.docnt) statistic.docnt = chnum;
          if (modul.chdos[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chdos[chinmod.ch] = chinmod;
          }
          if (domap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${domap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            domap[chnum] += `; ${tagname}`;
          } else {
            domap[chnum] = tagname;
          }
          break;
        case 'AI':
          chais[chnum] = ch;
          if (chnum > statistic.aicnt) statistic.aicnt = chnum;
          if (modul.chais[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chais[chinmod.ch] = chinmod;
          }
          if (aimap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aimap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            aimap[chnum] += `; ${tagname}`;
          } else {
            aimap[chnum] = tagname;
          }
          break;
        case 'AO':
          chaos[chnum] = ch;
          if (chnum > statistic.aocnt) statistic.aocnt = chnum;
          if (modul.chaos[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chaos[chinmod.ch] = chinmod;
          }
          if (aomap[chnum]) {
            logmsgar('Зведення загального переліку тегів', 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            aomap[chnum] += `; ${tagname}`;
          } else {
            aomap[chnum] = tagname;
          }
          break;
        // network variables
        case 'NDI':
          chndis[chnum] = ch;
          if (chnum > statistic.ndicnt) statistic.ndicnt = chnum;
          if (modul.chndis[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chndis[chinmod.ch] = chinmod;
          }
          if (ndimap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${ndimap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            ndimap[chnum] += `; ${tagname}`;
          } else {
            ndimap[chnum] = tagname;
          }
          break;
        case 'NDO':
          chndos[chnum] = ch;
          if (chnum > statistic.ndocnt) statistic.ndocnt = chnum;
          if (modul.chndos[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chndos[chinmod.ch] = chinmod;
          }
          if (ndomap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${ndomap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            ndomap[chnum] += `; ${tagname}`;
          } else {
            ndomap[chnum] = tagname;
          }
          break;
        case 'NAI':
          chnais[chnum] = ch;
          if (chnum > statistic.naicnt) statistic.naicnt = chnum;
          if (modul.chnais[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chnais[chinmod.ch] = chinmod;
          }
          if (naimap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${naimap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            naimap[chnum] += `; ${tagname}`;
          } else {
            naimap[chnum] = tagname;
          }
          break;
        case 'NAO':
          chnaos[chnum] = ch;
          if (chnum > statistic.naocnt) statistic.naocnt = chnum;
          if (modul.chnaos[chinmod.ch]) {
            logmsgar(`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
          } else {
            modul.chnaos[chinmod.ch] = chinmod;
          }
          if (naomap[chnum]) {
            logmsgar(`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${naomap[chnum]}`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
            naomap[chnum] += `; ${tagname}`;
          } else {
            naomap[chnum] = tagname;
          }
          break;

        default:
          break;
      }
    } else { // некоректний номер каналу
      logmsgar(`WRN: Змінна ${tagname} має некоректний номер каналу`, 1, 'master-chsmap_fromcfgfn', 'WRN', msgar);
    }
    // tag.chid chadr
  }
  chsmapfn(cfgchmap, chdis, dimap, 'di');
  chsmapfn(cfgchmap, chdos, domap, 'do');
  chsmapfn(cfgchmap, chais, aimap, 'ai');
  chsmapfn(cfgchmap, chaos, aomap, 'ao');
  chsmapfn(cfgchmap, chndis, ndimap, 'ndi');
  chsmapfn(cfgchmap, chndos, ndomap, 'ndo');
  chsmapfn(cfgchmap, chnais, naimap, 'nai');
  chsmapfn(cfgchmap, chnaos, naomap, 'nao');

  return (cfgchmap);
}

// формує загальну форму по формі ПЛК
function iomapplcform_togenform(chs) {
  const { plcform } = chs.iomapplc;
  if (!chs.iomapplc.genform) chs.iomapplc.genform = {};
  const { genform } = chs.iomapplc;
  for (plcformmod of plcform) {
    const modid = plcformmod.MODID;
    genform[modid] = { submodules: [] };
    const genformmod = genform[modid];
    for (let i = 0; i <= 3; i++) {
      genformmod.submodules[i] = {
        type: plcformmod.MODTYPE[i],
        // adrstart:plcformmod.MODTYPE[i],
        chcnt: parseInt(plcformmod.CHCNTS[i], 16) + 1,
      };
      if (genformmod.submodules[i].type === '0') genformmod.submodules[i].chcnt = 0;
    }
    genformmod.submodules[0].chidstart = parseInt(plcformmod.STRTNMB0);
    genformmod.submodules[1].chidstart = parseInt(plcformmod.STRTNMB1);
    genformmod.submodules[2].chidstart = parseInt(plcformmod.STRTNMB2);
    genformmod.submodules[3].chidstart = parseInt(plcformmod.STRTNMB3);
  }
  // console.log (genform)
}

function chsmapfn(chsmap, chs, tmpmap, chtype) {
  for (let i = 1; i < tmpmap.length; i++) {
    if (!chs[i]) {
      logmsgar(`WRN: Каналу ${chtype}${i} не існує, перевірте правильність задання кількості або номеру каналу`, 1, 'master-chsmapfn', 'WRN', msgar);
    } else if (tmpmap[i]) {
      if (!chs[i].links) chs[i].links = { tags: [] };
      chs[i].links.tags = tmpmap[i].split(';');
      chsmap[`${chtype}map`][i] = { tags: tmpmap[i], adr: chs[i].adr };
    } else {

    }
  }
}

// перетворення даних IOMAP в форму PACFramework
function iomaptoplcform(cfgchs) {
  const submodtypes = {
    0: '-',
    1: 'DI',
    2: 'DO',
    3: 'AI',
    4: 'AO',
    5: 'COM',
    6: 'NDI',
    7: 'NDO',
    8: 'NAI',
    9: 'NAO',
  };// 1- DICH, 2- DOCH, 3- AICH, 4 – AOCH
  const { chs } = cfgchs;
  const { moduls } = cfgchs;
  const iomap = cfgchs.iomapplc = { genform: {}, plcform: [] };
  // -------- формування мапи модулів у правильній послідовності
  const sortmodulenames = [];
  // сортування по девайсам
  const devnames = [];
  for (const devname in cfgchs.devs) {
    devnames.push(devname);
  }
  devnames.sort();

  for (const devname of devnames) {
    // console.log ('===================== Module ' + devname);
    const dev = cfgchs.devs[devname];
    // упорядковуємо по номеру модуля
    const modules = [];
    for (const modulename in dev) {
      const module = dev[modulename];
      if (modules[module.modnmb]) {
        logmsgar(`ERR: Модуль з назвою ${modulename} номером ${module.modnmb} в острові ${devname} вже існує з назвою ${modules[module.modnmb].modid}. Перевірте нумерацію модулів`, 1, 'master-iomaptoplcform', 'ERR', msgar);
      } else {
        modules[module.modnmb] = module;
        modules[module.modnmb].modid = modulename;
      }
    }
    for (const module of modules) {
      if (module) sortmodulenames.push(module.modid);
    }
  }

  for (modulename of sortmodulenames) {
    const module = moduls[modulename];
    const modulegenform = iomap.genform[modulename] = {};
    // канали можуть поичинатися не з 0, тому приводимо їх до канонічної форми, щоб рахувалися з 0 та не містили пустот
    const chdis = []; const chdos = []; const chais = []; const
      chaos = []; // приведені масиви
    const chndis = []; const chndos = []; const chnais = []; const
      chnaos = []; // приведені масиви

    for (ch of module.chdis) { if (typeof ch === 'object') chdis.push(ch); }
    for (ch of module.chais) { if (typeof ch === 'object') chais.push(ch); }
    for (ch of module.chdos) { if (typeof ch === 'object') chdos.push(ch); }
    for (ch of module.chaos) { if (typeof ch === 'object') chaos.push(ch); }
    for (ch of module.chndis) { if (typeof ch === 'object') chndis.push(ch); }
    for (ch of module.chnais) { if (typeof ch === 'object') chnais.push(ch); }
    for (ch of module.chndos) { if (typeof ch === 'object') chndos.push(ch); }
    for (ch of module.chnaos) { if (typeof ch === 'object') chnaos.push(ch); }

    modulegenform.submdicnt = Math.ceil(chdis.length / 16);
    modulegenform.submdocnt = Math.ceil(chdos.length / 16);
    modulegenform.submaicnt = Math.ceil(chais.length / 16);
    modulegenform.submaocnt = Math.ceil(chaos.length / 16);
    modulegenform.submndicnt = Math.ceil(chndis.length / 16);
    modulegenform.submndocnt = Math.ceil(chndos.length / 16);
    modulegenform.submnaicnt = Math.ceil(chnais.length / 16);
    modulegenform.submnaocnt = Math.ceil(chnaos.length / 16);

    modulegenform.submodules = [
      {
        type: '0', chidstart: 0, adrstart: 0, chcnt: 0,
      },
      {
        type: '0', chidstart: 0, adrstart: 0, chcnt: 0,
      },
      {
        type: '0', chidstart: 0, adrstart: 0, chcnt: 0,
      },
      {
        type: '0', chidstart: 0, adrstart: 0, chcnt: 0,
      },
    ];
    let nmbsubmodule = 0;
    for (let i = 0; i < modulegenform.submdicnt; i++) {
      if (!chdis[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chdis[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '1',
        chidstart,
        adrstart: chs.chdis[chidstart].adr,
        chcnt: i + 1 < modulegenform.submdicnt ? 16 : (chdis.length % 16 === 0) ? 16 : (chdis.length % 16),
      };
      nmbsubmodule++;
    }
    for (let i = 0; i < modulegenform.submdocnt; i++) {
      if (!chdos[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chdos[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '2',
        chidstart,
        adrstart: chs.chdos[chidstart].adr,
        chcnt: i + 1 < modulegenform.submdocnt ? 16 : (chdos.length % 16 === 0) ? 16 : (chdos.length % 16),
      };
      nmbsubmodule++;
    }
    for (let i = 0; i < modulegenform.submaicnt; i++) {
      if (!chais[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chais[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '3',
        chidstart,
        adrstart: chs.chais[chidstart].adr,
        chcnt: i + 1 < modulegenform.submaicnt ? 16 : (chais.length % 16 === 0) ? 16 : (chais.length % 16),
      };
      nmbsubmodule++;
    }
    for (let i = 0; i < modulegenform.submaocnt; i++) {
      if (!chaos[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chaos[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '4',
        chidstart,
        adrstart: chs.chaos[chidstart].adr,
        chcnt: i + 1 < modulegenform.submaocnt ? 16 : (chaos.length % 16 === 0) ? 16 : (chaos.length % 16),
      };
      nmbsubmodule++;
    }
    // network chs
    for (let i = 0; i < modulegenform.submndicnt; i++) {
      if (!chndis[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chndis[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '6',
        chidstart,
        adrstart: chs.chndis[chidstart].adr,
        chcnt: i + 1 < modulegenform.submndicnt ? 16 : (chndis.length % 16 === 0) ? 16 : (chndis.length % 16),
      };
      nmbsubmodule++;
    }
    for (let i = 0; i < modulegenform.submndocnt; i++) {
      if (!chndos[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chndos[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '7',
        chidstart,
        adrstart: chs.chndos[chidstart].adr,
        chcnt: i + 1 < modulegenform.submndocnt ? 16 : (chndos.length % 16 === 0) ? 16 : (chndos.length % 16),
      };
      nmbsubmodule++;
    }
    for (let i = 0; i < modulegenform.submnaicnt; i++) {
      if (!chnais[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chnais[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '8',
        chidstart,
        adrstart: chs.chnais[chidstart].adr,
        chcnt: i + 1 < modulegenform.submnaicnt ? 16 : (chnais.length % 16 === 0) ? 16 : (chnais.length % 16),
      };
      nmbsubmodule++;
    }
    for (let i = 0; i < modulegenform.submnaocnt; i++) {
      if (!chnaos[i * 16]) continue; // якщо є пропущені номери
      const chidstart = chnaos[i * 16].id;
      modulegenform.submodules[nmbsubmodule] = {
        type: '9',
        chidstart,
        adrstart: chs.chnaos[chidstart].adr,
        chcnt: i + 1 < modulegenform.submnaocnt ? 16 : (chnaos.length % 16 === 0) ? 16 : (chnaos.length % 16),
      };
      nmbsubmodule++;
    }

    // MODTYPE вказує в DB тип підмодулів в одному модулі, наприклад 1324; //1- DICH, 2- DOCH, 3- AICH, 4 – AOCH, 5 - COM
    // MODTYPE 1000 - це один підмодуль до 16 каналів 1- DICH
    // CHCNTS - d191 вказує на кількість каналів на кожен Submodule, комбінація в 16-ковому форматі - 1 (16#XYZQ) X - для першого субмодуля
    // CHCNTS - F000 вказує на 16 каналів у першому підмодулі
    const modulemap = {
      MODID: modulename,
      MODTYPE: modulegenform.submodules[0].type + modulegenform.submodules[1].type + modulegenform.submodules[2].type + modulegenform.submodules[3].type,
      MODTYPESTR: '',
      CHCNTS: `${(modulegenform.submodules[0].chcnt - 1).toString(16)}${(modulegenform.submodules[1].chcnt - 1).toString(16)}${(modulegenform.submodules[2].chcnt - 1).toString(16)}${(modulegenform.submodules[3].chcnt - 1).toString(16)}`,
      CHCNTSD: `${modulegenform.submodules[0].chcnt}-${modulegenform.submodules[1].chcnt}-${modulegenform.submodules[2].chcnt}-${modulegenform.submodules[3].chcnt}`,
      STRTNMB0: `${modulegenform.submodules[0].chidstart}`,
      STRTNMB1: `${modulegenform.submodules[1].chidstart}`,
      STRTNMB2: `${modulegenform.submodules[2].chidstart}`,
      STRTNMB3: `${modulegenform.submodules[3].chidstart}`,
      STATISTIC: '',
    };
    for (let i = 0; i < 4; i++) {
      if (modulegenform.submodules[i].type > 0) {
        modulemap.MODTYPESTR += `${submodtypes[modulegenform.submodules[i].type]}(${modulegenform.submodules[i].chidstart}..${modulegenform.submodules[i].chidstart + modulegenform.submodules[i].chcnt - 1}) `;
      }
    }
    modulemap.CHCNTS = modulemap.CHCNTS.replace(/-1/g, '0');
    modulemap.MODTYPESTR = modulemap.MODTYPESTR.replace(/-1/g, '0');
    iomap.plcform.push(modulemap);
  }
}

// отримує обєкт-список виконавчих механізмів за мастердата тегами та означеними типами
function getactrtsinfo(cfgtags, cfgtypes) {
  const { tags } = cfgtags;
  // let tagsjson = JSON.stringify (tags);
  const cfgacts = {
    types: cfgtypes, acttrs: {}, ids: {}, invalids: {},
  };
  const { acttrs } = cfgacts;
  // const acttrprops = masterdata.acttrprops;
  // const actIDs = masterdata.idinfo.acttrs;
  let actID = 0; // ідентифікатор ВМ
  logmsgar('Заповнюю інформацію ВМ з БД тегів', 1, 'master-getactrtsinfo', 'msg', msgar);
  for (const tagname in tags) {
    const tag = tags[tagname];
    const actname = tag.props.ACTTR;
    if (actname) {
      if (!acttrs[actname]) {
        acttrs[actname] = { name: actname };
        actID++;
        acttrs[actname].id = actID;
        acttrs[actname].links = { tags: {} };
        logmsgar(`Створив ВМ ${actname} з ID=${actID}`, 1, 'master-getactrtsinfo', 'msg', msgar);
      }
      const act = acttrs[actname];
      act.links.tags[tagname] = { id: tag.id };
      const tagnamear = tagname.split('_');
      const actnamear = actname.split('_');
      // перевірка на назву тегу з назвою ВМ
      if ((actnamear[0] !== tagnamear[0]) || (actnamear[1] !== tagnamear[1] && tagnamear[1][0] === 'A')) {
        logmsgar(`WRN: Нзва тегу ${tagname} не співвідноситься з ${actname}`, 1, 'master-getactrtsinfo', 'msg', msgar);
      }
      // встановлення опису ВМ з головної керівної назви
      if (!act.description && (tag.props.TYPE === 'AO' || tag.props.TYPE === 'DO' || tag.props.TYPE === 'NAO' || tag.props.TYPE === 'NDO')) { // кейс PACFramework
        let descr = tag.props.DESCRIPTION;
        const start = descr.search(/\(/); // за опис беремо все що до дужок
        descr = (start > 0) ? descr.substring(0, start) : descr;
        act.description = descr;
        logmsgar(`Встановив ${actname} назву ${descr}`, 1, 'master-getactrtsinfo', 'msg', msgar);
      }
      // тип ВМ
      if (tag.props.ACTTYPE && !act.type) {
        act.type = tag.props.ACTTYPE;
        logmsgar(`Встановив ${actname} тип ${act.type}`, 1, 'master-getactrtsinfo', 'msg', msgar);
      }
      // перевірка на співпадіння типів у комірці та ВМ
      if (tag.props.ACTTYPE !== act.type) {
        logmsgar(`ERR: Нзва типу ${tagname} (${tag.props.ACTTYPE}) не співпадає з ${actname} (${act.type})`, 1, 'master-getactrtsinfo', 'ERR', msgar);
      }
      // tag.props.SUBS для схема автоматизації, див стару реалізацію
      // встановлення часу відкриття актуатора
      if (tag.props.TOPN && !act.topn) {
        act.topn = tag.props.TOPN;
        logmsgar(`Встановив ${actname} час відкриття ${act.topn}`, 0, 'master-getactrtsinfo', 'msg', msgar);
      }
    }
  }
  logmsgar('Укомплектовую структуру ВМ', 1, 'master-getactrtsinfo', 'msg', msgar);
  for (const actname in acttrs) {
    const act = acttrs[actname];
    act.state = 'valid';
    const actnamear = actname.split('_');
    if (!act.type) {
      logmsgar(`ERR: Не задано тип для ${actname}, ВМ невалідний`, 1, 'master-getactrtsinfo', 'ERR', msgar);
      act.state = 'inv_notype';
    } else if (!cfgacts.types[act.type]) {
      logmsgar(`ERR: Не знайдено тип ${act.type} в списку типів для ${actname}, ВМ невалідний`, 1, 'master-getactrtsinfo', 'ERR', msgar);
      act.state = 'inv_typenotfound';
    } else {
      act.io = {};
      for (const ioname in cfgacts.types[act.type].io) { // по входам/виходам
        act.io[ioname] = '';
        const found = attrlinktag(cfgacts, act, ioname, false);
        if (found === true) {
          // записуємо перехресний лінк
          const foundtagname = act.io[ioname];
          if (!tags[foundtagname].links) tags[foundtagname].links = {};
          tags[foundtagname].links.act = `${actname}.${ioname}`;
          continue;
        } else {
          logmsgar(`WRN: ВМ ${actname} (${act.description}) - не знайдено змінну IO ${ioname}`, 1, 'master-getactrtsinfo', 'WRN', msgar);
          // пошук альтернативних змінних
          // шукаємо у всіх, у яких спільна 1-ша частина
          let found1 = false;
          for (const tagnamefind in tags) {
            if (!act.links.tags[tagnamefind] && tagnamefind.search(`${actnamear[0]}_`) >= 0) {
            // шукаємо по паттерну
              const tagnamear = tagnamefind.split('_');
              const { arnames } = cfgacts.types[act.type].io[ioname];
              for (const iosufix of arnames) { // по суфіксам
                const tagsufix = tagnamear[tagnamear.length - 1];
                if (tagsufix === iosufix || (tagsufix.search(iosufix) >= 0 && tagnamear.length === 2)) {
                  found1 = true;
                  logmsgar(`ATT: Схожий тег за паттерном ${tagnamefind} (${tags[tagnamefind].description})`, 0, 'master-getactrtsinfo', 'ATT', msgar);
                  break;
                }
              }
            }
          }
        }
      }
      // перевірки невикористаних тегів
      for (const tagname in act.links.tags) {
        if (!act.links.tags[tagname].role || act.links.tags[tagname].role.search('io') < 0) {
          logmsgar(`WRN: ВМ ${actname} - прив'язана змінна ${tagname} не використовується в IO`, 1, 'master-getactrtsinfo', 'WRN', msgar);
        }
      }
    }

    if (act.state === 'valid') {
      cfgacts.ids[act.id] = actname;
    } else {
      cfgacts.invalids[act.id] = actname;
    }
  }
  // пошук альтернативних тегів в якості ВМ, друга частина яких починається з A
  for (const tagname in tags) {
    const tag = tags[tagname];
    const artagname = tagname.split('_');
    if (artagname[1] && artagname[1][0] === 'A' && (!tag.links || !tag.links.act)) {
      logmsgar(`ATT: Знайдено змінну ${tagname} що потенційно може бути ВМ`, 0, 'master-tagsdif', 'ATT', msgar);
    }
  }
  return cfgacts;
}

// прив'язка act.io[ioname] до привязаних тегів act за шаблонами типу, якщо withoutlink=false
// повертає true якщо знайдено
function attrlinktag(cfgacts, act, ioname, withoutlink = false) {
  const { arnames } = cfgacts.types[act.type].io[ioname];
  let found = false;
  for (const iosufix of arnames) { // по суфіксам
    for (const tagname in act.links.tags) { // порівння з кожним привязаним тегом
      const tagnamear = tagname.split('_');
      const tagsufix = tagnamear[tagnamear.length - 1];
      if (tagsufix === iosufix || (tagsufix.search(iosufix) >= 0 && tagnamear.length === 2)) {
        if (withoutlink === false) {
          act.io[ioname] = tagname;
          act.links.tags[tagname].role = `io.${ioname}`;
        }
        found = true;
        break;
      }
    }
    if (found === true) continue;
  }
  return found;
}

// синхронізація нового об'єкту з мастерданими
function syncobs(masterob, newob, deleteoldfields = 0) {
  const obname = newob.name || newob.tagname;
  const changesob = {};
  let isnewobj = true;
  for (const fieldname in masterob) {
    isnewobj = false;
    break;
  }
  if (isnewobj === true) { // новий об'єкт
    changesob.new = true;
    logmsgar(`Добавлено новий об'єкт ${obname}`, 0, 'master-syncobs', 'msg', msgar);
    for (const fieldname in newob) {
      masterob[fieldname] = newob[fieldname];
    }
  } else { // змінено об'єкт
    // перебираємо нові властивості
    for (const fieldname in newob) {
      const newfield = newob[fieldname];// нове поле
      const oldfield = masterob[fieldname];// старе поле
      if (typeof masterob[fieldname] === 'undefined') { // властивість тільки з'явилася
        if (!changesob.addfields) changesob.addfields = [];
        changesob.addfields.push(fieldname);
        logmsgar(`Добавлена нова властивість ${fieldname} в об'єкті ${obname}`, 0, 'master-syncobs', 'msg', msgar);
        masterob[fieldname] = newob[fieldname];
      } else { // властивість була
        const jsonold = JSON.stringify(oldfield).toLowerCase();
        const jsonnew = JSON.stringify(newfield).toLowerCase();
        if (jsonold !== jsonnew) { // якщо знайдено зміни
          logmsgar(`Знайдено зміни в ${fieldname} в об'єкті ${obname}`, 0, 'master-syncobs', 'msg', msgar);
          const oldrecord = { [fieldname]: [] };
          if (!changesob.changedfrom) changesob.changedfrom = [];
          // перевірка на рівень нижче, якщо це об'єкти
          if (typeof newfield === 'object' && oldfield === 'object') {
            for (const includefiled in newfield) {
              const jsonoldi = JSON.stringify(oldfield[includefiled]).toLowerCase();
              const jsonnewi = JSON.stringify(newfield[includefiled]).toLowerCase();
              if (jsonoldi !== jsonnewi) {
                oldrecord[fieldname].push({ [includefiled]: oldfield[includefiled] });// добавляємо старі поля
                logmsgar(`Змінена властивість ${fieldname}.${includefiled} в об'єкті ${obname}, старе значення ${jsonoldi} нове значення ${jsonnewi}`, 0, 'master-syncobs', 'msg', msgar);
              }
            }
          } else {
            oldrecord[fieldname].push(oldfield);
            logmsgar(`Змінена властивість ${fieldname} в об'єкті ${obname}, старе значення ${jsonold} нове значення ${jsonnew}`, 0, 'master-tagsdif', 'msg', msgar);
          }
          changesob.changedfrom.push(oldrecord);// добавляємо старі поля
          masterob[fieldname] = newfield;
        }
      }
    }
    // видаляємо лишні поля, якщо була така опція
    if (deleteoldfields === 1) {
      for (const fieldname in masterob) {
        if (typeof newob[fieldname] === 'undefined') {
          if (!changesob.deletedfields) changesob.deletedfields = [];
          changesob.deletedfields.push(fieldname);
          delete masterob.fieldname;
          logmsgar(`Видалено властивість ${fieldname} об'єкту ${obname}`, 1, 'master-syncobs', 'msg', msgar);
        }
      }
    }
  }

  // добавлення іформації в поле мастерданих про зміни, якщо такі мають місце
  const changes = JSON.stringify(changesob);
  if (changes.length > 2) {
    masterob.lastchanged = {
      date: (new Date()).toLocaleString(),
      changes,
      source: opts.source,
    };
  }
}

// виведення повідомлення msg на консоль (при toconsole=1) та в msglog DEPRECATED
function logmsg(msg, toconsole = 1, lclmsglog = []) {
  const now = new Date();
  msg = `${now.toLocaleTimeString()}.${now.getMilliseconds()} ${msg}`;
  msglog += `${msg}\r\n`;
  if (toconsole === 1) console.log(msg);
  lclmsglog.push();
  return lclmsglog;
}

// виведення повідомлень в масив
function logmsgar(msg, toconsole = 1, topic = 'default', category = 'msg', msgar = []) {
  const now = new Date();
  if (toconsole === 1) console.log(`${now.toLocaleTimeString()}.${now.getMilliseconds()} ${msg}`);
  msgar.push({
    DT: now, msg, topic, category,
  });
  return msgar;
}

// виведення msglog в файл, при createnew = 1 - створюється новий файл DEPRECATED
function writetolog(createnew = 0) {
  const now = new Date();
  const logfile = `${opts.logpath}\\${opts.logfile}`;
  msglog = `===============${now}\n${msglog}`;
  if (fs.existsSync(path.dirname(logfile)) === false) {
    fs.mkdirSync(path.dirname(logfile));
    console.log(`Створив директорію ${path.dirname(logfile)}`);
  }
  if (createnew === 1) {
    fs.writeFileSync(logfile, msglog, 'utf8');
  } else {
    fs.appendFileSync(logfile, msglog, 'utf8');
  }
}

function writetologar(msgar, filename) {
  const now = new Date();
  if (fs.existsSync(path.dirname(filename)) === false) {
    fs.mkdirSync(path.dirname(filename));
  }
  filename += `${now.toLocaleString().replace(/[ ]/g, '_').replace(/[:.,]/g, '')}.log`;
  let msglog = '';
  for (const msg of msgar) {
    for (propname in msg) {
      const propval = msg[propname];
      if (propname == 'DT') {
        // msglog +=  propval.toLocaleTimeString() + '\t'
      } else {
        msglog += `${propval}\t`;
      }
    }
    msglog += '\n';
  }
  fs.writeFileSync(filename, msglog, 'utf8');
}

module.exports = {
  opts,
  msgar,
  syncobs,
  logmsg,
  logmsgar,
  writetolog,
  writetologar,
  getactrtsinfo,
  chsmap_fromplc,
  chsmap_fromcfgfn,
  iomaptoplcform,
  iomapplcform_togenform,
  tagsdif,
};
