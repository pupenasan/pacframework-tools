//https://github.com/apache/couchdb-nano
const masterdatatools = require('./masterdatatools');
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
  let rev = Date.now();
  try {
    const doc = await db.get(docname);
    const response = await db.insert({ _id: docname, _rev: doc._rev,  data });
    //console.log (doc);
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

/*
async function masterdataToCouchdb(masterdata) {
  try {
    const response = await nano.db.get(dbname)
  } catch (e) {
    if (e.statusCode === 404) {
      await nano.db.create(dbname)
    }
  }
  const db = nano.use(dbname);
  let rev = Date.now();
  try {
    const doc = await db.get('masterdata');
    const response = await db.insert({ _id: 'masterdata', _rev: doc._rev,  masterdata });
    //console.log (doc);
  } catch (e) {
    //console.log (e);
    if (e.statusCode === 404) {
      const response = await db.insert({ _id: 'masterdata', masterdata })
    }    
  }  
  
  //const response = await db.insert({ happy: true }, 'rabbit');
  //return response
}

async function ui2ToCouchdb() {
  try {
    const response = await nano.db.get(dbname)
  } catch (e) {
    if (e.statusCode === 404) {
      await nano.db.create(dbname)
    }
  }
  const db = nano.use(dbname);
  let rev = Date.now();
  try {
    const doc = await db.get('UI2');
    const response = await db.insert({ _id: 'UI2', _rev: doc._rev,  pathes: UI2.pathes});
    //console.log (doc);
  } catch (e) {
    //console.log (e);
    if (e.statusCode === 404) {
      const response = await db.insert({ _id: 'UI2', UI2, pathes : UI2.pathes})
    }    
  }
  for (path in UI2.pathes) {
    let filename = './iotgw/ui2/' + UI2.pathes[path];
    try {
      const doc = await db.get('UI2');
      data = fs.readFileSync(filename, 'utf-8');
      //console.log (doc._rev);
      await db.attachment.insert('UI2', 
        UI2.pathes[path], 
        data, 
        'text/html',{
        rev: doc._rev
        })    
    } catch (e) {
      console.log (e)
    }
  }    
}
*/


module.exports = {
  //masterdataToCouchdb, ui2ToCouchdb,
  doc_toCouchdb, opts
}


