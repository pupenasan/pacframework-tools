/* модуль з різноманітними утилітами для роботи з Step7 Classic
 */

const fs = require('fs');
const iconv = require('iconv-lite');

// пошук іфнормації для вказаних назв тегів в DB з екоспортних файлів awl:
// description
// номер DB
fileowl_path = 'C:\\VMshare\\ALLDB.AWL';
filenames_path = 'C:\\VMshare\\namesori.txt';
fileto_path = 'C:\\VMshare\\result.txt';
// parse_awl (filenames_path,fileowl_path, fileto_path);
function parse_awl(fnames, fawl, fto) {
  const namescontent = fs.readFileSync(fnames, 'utf-8');
  const names = namescontent.split(/\r?\n/);
  const records = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    records[name] = { i };
    // console.log (name);
  }
  const awlcontent = iconv.decode(fs.readFileSync(fawl), 'cp1251').toString();
  const awllines = awlcontent.split(/\r?\n/);
  let ar = ''; let
    dbname = '';
  for (const line of awllines) {
    ar = line.split('DATA_BLOCK "');
    if (ar.length == 2) {
      dbname = (ar[1].replace('"', ''));
      continue;
    }
    ar = line.split(';	//');
    if (ar.length == 2) {
      const ar1 = ar[0].split(' : ');
      if (ar1.length < 2) continue;
      const varname = ar1[0].trim();
      const vartype = ar1[1].trim();
      if (typeof (records[varname]) !== 'undefined') {
        records[varname] = { vartype, dbname, descr: ar[1].trim() };
        // console.log (records[varname] );
      }
    }
  }
  let outfiles = '';
  for (const name of names) {
    const record = records[name];
    outfiles += `${name}\t${record.descr || ''}\t${record.dbname || ''}\r\n`;
  }
  fs.writeFileSync(fto, outfiles, 'utf-8');
  // console.log (awlcontent);
}

composeVLV(filenames_path, fileto_path);
function composeVLV(fnames, fto) {
  const namescontent = fs.readFileSync(fnames, 'utf-8');
  const names = namescontent.split(/\r?\n/);
  const records = {};
  let ar1; let ar2; let ar3; let
    ar4 = [];

  for (let name of names) {
    // console.log (name)
    const record = records[name] = {};
    name = name.toUpperCase();
    let vlvname = '';
    ar1 = name.split('_VA_');
    ar2 = name.split('_VZC_');
    ar3 = name.split('_VZO_');
    ar4 = name.split('_VR_');
    if (ar1.length > 1) {
      vlvname = name.replace('_VA_', '_VLVD_');
    }
    if (ar2.length > 1) {
      vlvname = name.replace('_VZC_', '_VLVD_');
    }
    if (ar3.length > 1) {
      vlvname = name.replace('_VZO_', '_VLVD_');
    }
    if (ar4.length > 1) {
      vlvname = name.replace('_VR_', '_VLVA_');
    }
    record.vlvname = vlvname;
    if (vlvname.length > 1) {
      if (ar4.length > 1) {
        record.vlvtype = 'VLVA';
      } else {
        record.vlvtype = 'VLVD';
      }

      // console.log (record);
    }
  }
  let outfiles = '';
  for (const name of names) {
    const record = records[name];
    outfiles += `${name}\t${record.vlvname || ''}\t${record.vlvtype || ''}\r\n`;
  }
  fs.writeFileSync(fto, outfiles, 'utf-8');
}
