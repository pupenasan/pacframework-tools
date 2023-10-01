/* Утиліти для роботи з Excel
getcfgtags_fromxls (filexls) => cfgtags - отримання базової інформації про теги закладка в закладці tags з файлу з назвою filexls
  tags{TAGNAME}:
    id: колонка ID 
    tagname: колонка TAGNAME
    description: колонка DESCRIPTION 
    props: усі поля (заголовки колонок) передаються як властивості даного обєкту
    state: valid/inv_noname/inv_duplname/inv_name/inv_id/inv_duplid
  ids:{id} - валідні tagname за id 
  invalids:{id} - невалідні tagname за id 
  statistic:{AO:cnt ....} - кількість кожного типу тегів
  memmap{}: налаштування адрес для змінних, якщо вони повинні записуватися в програму ПЛК, береться з getothercfg_fromxls()
getacttypes_fromxls (filexls) => acttrtypes  - отримання інформації про типи acttps в закладці acts з файлу з назвою filexls
getchtypes_fromxls (filexls) => chtypes - отримання інформації про типи каналів в закладці chtps з файлу з назвою filexls
getothercfg_fromxls (filexls) => cfgopts - отримання інформації про інші налаштування в закладці other з файлу з назвою filexls
  cfgopts включає обєкти що сформовані за правилом: 
    SECTION - назва JSON файлу (tags, chs, chmap, acts),	
    PARA - обєкт у файлі в форматі вкладеності ob1.ob2.ob3	
    VALUE - значення обєкту
checktagname (tagname) => true (якщо ок) - перевірка на коректність назв (крилиця, недозволені символи в іменах)
*/
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

//отримання інформації про інші налаштування в форматі SECTION	PARA	VALUE
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
    let tagnamebad = '';
    for (let l of tagname) {
      if (rforeign.test (l)) tagnamebad += '>' 
      tagnamebad += l ;
    }
    logmsg ('Кирилиця в імені ' +  tagnamebad);
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