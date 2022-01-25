const fs = require ('fs');
const path = require ('path');
const mdtools = require ('./mdtools.js');
const masterdatattools = require('./masterdatatools');
const { exec, execSync } = require('child_process');

//скорочені назви функцій
const logmsg = masterdatattools.logmsg;

const opts = {
  pathresultmd: 'reports',
  pathresultdocx: 'reports'
};

//формує звіт по властовстям ВМ у проекті
function repactuators (cfgacts, onlymd = true) {
  const acttrsbytype = {};
  const acttrtypes = [];  
  const reppath = opts.pathresultmd + '/' + 'acttrrep';
  //групування ВМ по підтипу
  for (acttrname in cfgacts.acttrs) {
    let act = cfgacts.acttrs [acttrname]; 
    if (!acttrsbytype[act.type]) {
      acttrsbytype[act.type] = [];
    }
    acttrsbytype[act.type].push (act);   
  }

  for (acttypename in acttrsbytype) {
    let mdtext = '# Перелік властивостей виконавчих механізмів \n\n'; 
    let acttrs = acttrsbytype[acttypename];
    let typedescr =  cfgacts.types[acttypename]? cfgacts.types[acttypename].typedescr: '';
    mdtext += '## Тип ' + acttypename + ' (' + typedescr + ')' + '\n\n' 
    mdtext += '### Опис типу ' + '\n\n' 
    for (let lnkname in cfgacts.types[acttypename].io){ 
      let io = cfgacts.types[acttypename].io[lnkname]; 
      mdtext += '**' + lnkname + '** (' + io.type + ') - ' +  io.description +  '\n'
    }
    mdtext += '### Змінні' + '\n\n'     
    let tab = {
      header: ['Назва', 'Змінні'], 
      rows: []
    }
    let i=0;
    for (acttr of acttrs) {
      tab.rows[i]= [];
      tab.rows[i].push (acttr.name + '    <br/>' + acttr.description);  
      let col = ''; 
      for (let lnkname in acttr.io) {
        col += '**'+lnkname + '**' +  ':' + acttr.io[lnkname] + '    <br/>';
      }
      //пошук непривязаних змінних
      let foundnotlink = false; 
      for (let tagname in acttr.links.tags) {
        if (!acttr.links.tags[tagname].role) {
          if (foundnotlink === false) col += '**Відсутні привязки в наступних тегах:**    <br/>';
          col += tagname + '    <br/>';
          foundnotlink = true;
        }
      }  
      tab.rows [i].push (col);
      let txt = ''
/*       if (typeof(acttr.fsas) === 'object') {
        for (filename of acttr.fsas) {
          txt += `![${acttr.name}](${path.resolve (filename)}) `;
        } 
      } else {
        txt = 'not found'
      } 
      tab.rows [i].push (txt);
      txt = '';    */    
      /*
      if (acttr.specific) {//якщо є специфіація 
        for (spec of acttr.specific) {
          txt += spec.descr + ' - ' + spec.vendor + '<br/>';
        }
      }
      */
      //tab.rows [i].push (txt);     
      //console.log (acttr.name)
      i++;
    }
    let mdtab = mdtools.createmdtable (tab);
    mdtext += mdtab;
    if (!fs.existsSync(path.dirname(`${reppath}acttrs_${acttypename}.md`))) {
      fs.mkdirSync(path.dirname(`${reppath}acttrs_${acttypename}.md`))
    }  
    fs.writeFileSync (`${reppath}acttrs_${acttypename}.md`, mdtext, 'utf-8')
    if (onlymd === false) { 
      let cmd = `pandoc -s ${reppath}acttrs_${acttypename}.md -o ${reppath}acttrs_${acttypename}.docx`;
      //console.log (cmd);
      exec(cmd);
      logmsg (`Сфоромвано Файл ${reppath}acttrs_${acttypename}.docx`);
    }
  }
  
}

//формує звіт по використаним каналам
function repacchscfg (cfgchs, cfgtags) {
  const reppath = opts.pathresultmd + '/' + 'chrep';
  let mdtext = `# Звіт про прив'язку змінних до входів/виходів\n\n`;
  mdtext += `Звіт згенеровано ${(new Date).toLocaleString()}\n\n`;
  for (let devname in cfgchs.devs) {
    mdtext += '## ----- Острів ' + devname + '\n\n'
    for (let modulename in cfgchs.devs[devname]) {
      let module = cfgchs.moduls[modulename];
      mdtext += '### Модуль ' + modulename + '\n\n';      
      let tab = {
        header: ['Канал на модулі', 'Лог.канал', `Прив'язана змінна`, 'Примітка'], 
        rows: []
      }
      let j=0;

      let chdilen = (module.chdis && module.chdis.length) || 0;//кількість каналів на модулі
      let chdolen = (module.chdos && module.chdos.length) || 0;//кількість каналів на модулі
      let chailen = (module.chais && module.chais.length) || 0;//кількість каналів на модулі
      let chaolen = (module.chaos && module.chaos.length) || 0;//кількість каналів на модулі

      for (let i=0; i<chdilen;i++) {
        if (module.chdis[i]) {
          ch = cfgchs.chs.chdis[module.chdis[i].id];
        } else {
          continue
        }
        tab.rows[j]= [];
        tab.rows[j].push (i.toString());
        tab.rows[j].push ('DI' + ch.id);
        onechreport (tab, ch, cfgtags, j);
        j++
      }
      for (let i=0; i<chdolen;i++) {
        if (module.chdos[i]) {
          ch = cfgchs.chs.chdos[module.chdos[i].id];
        } else {
          continue
        }
        tab.rows[j]= [];
        tab.rows[j].push (i.toString());
        tab.rows[j].push ('DO' + ch.id);
        onechreport (tab, ch, cfgtags, j);
        j++
      }
      for (let i=0; i<chailen;i++) {
        if (module.chais[i]) {
          ch = cfgchs.chs.chais[module.chais[i].id];
        } else {
          continue
        }
        tab.rows[j]= [];
        tab.rows[j].push (i.toString());
        tab.rows[j].push ('AI' + ch.id);
        onechreport (tab, ch, cfgtags, j);
        j++
      }
      for (let i=0; i<chaolen;i++) {
        if (module.chaos[i]) {
          ch = cfgchs.chs.chaos[module.chaos[i].id];
        } else {
          continue
        }
        tab.rows[j]= [];
        tab.rows[j].push (i.toString());
        tab.rows[j].push ('AO' + ch.id);
        onechreport (tab, ch, cfgtags, j);
        j++
      }                
      //console.log (tab);
      let mdtab = mdtools.createmdtable (tab);
      mdtext += mdtab;
    }
  }
  if (!fs.existsSync(opts.pathresultmd)) {
    fs.mkdirSync(opts.pathresultmd)
  } 
  fs.writeFileSync (`${reppath}.md`, mdtext, 'utf-8');
}

function onechreport (tab, ch, cfgtags, j) {
  if (ch.links && ch.links.tags && ch.links.tags.length>0) {
    let txt ='';
    for (tagname of ch.links.tags){
      let tag = cfgtags.tags[tagname.trim()];
      txt += (`**${tagname.trim()}** ${tag.description}<br/>`);
    }
    tab.rows[j].push (txt);
    if (ch.links.tags.length>1) tab.rows[j].push (`До каналу прив'язано ${ch.links.tags.length} змінних`);
  } else {
    tab.rows[j].push (`**Немає прив'язки**`);
  } 
} 
module.exports = {
  repactuators, repacchscfg, 
  opts
}

