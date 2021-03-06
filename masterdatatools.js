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
logmsg (msg, toconsole=1) - виведення повідомлення msg на консоль (при toconsole=1) та в msglog
writetolog (createnew = 0) - виведення msglog в файл, при createnew = 1 - створюється новий файл, перезаписуючи старий 
*/
const userdir = process.env.userprofile + '/pacframeworktools';
const path = require ('path');
const fs = require ('fs');
const opts = {
  inipath: './',
  logpath: 'log',
  logfile: 'general.log',
  source: 'undefined'
};
let msglog = '';
//порівняння мастердат plc та cfg
function tagsdif (plctags, cfgtags) {
  let difob = {listtagsinfo: {
    equal:{cnt:0, tags:{}},
    onlycfg:{cnt:0, tags:{}},
    onlyplc:{cnt:0, tags:{}},
  }};
  logmsg (`Зведення загального переліку тегів`);
  for (let tagname in plctags.tags) {
    let tags =  difob.listtagsinfo.onlyplc.tags;
    if  (plctags.tags[tagname].state === 'valid') {   
      difob.listtagsinfo.onlyplc.cnt ++;
      tags[tagname] =  {
        id: plctags.tags[tagname].id
      }
    }
  }
  for (let tagname in cfgtags.tags) {
    let tags =  difob.listtagsinfo.onlycfg.tags;
    if (!difob.listtagsinfo.onlyplc.tags[tagname]){
      difob.listtagsinfo.onlycfg.cnt ++;
      tags[tagname] =  {
        id: cfgtags.tags[tagname].id
      }
      logmsg (`Тег ${tagname} не знайдений в ПЛК`);
    } else {
      difob.listtagsinfo.equal.cnt ++;
      difob.listtagsinfo.equal.tags[tagname] =  {
        id: cfgtags.tags[tagname].id
      }
      delete difob.listtagsinfo.onlyplc.tags[tagname];
      difob.listtagsinfo.onlyplc.cnt --;        
    }
  }


  //console.log (difob); 
  return (difob)
}

//формує меппінг каналів і змінних з даних ПЛК
function chsmap_fromplc (plchs, plctags){
  let chsmap = {dimap:[], domap:[], aimap:[], aomap:[], ndimap:[], ndomap:[], naimap:[], naomap:[]}; 
  let chdis = plchs.chs.chdis, chdos = plchs.chs.chdos, chais = plchs.chs.chais, chaos = plchs.chs.chaos;
  let chndis = plchs.chs.chndis, chndos = plchs.chs.chndos, chnais = plchs.chs.chnais, chanos = plchs.chs.chanos;  
  let dimap = [], domap = [], aimap = [], aomap = [] ;
  for (let tagname in plctags.tags){
    let tag = plctags.tags[tagname];
    let chnum = parseInt (tag.chid); 
    if (chnum>0) {
      switch (tag.type) {
        case 'DI':
          if (dimap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${dimap[chnum]}`);
            dimap[chnum] += ';' + tagname;
          } else {
            dimap[chnum] = tagname;
          }
          break;
        case 'DO':
          if (domap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${domap[chnum]}`);
            domap[chnum] += ';' + tagname;
          } else {
            domap[chnum] = tagname;
          }
          break;
        case 'AI':
          if (aimap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aimap[chnum]}`);
            aimap[chnum] += ';' + tagname;
          } else {
            aimap[chnum] = tagname;
          }
          break;
        case 'AO':
          if (aomap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aomap[chnum]}`);
            aomap[chnum] += ';' + tagname;
          } else {
            aomap[chnum] = tagname;
          }
          break;                          
        default:
          break;
      }  
      
    } 
    //tag.chid chadr
  }
  
  chsmapfn (chsmap, chdis, dimap, 'di');
  chsmapfn (chsmap, chdos, domap, 'do');
  chsmapfn (chsmap, chais, aimap, 'ai');
  chsmapfn (chsmap, chaos, aomap, 'ao');      
  return (chsmap);
} 

//формує канали, меппінг каналів і змінних з даних CFG
function chsmap_fromcfgfn (cfgchs, cfgtags, chstype){
  let cfgchmap = {dimap:[], domap:[], aimap:[], aomap:[], ndimap:[], ndomap:[], naimap:[], naomap:[]}; 
  cfgchs.devs = {};
  cfgchs.moduls = {};
  cfgchs.chs = {
    types: chstype,
    statistic: {dicnt:0, docnt:0, aicnt:0, aocnt:0, modulscnt:0, ndicnt:0, ndocnt:0, naicnt:0, naocnt:0}, 
    chdis:{}, chdos:{}, chais:{}, chaos:{},chndis:{}, chndos:{}, chnais:{}, chnaos:{} 
  };
  let chdis = cfgchs.chs.chdis, chdos = cfgchs.chs.chdos, chais = cfgchs.chs.chais, chaos = cfgchs.chs.chaos;
  let chndis = cfgchs.chs.chndis, chndos = cfgchs.chs.chndos, chnais = cfgchs.chs.chnais, chnaos = cfgchs.chs.chnaos;
  let dimap = [], domap = [], aimap = [], aomap = [] ;
  let ndimap = [], ndomap = [], naimap = [], naomap = [] ;
  for (let tagname in cfgtags.tags){
    let tag = cfgtags.tags[tagname];
    let chnum = tag.props.CHID;
    //тільки для локальних каналів
    if (tag.props.TYPE !=='AI' && tag.props.TYPE !=='DI' && tag.props.TYPE !=='AO' && tag.props.TYPE !=='DO' && tag.props.TYPE !=='NAI' && tag.props.TYPE !=='NDI' && tag.props.TYPE !=='NAO' && tag.props.TYPE !=='NDO') continue 
    if (chnum>0) {
      let ch = {
        id:chnum, 
        adr:tag.props.SRCADR,//адреса, напр IW200
        ch: tag.props.CH, //номер канала на модулі, напр 1
        type: tag.props.TYPE,//тип каналу в модулі
        subtype: tag.props.SUBTYPE, //позначення підтипу каналу, напр 4-20mA                   
        modid: tag.props.MODID, //повне позначення модуля, напр CJF01_A3AI
        dev:tag.props.DEV,//острів/пристрій, напр CJF01
        modnmb:tag.props.MODNMB || 0, //номер модуля в острові/пристрої, напр 1
        modalias: tag.props.MODNM, //коротке позначення модуля, напр A3      
      };
      let chinmod = {//стрктура для мепінгу в модулі
        type: tag.props.TYPE,//тип каналу в модулі 
        id:chnum, //ідентифікатор каналу
        ch: tag.props.CH || 0, //номер канала на модулі, напр 1-1
        modid: tag.props.MODID, //повне позначення модуля, напр CJF01_A3AI
      };
      //формування пристрою (острову) та модуля в ньому
      if (!cfgchs.devs[ch.dev]) cfgchs.devs[ch.dev] = {};
      let dev =  cfgchs.devs[ch.dev];
      if (!dev[chinmod.modid]) {
        dev[chinmod.modid] = {dev:ch.dev, modnmb:ch.modnmb, modalias:ch.modalias};//{submdicnt:0, submdocnt:0, submaicnt:0, submaocnt:0, submodules:{}};
        cfgchs.chs.statistic.modulscnt++;
      };
      if (!cfgchs.moduls[chinmod.modid]) cfgchs.moduls[chinmod.modid]={chdis:[],chdos:[], chais:[], chaos:[], chndis:[],chndos:[], chnais:[], chnaos:[]};
      let statistic = cfgchs.chs.statistic;
      let modul = cfgchs.moduls[chinmod.modid]; 
      switch (tag.props.TYPE) {
        case 'DI':
          chdis[chnum] = ch;          
          if (chnum>statistic.dicnt) statistic.dicnt=chnum;   
          if (modul.chdis[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chdis[chinmod.ch] = chinmod;
          } 
          if (dimap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${dimap[chnum]}`);
            dimap[chnum] += '; ' + tagname;
          } else {
            dimap[chnum] = tagname;
          }
          break;
        case 'DO':
          chdos[chnum] = ch;
          if (chnum>statistic.docnt) statistic.docnt=chnum;             
          if (modul.chdos[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chdos[chinmod.ch] = chinmod;
          }         
          if (domap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${domap[chnum]}`);
            domap[chnum] += '; ' + tagname;
          } else {
            domap[chnum] = tagname;
          }
          break;
        case 'AI':       
          chais[chnum] = ch; 
          if (chnum>statistic.aicnt) statistic.aicnt=chnum;           
          if (modul.chais[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chais[chinmod.ch] = chinmod;
          }         
          if (aimap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aimap[chnum]}`);
            aimap[chnum] += '; ' + tagname;
          } else {
            aimap[chnum] = tagname;
          }
          break;
        case 'AO':
          chaos[chnum] = ch; 
          if (chnum>statistic.aocnt) statistic.aocnt=chnum; 
          if (modul.chaos[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chaos[chinmod.ch] = chinmod;
          }        
          if (aomap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${aomap[chnum]}`);
            aomap[chnum] += '; ' + tagname;
          } else {
            aomap[chnum] = tagname;
          }
          break;                          
        //network variables
        case 'NDI':
          chndis[chnum] = ch;          
          if (chnum>statistic.ndicnt) statistic.ndicnt=chnum;   
          if (modul.chndis[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chndis[chinmod.ch] = chinmod;
          } 
          if (ndimap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${ndimap[chnum]}`);
            ndimap[chnum] += '; ' + tagname;
          } else {
            ndimap[chnum] = tagname;
          }
          break;
        case 'NDO':
          chndos[chnum] = ch;
          if (chnum>statistic.ndocnt) statistic.ndocnt=chnum;             
          if (modul.chndos[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chndos[chinmod.ch] = chinmod;
          }         
          if (ndomap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${ndomap[chnum]}`);
            ndomap[chnum] += '; ' + tagname;
          } else {
            ndomap[chnum] = tagname;
          }
          break;
        case 'NAI':       
          chnais[chnum] = ch; 
          if (chnum>statistic.naicnt) statistic.naicnt=chnum;           
          if (modul.chnais[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chnais[chinmod.ch] = chinmod;
          }         
          if (naimap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${naimap[chnum]}`);
            naimap[chnum] += '; ' + tagname;
          } else {
            naimap[chnum] = tagname;
          }
          break;
        case 'NAO':
          chnaos[chnum] = ch; 
          if (chnum>statistic.naocnt) statistic.naocnt=chnum; 
          if (modul.chnaos[chinmod.ch]) {
            logmsg (`WRN: ${tagname} - канал ${chinmod.ch} на модулі ${chinmod.modid} вже зайнтяий іншою змінною`);
          } else { 
            modul.chnaos[chinmod.ch] = chinmod;
          }        
          if (naomap[chnum]) {
            logmsg (`WRN: Змінна ${tagname} має ту саму адресу каналу що і змінна ${naomap[chnum]}`);
            naomap[chnum] += '; ' + tagname;
          } else {
            naomap[chnum] = tagname;
          }
          break;                          
          
        default:
          break;
      }  
      
    } else { //некоректний номер каналу
      logmsg (`WRN: Змінна ${tagname} має некоректний номер каналу`);
    } 
    //tag.chid chadr
  }
  chsmapfn (cfgchmap, chdis, dimap, 'di');
  chsmapfn (cfgchmap, chdos, domap, 'do');
  chsmapfn (cfgchmap, chais, aimap, 'ai');
  chsmapfn (cfgchmap, chaos, aomap, 'ao');
  chsmapfn (cfgchmap, chndis, ndimap, 'ndi');
  chsmapfn (cfgchmap, chndos, ndomap, 'ndo');
  chsmapfn (cfgchmap, chnais, naimap, 'nai');
  chsmapfn (cfgchmap, chnaos, naomap, 'nao');

  return (cfgchmap);
} 

//формує загальну форму по формі ПЛК
function iomapplcform_togenform (chs) {
  let plcform = chs.iomapplc.plcform;
  if (!chs.iomapplc.genform) chs.iomapplc.genform = {};
  let genform = chs.iomapplc.genform;
  for (plcformmod of plcform) { 
    let modid = plcformmod.MODID;
    genform[modid] = {submodules:[]}
    let genformmod = genform[modid];
    for (let i=0; i<=3; i++){
      genformmod.submodules[i]={
      type : plcformmod.MODTYPE[i],
      //adrstart:plcformmod.MODTYPE[i],
      chcnt: parseInt(plcformmod.CHCNTS[i],16) + 1
      }
      if (genformmod.submodules[i].type === '0') genformmod.submodules[i].chcnt = 0
    }
    genformmod.submodules[0].chidstart = parseInt(plcformmod.STRTNMB0);
    genformmod.submodules[1].chidstart = parseInt(plcformmod.STRTNMB1);
    genformmod.submodules[2].chidstart = parseInt(plcformmod.STRTNMB2);
    genformmod.submodules[3].chidstart = parseInt(plcformmod.STRTNMB3);    
  }
  //console.log (genform)
}

function chsmapfn (chsmap, chs, tmpmap, chtype) {
  for (let i=1; i<tmpmap.length; i++) {
    if (!chs[i]) {
      logmsg (`WRN: Каналу ${chtype}${i} не існує, перевірте правильність задання кількості або номеру каналу`);
    } else if (tmpmap[i]){
      if (!chs[i].links) chs[i].links = {tags:[]};
      chs[i].links.tags = tmpmap[i].split (';'); 
      chsmap[chtype + 'map'][i] = {tags: tmpmap[i],  adr:  chs[i].adr}
    } else {
      ;
    }
  }
}

//перетворення даних IOMAP в форму PACFramework
function iomaptoplcform (cfgchs) {
  const submodtypes = {'0':'-','1':'DI','2':'DO','3':'AI','4':'AO', '5': 'COM',
  '6':'NDI','7':'NDO','8':'NAI','9':'NAO',
  };//1- DICH, 2- DOCH, 3- AICH, 4 – AOCH
  const chs = cfgchs.chs;
  const moduls = cfgchs.moduls;
  const iomap = cfgchs.iomapplc = {genform:{}, plcform : []};
  //-------- формування мапи модулів у правильній послідовності
  let sortmodulenames = []; 
  //сортування по девайсам
  let devnames = []; 
  for (let devname in cfgchs.devs) {
    devnames.push (devname);
  }
  devnames.sort();

  for (let devname of devnames) {
    //console.log ('===================== Module ' + devname);
    let dev = cfgchs.devs[devname];
    //упорядковуємо по номеру модуля
    let modules = [];
    for (let modulename in dev) {
      let module = dev [modulename];
      if (modules[module.modnmb]) {
        logmsg(`ERR: Модуль з назвою ${modulename} номером ${module.modnmb} в острові ${devname} вже існує з назвою ${modules[module.modnmb].modid}. Перевірте нумерацію модулів`)
      } else {
        modules[module.modnmb] = module;
        modules[module.modnmb].modid = modulename;
      } 
    }
    for (let module of modules) {
      if (module) sortmodulenames.push (module.modid);
    }
  }

  for (modulename of sortmodulenames){
    let module = moduls[modulename];
    let modulegenform = iomap.genform [modulename] = {};
    //канали можуть поичинатися не з 0, тому приводимо їх до канонічної форми, щоб рахувалися з 0 та не містили пустот
    let chdis =[], chdos=[], chais=[], chaos=[]; //приведені масиви
    let chndis =[], chndos=[], chnais=[], chnaos=[]; //приведені масиви

    for (ch of module.chdis) {if (typeof ch === 'object') chdis.push (ch)}
    for (ch of module.chais) {if (typeof ch === 'object') chais.push (ch)}
    for (ch of module.chdos) {if (typeof ch === 'object') chdos.push (ch)}
    for (ch of module.chaos) {if (typeof ch === 'object') chaos.push (ch)}        
    for (ch of module.chndis) {if (typeof ch === 'object') chndis.push (ch)}
    for (ch of module.chnais) {if (typeof ch === 'object') chnais.push (ch)}
    for (ch of module.chndos) {if (typeof ch === 'object') chndos.push (ch)}
    for (ch of module.chnaos) {if (typeof ch === 'object') chnaos.push (ch)}        

    modulegenform.submdicnt = Math.ceil(chdis.length/16);
    modulegenform.submdocnt = Math.ceil(chdos.length/16);
    modulegenform.submaicnt = Math.ceil(chais.length/16);
    modulegenform.submaocnt = Math.ceil(chaos.length/16);
    modulegenform.submndicnt = Math.ceil(chndis.length/16);
    modulegenform.submndocnt = Math.ceil(chndos.length/16);
    modulegenform.submnaicnt = Math.ceil(chnais.length/16);
    modulegenform.submnaocnt = Math.ceil(chnaos.length/16);

    modulegenform.submodules = [
      {type:'0', chidstart:0, adrstart:0,chcnt:0},
      {type:'0', chidstart:0, adrstart:0,chcnt:0},
      {type:'0', chidstart:0, adrstart:0,chcnt:0},
      {type:'0', chidstart:0, adrstart:0,chcnt:0}
    ];
    let nmbsubmodule = 0;
    for (let i=0; i<modulegenform.submdicnt; i++) {
      if (!chdis[i*16]) continue; //якщо є пропущені номери
      let chidstart = chdis[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'1', 
        chidstart :  chidstart, 
        adrstart: chs.chdis[chidstart].adr, 
        chcnt: i+1<modulegenform.submdicnt ? 16 : (chdis.length % 16 === 0 ) ? 16: (chdis.length % 16)};
      nmbsubmodule ++; 
    } 
    for (let i=0; i<modulegenform.submdocnt; i++) {
      if (!chdos[i*16]) continue; //якщо є пропущені номери
      let chidstart = chdos[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'2', 
        chidstart : chidstart, 
        adrstart: chs.chdos[chidstart].adr, 
        chcnt: i+1<modulegenform.submdocnt ? 16 : (chdos.length % 16 === 0) ? 16: (chdos.length % 16)};
      nmbsubmodule ++; 
    } 
    for (let i=0; i<modulegenform.submaicnt; i++) {
      if (!chais[i*16]) continue; //якщо є пропущені номери
      let chidstart = chais[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'3', 
        chidstart :  chidstart, 
        adrstart: chs.chais[chidstart].adr, 
        chcnt: i+1<modulegenform.submaicnt ? 16 : (chais.length % 16 === 0) ? 16: (chais.length % 16)};
      nmbsubmodule ++; 
    } 
    for (let i=0; i<modulegenform.submaocnt; i++) {
      if (!chaos[i*16]) continue; //якщо є пропущені номери
      let chidstart = chaos[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'4', 
        chidstart :  chidstart, 
        adrstart: chs.chaos[chidstart].adr, 
        chcnt: i+1<modulegenform.submaocnt ? 16 : (chaos.length % 16 === 0) ? 16: (chaos.length % 16)};
      nmbsubmodule ++; 
    }
    //network chs
    for (let i=0; i<modulegenform.submndicnt; i++) {
      if (!chndis[i*16]) continue; //якщо є пропущені номери
      let chidstart = chndis[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'6', 
        chidstart :  chidstart, 
        adrstart: chs.chndis[chidstart].adr, 
        chcnt: i+1<modulegenform.submndicnt ? 16 : (chndis.length % 16 === 0) ? 16: (chndis.length % 16)};
      nmbsubmodule ++; 
    } 
    for (let i=0; i<modulegenform.submndocnt; i++) {
      if (!chndos[i*16]) continue; //якщо є пропущені номери
      let chidstart = chndos[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'7', 
        chidstart : chidstart, 
        adrstart: chs.chndos[chidstart].adr, 
        chcnt: i+1<modulegenform.submndocnt ? 16 : (chndos.length % 16 === 0) ? 16: (chndos.length % 16)};
      nmbsubmodule ++; 
    } 
    for (let i=0; i<modulegenform.submnaicnt; i++) {
      if (!chnais[i*16]) continue; //якщо є пропущені номери
      let chidstart = chnais[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'8', 
        chidstart :  chidstart, 
        adrstart: chs.chnais[chidstart].adr, 
        chcnt: i+1<modulegenform.submnaicnt ? 16 : (chnais.length % 16 === 0) ? 16: (chnais.length % 16)};
      nmbsubmodule ++; 
    } 
    for (let i=0; i<modulegenform.submnaocnt; i++) {
      if (!chnaos[i*16]) continue; //якщо є пропущені номери
      let chidstart = chnaos[i*16].id;  
      modulegenform.submodules [nmbsubmodule] = {
        type:'9', 
        chidstart :  chidstart, 
        adrstart: chs.chnaos[chidstart].adr, 
        chcnt: i+1<modulegenform.submnaocnt ? 16 : (chnaos.length % 16 === 0) ? 16: (chnaos.length % 16)};
      nmbsubmodule ++; 
    }

    //MODTYPE вказує в DB тип підмодулів в одному модулі, наприклад 1324; //1- DICH, 2- DOCH, 3- AICH, 4 – AOCH, 5 - COM
    //MODTYPE 1000 - це один підмодуль до 16 каналів 1- DICH
    //CHCNTS - d191 вказує на кількість каналів на кожен Submodule, комбінація в 16-ковому форматі - 1 (16#XYZQ) X - для першого субмодуля 
    //CHCNTS - F000 вказує на 16 каналів у першому підмодулі
    let modulemap = {
      MODID : modulename,
      MODTYPE:  modulegenform.submodules[0].type + modulegenform.submodules[1].type + modulegenform.submodules[2].type + modulegenform.submodules[3].type,
      MODTYPESTR: '',
      CHCNTS:`${(modulegenform.submodules[0].chcnt-1).toString(16)}${(modulegenform.submodules[1].chcnt-1).toString(16)}${(modulegenform.submodules[2].chcnt-1).toString(16)}${(modulegenform.submodules[3].chcnt-1).toString(16)}`,
      CHCNTSD: `${modulegenform.submodules[0].chcnt}-${modulegenform.submodules[1].chcnt}-${modulegenform.submodules[2].chcnt}-${modulegenform.submodules[3].chcnt}`,
      STRTNMB0: `${modulegenform.submodules[0].chidstart}`,
      STRTNMB1: `${modulegenform.submodules[1].chidstart}`,
      STRTNMB2: `${modulegenform.submodules[2].chidstart}`,
      STRTNMB3: `${modulegenform.submodules[3].chidstart}`,
      STATISTIC: ''  
    };
    for (let i=0; i<4; i++) {
      if (modulegenform.submodules[i].type>0) { 
      modulemap.MODTYPESTR += `${submodtypes[modulegenform.submodules[i].type]}(${modulegenform.submodules[i].chidstart}..${modulegenform.submodules[i].chidstart+modulegenform.submodules[i].chcnt-1}) `
      }
    }  
    modulemap.CHCNTS = modulemap.CHCNTS.replace(/-1/g,'0');  
    modulemap.MODTYPESTR = modulemap.MODTYPESTR.replace(/-1/g,'0');
    iomap.plcform.push (modulemap);   
  }
} 

//отримує обєкт-список виконавчих механізмів за мастердата тегами та означеними типами 
function getactrtsinfo (cfgtags, cfgtypes) {
  let tags = cfgtags.tags;
  //let tagsjson = JSON.stringify (tags); 
  const cfgacts = {types: cfgtypes, acttrs:{}, ids:{}, invalids: {}}; 
  const acttrs = cfgacts.acttrs;
  //const acttrprops = masterdata.acttrprops;
  //const actIDs = masterdata.idinfo.acttrs; 
  let actID = 0; //ідентифікатор ВМ 
  logmsg ('Заповнюю інформацію ВМ з БД тегів', 1); 
  for (let tagname in tags) {
    let tag = tags[tagname];
    let actname = tag.props.ACTTR;
    if (actname) {
      if (!acttrs[actname]) {
        acttrs[actname] = {name:actname};
        actID ++;
        acttrs[actname].id = actID;
        acttrs[actname].links = {tags:{}};
        logmsg (`Створив ВМ ${actname} з ID=${actID}`, 0); 
      } 
      let act = acttrs[actname];
      act.links.tags[tagname] = {id:tag.id};  
      let tagnamear = tagname.split ('_');
      let actnamear = actname.split('_');
      //перевірка на назву тегу з назвою ВМ
      if ((actnamear[0] !== tagnamear[0]) || (actnamear[1] !== tagnamear[1] && tagnamear[1][0]=== 'A')) {
        logmsg (`WRN: Нзва тегу ${tagname} не співвідноситься з ${actname}`, 0);         
      }
      //встановлення опису ВМ з головної керівної назви 
      if (!act.description && tagnamear[1] && tagnamear[1][0]==='A') { //друге слово починається з A - кейс Енікон
        let descr = tag.props.DESCRIPTION;
        let start = descr.search (/\(/); //за опис беремо все що до дужок 
        descr = (start > 0)? descr.substring (0, start): descr ; 
        act.description = descr;
        logmsg (`Встановив ${actname} назву ${descr}`, 0); 
      } else if (!act.description && (tag.props.TYPE==='AO' || tag.props.TYPE==='DO' || tag.props.TYPE==='NAO' || tag.props.TYPE==='NDO')) { //кейс PACFramework
        let descr = tag.props.DESCRIPTION;
        let start = descr.search (/\(/); //за опис беремо все що до дужок 
        descr = (start > 0)? descr.substring (0, start): descr ; 
        act.description = descr;
        logmsg (`Встановив ${actname} назву ${descr}`, 0); 
      } 
      //тип ВМ
      if (tag.props.ACTTYPE && !act.type) {
        act.type = tag.props.ACTTYPE;
        logmsg (`Встановив ${actname} тип ${act.type}`, 0); 
      }
      //перевірка на співпадіння типів у комірці та ВМ
      if (tag.props.ACTTYPE !== act.type) {
        logmsg (`ERR: Нзва типу ${tagname} (${tag.props.ACTTYPE}) не співпадає з ${actname} (${act.type})`, 1);           
      }   
      //tag.props.SUBS для схема автоматизації, див стару реалізацію      
      //встановлення часу відкриття актуатора
      if (tag.props.TOPN && !act.topn) {
        act.topn = tag.props.TOPN;
        logmsg (`Встановив ${actname} час відкриття ${act.topn}`, 0); 
      }
    }
  }
  logmsg ('Укомплектовую структуру ВМ', 1); 
  for (let actname in acttrs) {
    let act =  acttrs[actname];
    act.state = 'valid';
    let actnamear = actname.split('_');     
    if (!act.type) {
      logmsg (`ERR: Не задано тип для ${actname}, ВМ невалідний`, 1)      
      act.state = 'inv_notype';
    } else if (!cfgacts.types[act.type]) {
      logmsg (`ERR: Не знайдено тип ${act.type} в списку типів для ${actname}, ВМ невалідний`, 1)      
      act.state = 'inv_typenotfound'; 
    } else {
      act.io = {};
      for (let ioname in cfgacts.types[act.type].io) { //по входам/виходам
        act.io[ioname] = '';
        let found = attrlinktag (cfgacts, act, ioname, false);
        if (found === true) {
          //записуємо перехресний лінк
          let foundtagname = act.io[ioname];
          if (!tags[foundtagname].links) tags[foundtagname].links ={}
          tags[foundtagname].links.act = actname + '.' + ioname;    
          continue  
        } else {
          logmsg (`WRN: ВМ ${actname} (${act.description}) - не знайдено змінну IO ${ioname}`, 0)
          //пошук альтернативних змінних
          //шукаємо у всіх, у яких спільна 1-ша частина
          let found1=false;
          for (let tagnamefind in tags)
            if (!act.links.tags[tagnamefind] && tagnamefind.search (actnamear[0]+'_')>=0) {
              //шукаємо по паттерну
              let tagnamear = tagnamefind.split ('_');
              let arnames = cfgacts.types[act.type].io[ioname].arnames;
              for (let iosufix of arnames) { //по суфіксам
                let tagsufix = tagnamear[tagnamear.length-1];               
                if (tagsufix === iosufix || (tagsufix.search(iosufix)>=0 && tagnamear.length === 2) ) {
                  found1 = true
                  logmsg (`-> Схожий тег за паттерном ${tagnamefind} (${tags[tagnamefind].description})`, 0)
                  break
                }                  
              }                  
            }                       
        }
      }
      //перевірки невикористаних тегів
      for (let tagname in act.links.tags){
        if (!act.links.tags[tagname].role || act.links.tags[tagname].role.search('io')<0) {
          logmsg (`WRN: ВМ ${actname} - прив'язана змінна ${tagname} не використовується в IO`, 1)    
        }
      }  
    }

    if (act.state === 'valid') {
      cfgacts.ids[act.id] = actname
    } else {
      cfgacts.invalids[act.id] = actname   
    }

    //logmsg ('Записую перехресні звязки на ВМ у теги', 1);
     
  } 
  //пошук альтернативних тегів в якості ВМ, друга частина яких починається з A
  for (let tagname in tags) {
    let tag = tags[tagname];
    let artagname = tagname.split ('_'); 
    if (artagname[1] && artagname[1][0] === 'A' && (!tag.links || !tag.links.act)) {
      logmsg (`WRN: Знайдено змінну ${tagname} що потенційно може бути ВМ`, 0)        
    }
  }  
  return cfgacts
}

//прив'язка act.io[ioname] до привязаних тегів act за шаблонами типу, якщо withoutlink=false  
//повертає true якщо знайдено 
function attrlinktag (cfgacts, act, ioname, withoutlink = false) {
  let arnames = cfgacts.types[act.type].io[ioname].arnames;
  let found = false; 
  for (let iosufix of arnames) { //по суфіксам
    for (let tagname in act.links.tags){//порівння з кожним привязаним тегом 
      let tagnamear = tagname.split ('_');
      let tagsufix = tagnamear[tagnamear.length-1];               
      if (tagsufix === iosufix || (tagsufix.search(iosufix)>=0 && tagnamear.length === 2) ) {
        if (withoutlink === false) {  
          act.io[ioname] = tagname;
          act.links.tags[tagname].role = 'io.' + ioname;
        }
        found = true
        break
      }  
    }
    if (found === true) continue  
  }
  return found
} 

//синхронізація нового об'єкту з мастерданими 
function syncobs (masterob, newob, deleteoldfields = 0) {
  let obname = newob.name || newob.tagname; 
  let changesob = {};
  let isnewobj = true;
  for (let fieldname in masterob) {
    isnewobj = false;
    break 
  }
  if (isnewobj===true) { //новий об'єкт
    changesob.new = true;
    logmsg (`Добавлено новий об'єкт ${obname}`,0);
    for (let fieldname in newob) {
      masterob[fieldname] = newob[fieldname];
    }   
  } else { //змінено об'єкт
    //перебираємо нові властивості
    //logmsg (`Шукаю змінені властивості в об'єкті ${obname}`,0);
    for (let fieldname in newob) {
      let newfield = newob[fieldname];//нове поле
      let oldfield = masterob[fieldname];//старе поле
      //logmsg (JSON.stringify(newob[fieldname]) ,0)
      if (typeof masterob[fieldname] === 'undefined' ) { //властивість тільки з'явилася
        if (!changesob.addfields) changesob.addfields = [];  
        changesob.addfields.push (fieldname);
        logmsg (`Добавлена нова властивість ${fieldname} в об'єкті ${obname}`,0);
        masterob[fieldname] = newob[fieldname]
      } else {                                          //властивість була
        let jsonold = JSON.stringify(oldfield).toLowerCase();
        let jsonnew = JSON.stringify(newfield).toLowerCase();
        if ( jsonold !== jsonnew) {                   //якщо знайдено зміни
          logmsg (`Знайдено зміни в ${fieldname} в об'єкті ${obname}`,0);
          let oldrecord = {[fieldname]:[]};
          if (!changesob.changedfrom) changesob.changedfrom = [];
          //перевірка на рівень нижче, якщо це об'єкти
          if (typeof newfield === 'object' && oldfield === 'object') {
            for (let includefiled in newfield) {
                let jsonoldi = JSON.stringify(oldfield[includefiled]).toLowerCase();
                let jsonnewi = JSON.stringify(newfield[includefiled]).toLowerCase();
              if ( jsonoldi !== jsonnewi) {
                oldrecord[fieldname].push ({[includefiled]:oldfield[includefiled]});//добавляємо старі поля
                logmsg (`Змінена властивість ${fieldname}.${includefiled} в об'єкті ${obname}, старе значення ${jsonoldi} нове значення ${jsonnewi}`, 0);                
              }
            } 
          } else {
            oldrecord[fieldname].push (oldfield);
            logmsg (`Змінена властивість ${fieldname} в об'єкті ${obname}, старе значення ${jsonold} нове значення ${jsonnew}`, 0);
          }
          changesob.changedfrom.push (oldrecord);//добавляємо старі поля     
          masterob[fieldname] = newfield
        } 
      }  
    }
    //видаляємо лишні поля, якщо була така опція
    if (deleteoldfields === 1) {
      for (let fieldname in masterob) {
        if (typeof newob[fieldname] === 'undefined') {
          if (!changesob.deletedfields) changesob.deletedfields = [];
          changesob.deletedfields.push (fieldname);
          delete masterob.fieldname;
          logmsg (`Видалено властивість ${fieldname} об'єкту ${obname}`);
        } 
      }      
    }
  }

  //добавлення іформації в поле мастерданих про зміни, якщо такі мають місце
  let changes = JSON.stringify(changesob);
  if (changes.length>2) {
    masterob.lastchanged = {
      date: (new Date()).toLocaleString(),
      changes: changes,
      source: opts.source
    }  
  } 
}

//виведення повідомлення msg на консоль (при toconsole=1) та в msglog 
function logmsg (msg, toconsole=1) {
  let now = new Date ();
  msg = now.toLocaleTimeString() + '.' + now.getMilliseconds() + ' ' + msg;
  msglog += msg  + '\r\n'; 
  if (toconsole===1) console.log (msg);
}
//виведення msglog в файл, при createnew = 1 - створюється новий файл 
function writetolog (createnew = 0) {
  let now = new Date ();
  let logfile = opts.logpath + '\\' + opts.logfile;
  msglog = '===============' + now + '\n' + msglog;
  if  (fs.existsSync(path.dirname(logfile)) === false) {
    fs.mkdirSync (path.dirname(logfile));
    console.log ('Створив директорію ' + path.dirname(logfile));  
  } 
  if (createnew===1) {
    fs.writeFileSync (logfile, msglog, 'utf8');
  } else {
    fs.appendFileSync (logfile, msglog, 'utf8');
  }
}




module.exports = {
  opts, 
  syncobs, logmsg, writetolog,
  getactrtsinfo, chsmap_fromplc, chsmap_fromcfgfn,
  iomaptoplcform, iomapplcform_togenform, 
  tagsdif
};
