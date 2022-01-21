const mime = require('mime-types')
let crypto = require('crypto');
const fs = require ('fs');
const couchtools = require ('./couchtools'); 
const masterdatatools = require('./masterdatatools');

couchtools.opts.user = process.env.COUCH_USER;
couchtools.opts.password = process.env.COUCH_PASS;

masterdatatools.opts.logfile = 'ui2tools.log'; 

//скорочені назви функцій
const logmsg = masterdatatools.logmsg;
const writetolog = masterdatatools.writetolog;

//оновлює нові файли в couchDB для ui2
async function updateui2(twinname, uploadall=false) {
  let now = new Date();
  let files = [], ui2info = {};
  let uipath = './ui2';
  let filenames = fs.readdirSync(uipath);
  let needupdate = false;
  let doc;
  //зчитуємо інформацію про файли  
  try {
    doc = await couchtools.Couchdb_todoc (twinname, 'ui2info');
    ui2info = doc.data;
    //ui2info = JSON.parse(fs.readFileSync(uipath + '/ui2info.json', 'utf8'));
  } catch (e) {
    ui2info = {uploadfiles:{}};
    needupdate = true; 
  } finally {
    ;
  }
  if (!ui2info.uploadfiles) {
    ui2info = {uploadfiles:{}};
    needupdate = true; 
  }

  for (let filename of filenames){
    if (filename === 'ui2info.json') continue;
    let mimetype = mime.lookup (filename);
    let data = fs.readFileSync (uipath + '/' + filename);
    //console.log (hash);
    //є новий файл в переліку 
    if (!ui2info.uploadfiles[filename] || uploadall === true) {
      let hash = crypto.createHash('md5').update(data).digest('hex');
      ui2info.uploadfiles[filename] = {
        date: now.getTime(), 
        ver: 1, 
        hash: hash 
      }
      needupdate = true;
      logmsg (`Файл ${filename} добавлений в перелік нових`);
      files.push ({name: filename, format : mimetype, data: data});  
    } else { //якщо є файл перевіряємо його хеш
      let fileinfo = ui2info.uploadfiles[filename];
      let hash = crypto.createHash('md5').update(data).digest('hex');
      if (fileinfo.hash === hash) continue; 
      fileinfo.date = now.getTime();
      fileinfo.ver++;
      fileinfo.hash = hash;
      needupdate = true; 
      logmsg (`Файл ${filename} добавлений в перелік оновлених`);
      files.push ({name: filename, format : mimetype, data: data});  
    }  
  }
  //якщо є оновлення
  if (needupdate === true) {
    await couchtools.doc_toCouchdb(ui2info, twinname, 'ui2info');
    logmsg (`Документ оновлений`);
    fs.writeFileSync (uipath + '/ui2info.json', JSON.stringify(ui2info), 'utf8');    
    result = await couchtools.files_toCouchdb(twinname, 'ui2upload', files);  
    logmsg (`Файли прикріплені до документу ui2upload`);
    //logmsg (`Не вдалося прикріпити файли`);      
  } else {
    logmsg (`Немає оновлених файлів`);
  }
  writetolog (1);
} 

module.exports = {
  updateui2
}