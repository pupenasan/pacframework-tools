const mime = require('mime-types');
const crypto = require('crypto');
const fs = require('fs');
const { Module } = require('module');
const couchtools = require('../dbtools/couchtools');
const masterdatatools = require('../common/masterdatatools');

couchtools.opts.user = process.env.COUCH_USER;
couchtools.opts.password = process.env.COUCH_PASS;

masterdatatools.opts.logfile = 'ui2tools.log';

// скорочені назви функцій
const { logmsg } = masterdatatools;
const { writetolog } = masterdatatools;

// оновлює нові файли в couchDB для ui2
async function updateui2(twinname, uploadall = false) {
  const now = new Date();
  const files = []; let
    ui2info = {};
  const uipath = `${__dirname}/ui2`;
  const filenames = fs.readdirSync(uipath);
  let needupdate = false;
  let doc;
  // зчитуємо інформацію про файли
  try {
    doc = await couchtools.Couchdb_todoc(twinname, 'ui2info');
    ui2info = doc.data;
    // ui2info = JSON.parse(fs.readFileSync(uipath + '/ui2info.json', 'utf8'));
  } catch (e) {
    ui2info = { uploadfiles: {} };
    needupdate = true;
  } finally {

  }
  if (!ui2info.uploadfiles) {
    ui2info = { uploadfiles: {} };
    needupdate = true;
  }

  for (const filename of filenames) {
    if (filename === 'ui2info.json') continue;
    const mimetype = mime.lookup(filename);
    const data = fs.readFileSync(`${uipath}/${filename}`);
    // console.log (hash);
    // є новий файл в переліку
    if (!ui2info.uploadfiles[filename] || uploadall === true) {
      const hash = crypto.createHash('md5').update(data).digest('hex');
      ui2info.uploadfiles[filename] = {
        date: now.getTime(),
        ver: 1,
        hash,
      };
      needupdate = true;
      logmsg(`Файл ${filename} добавлений в перелік нових`);
      files.push({ name: filename, format: mimetype, data });
    } else { // якщо є файл перевіряємо його хеш
      const fileinfo = ui2info.uploadfiles[filename];
      const hash = crypto.createHash('md5').update(data).digest('hex');
      if (fileinfo.hash === hash) continue;
      fileinfo.date = now.getTime();
      fileinfo.ver++;
      fileinfo.hash = hash;
      needupdate = true;
      logmsg(`Файл ${filename} добавлений в перелік оновлених`);
      files.push({ name: filename, format: mimetype, data });
    }
  }
  // якщо є оновлення
  if (needupdate === true) {
    await couchtools.doc_toCouchdb(ui2info, twinname, 'ui2info');
    logmsg('Документ оновлений');
    fs.writeFileSync(`${uipath}/ui2info.json`, JSON.stringify(ui2info), 'utf8');
    result = await couchtools.files_toCouchdb(twinname, 'ui2upload', files);
    logmsg('Файли прикріплені до документу ui2upload');
    // logmsg (`Не вдалося прикріпити файли`);
  } else {
    logmsg('Немає оновлених файлів');
  }
  writetolog(1);
}

module.exports = {
  updateui2,
};
