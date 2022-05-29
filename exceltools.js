const xlsx = require('xlsx');
const fs = require ('fs');
const path = require ('path');
const masterdatattools = require('./masterdatatools');

//скорочені назви функцій
const logmsg = masterdatattools.logmsg;

const opts = {
  logpath: 'log',
  logfile: 'exceltools.log',
};

//отримання базової інформації про теги закладка tags
function getcfgtags_fromxls (filexls) {
  const cfgtags = {tags:{}, ids:{}, invalids:{}, statistic:{}};
  const wb = xlsx.readFile(filexls);
  const wss = wb.Sheets;
  const wstags = wss['tags'];

  const tagrows = xlsx.utils.sheet_to_json(wstags);
  tagrows.sort((a, b) => {
    return a.ID - b.ID;
  }); 
  logmsg ('Розбиваю записи по тегам', 1); 
  let i=0;
  for (let row of tagrows) {
    i++;
    let tagname = row.TAGNAME;
    let id = parseInt(row.ID);
    let tag = {state: 'valid'};
    if (!tagname) {
      tagname = '$TEMPORARY' + i; 
      logmsg (`ERR: Не знайдено ім'я тегу у записі номер ${i}, надано тимчасове ім'я тегу ${tagname}, тег невалідний`, 1);
      tag.state = 'inv_noname' 
    }
    if (cfgtags.tags[tagname]) {
      tagname = '$TEMPORARY' + i;       
      logmsg (`ERR: Знайдено повторне ім'я тегу у записі номер ${i}, надано тимчасове ім'я тегу ${tagname}, тег невалідний`, 1);
      tag.state = 'inv_duplname'       
    }
    if (checktagname(tagname)===false) {
      tagname = '$TEMPORARY' + i;
      logmsg (`ERR: Надано тимчасове ім'я тегу ${tagname}, тег невалідний`, 1);       
      tag.state = 'inv_name'        
    }
    if (!id>0) {
      logmsg (`ERR: Ідентифікатор ${row.ID} для тегу ${tagname} некоректний, ідентифікатор обнулено, тег невалідний`, 1);
      id = 0;
      tag.state = 'inv_id';        
    } else if (cfgtags.ids[id] ) {
      logmsg (`ERR: Ідентифікатор ${id} для тегу ${tagname} вже існує для тегу ${cfgtags.ids[id]} , ідентифікатор обнулено, тег невалідний`, 1);
      id = 0;
      tag.state = 'inv_duplid';        
    }

    tag.tagname = tagname;
    tag.id = id;
    tag.props = row;
    tag.description = tag.props.DESCRIPTION;
    cfgtags.tags[tagname] = tag;
    if (tag.state === 'valid') {
      cfgtags.ids[id] = tagname;
      //формування статистики
      if (!cfgtags.statistic[tag.props.TYPE]) cfgtags.statistic[tag.props.TYPE] = {count:0};
      cfgtags.statistic[tag.props.TYPE].count++;
    } else {
      cfgtags.invalids[id] = tagname   
    }
    //console.log (cfgtags);  
    //process.exit();
  }
  return cfgtags;
}

//отримання інформації про типи acts
function getacttypes_fromxls (filexls) {
  const acttrtypes = {};
  const wb = xlsx.readFile(filexls);
  const wss = wb.Sheets;
  const wsacttps = wss ['acttps'];
  const wssymbid = wss ['symbid'];
  
  //формування обєкту з описами IO
  iodescr = {};
  for (row of xlsx.utils.sheet_to_json(wssymbid)) {
    if (row.LEVEL === 'ACT') {
      iodescr[row.SYMB] = row.DESCR;
    }
  }
  //отримання властивостей acttrs
  for (row of xlsx.utils.sheet_to_json(wsacttps)) {
    let acttrtype = acttrtypes[row.ACTTYPE] = 
      {clsid:parseInt (row.CLSID,16), 
      fnname:row.FN,  
      typename: row.ACTTYPE, 
      altertypename: row.ALTERNAME, 
      typedescr: row.ACTTYPEDESCR, 
      io:{}};
    for (colname in row) {
      if (typeof row[colname] !== 'string') continue;
      arnames = row[colname].split ('/');
      ioname = arnames[0];  
      let str = colname.substr(0,2);
      if (str ==='IN') {
        if (colname[colname.length-1] === 'A') {
          acttrtype.io[ioname]={type: 'AI', arnames}
        } else {
          acttrtype.io[ioname]={type: 'DI', arnames}          
        }
      }  
      if (str ==='OU') {
        if (colname[colname.length-1] === 'A') {
          acttrtype.io[ioname]={type: 'AO', arnames}
        } else {
          acttrtype.io[ioname]={type: 'DO', arnames}          
        }
      }
      //опис IO, якщо знайдено
      if (ioname && acttrtype.io[ioname]) {
        acttrtype.io[ioname].description = iodescr[ioname]
      }       
    }  
  }

  return acttrtypes
}

//отримання інформації про типи каналів
function getchtypes_fromxls (filexls) {
  let chtypes = {};
  const wb = xlsx.readFile(filexls);
  const wss = wb.Sheets;
  const wschtypes = wss['chtps'];
  for (row of xlsx.utils.sheet_to_json(wschtypes)) {
    if (!chtypes[row.TYPE]) chtypes[row.TYPE] = {};
    let chtype = chtypes[row.TYPE];
    chtype[row.SUBTYPE] = {clsid : row.CLSID, description : row.DESCR} 
  }
  //console.log (chtypes);
  return (chtypes);
}

//отримання інформації про типи каналів
function getothercfg_fromxls (filexls) {
  let cfgopts = {};
  const wb = xlsx.readFile(filexls);
  const wss = wb.Sheets;
  const wsopts = wss['other'];
  for (row of xlsx.utils.sheet_to_json(wsopts)) {
    //console.log (row);
    if (!cfgopts[row.SECTION]) cfgopts[row.SECTION] = {};
    let section = cfgopts[row.SECTION];
    //console.log (section);
    let strparaname = row.PARA;
    let parapath = strparaname.split('.');
    let para = section;
    for (paraitem of parapath){
      if (!para[paraitem]) para[paraitem] = {}
      para = para[paraitem]; 
    }
    para.value =  row.VALUE;
    //section.para = para;  
  }
  //console.log (cfgopts); process.exit();
  return (cfgopts);
}


//переірка на коректність назв
function checktagname (tagname) {
  let rforeign = /[^\u0000-\u007f]/;
  if (rforeign.test(tagname)) {
    logmsg ('Кирилиця в імені ' +  tagname);
    return (false);
  }
  let regexp = /[\s ]/;
  if (regexp.test (tagname)) {
    logmsg ('Недозволені символи в імені ' +  tagname);    
    return (false);   
  }
  return (true);
} 


module.exports = {
   getcfgtags_fromxls, getacttypes_fromxls, getchtypes_fromxls, getothercfg_fromxls,
   opts
};