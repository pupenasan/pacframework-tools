//https://github.com/apache/couchdb-nano
const masterdatatools = require('../common/masterdatatools');
//const UI2 = require ('./iotgw/ui2/index.js');
const opts = {
  user:'',
  password:'',
  logpath: 'log',
  logfile: 'general.log',
};

//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;

async function doc_toCouchdb(data, dbname, docname) {
  const nano = require('nano')(`http://${opts.user}:${opts.password}@localhost:5984`);
  if (!dbname) dbname = 'tmpdb';
  if (!docname) docname = 'tmpdoc';
  
  try {
    const response = await nano.db.get(dbname)
  } catch (e) {
    logmsg (`Помилка ${e} при піключенні до БД ${dbname}, створюю нову`);
    if (e.statusCode === 404) {
      await nano.db.create(dbname);
    }
  }
  const db = nano.use(dbname);
  try {
    const doc = await db.get(docname);
    const response = await db.insert({ _id: docname, _rev: doc._rev,  data });
    logmsg (`Пишу дані в CouchDB ...`); 
  } catch (e) {
    logmsg (`Помилка ${e} при доступу до документу ${docname}, створюю новий`);  
    if (e.statusCode === 404) {
      const response = await db.insert({ _id: docname, data })
    } 
  } finally {
    logmsg (`Дані записані в CouchDB`);      
  }     
  
  //const response = await db.insert({ happy: true }, 'rabbit');
  //return response
}

async function Couchdb_todoc (dbname, docname) {
  const nano = require('nano')(`http://${opts.user}:${opts.password}@localhost:5984`);
  if (!dbname) {
    logmsg (`Не вказана БД`); 
    return 
  }
  if (!docname) {
    logmsg (`Не вказаний документ`); 
    return 
  }
  try {
    const response = await nano.db.get(dbname)
  } catch (e) {
    logmsg (`Помилка ${e} при піключенні до БД`);
    return
  } 
  const db = nano.use(dbname);
  let doc;
  try {
    doc = await db.get(docname);
  } catch (e) {
    logmsg (`Помилка ${e} при доступу до документу ${docname}`);  
    return
  }     
  
  return doc
}

async function files_toCouchdb(dbname, docname, files) {
  const nano = require('nano')(`http://${opts.user}:${opts.password}@localhost:5984`);
  if (!Array.isArray (files) || !files[0] || !files[0].name || !files[0].format || !files[0].data) {
    logmsg (`Помилка в форматі масиву переданих файлів`);
    console.log (files);
    return false
  }
  let db, doc; 

  if (!dbname) {
    logmsg (`Не задана БД`);
    return false
  };
  if (!docname) {
    logmsg (`Не задано документ`);
    return false
  };
  
  try {
    const response = await nano.db.get(dbname)
  } catch (e) {
    logmsg (`Помилка ${e} при піключенні до БД ${dbname}`);
    return false
  }
  db = nano.use(dbname);
  try {
    doc = await db.get(docname);
  } catch (e) {
    logmsg (`Помилка ${e} при доступу до документу ${docname}, створюю новий`);  
    if (e.statusCode === 404) {
      doc ={};
      const response = await db.insert({ _id: docname, doc})
    } 
  } 
  for (let file of files) {
    doc = await db.get(docname);
    //console.log (file.name);
    try {
      await db.attachment.insert(docname, 
        file.name, 
        file.data, 
        file.format,
        {rev: doc._rev}
      )
    } catch (e) {
      console.log ('Помилка прикліплення файлу: ' + e);
      return false
    }
  }
  return true        
}

module.exports = {
  files_toCouchdb, Couchdb_todoc,
  doc_toCouchdb, opts
}


