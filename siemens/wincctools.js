const fs = require('fs');
// test();

function test() {
  test_mastertags_to_almlist();
  test_masteracts_to_almlist();
}

function test_mastertags_to_almlist() {
  const path1 = './exampledata/';
  // отримання мастерданих про теги
  const filemaster = `${path1}tags.json`;
  if (fs.existsSync(filemaster)) {
    const content = fs.readFileSync(filemaster, 'utf8');
    mastertags = JSON.parse(content);
    const almlist = mastertags_to_almlist(mastertags.tags);
    // console.log (almlist);
    const BOM = '\uFEFF';
    const csvContent = BOM + almlist; // для кирилиці
    fs.writeFileSync(`${path1}wincc_almtags.csv`, csvContent, {
      codepage: 1251,
    });
  }
}

function test_masteracts_to_almlist() {
  const path1 = './exampledata/';
  // отримання мастерданих про act
  const filemaster = `${path1}acts.json`;
  if (fs.existsSync(filemaster)) {
    const content = fs.readFileSync(filemaster, 'utf8');
    masteracts = JSON.parse(content);
    const almlist = masteracts_to_almlist(masteracts.acts);
    // console.log (almlist);
    const BOM = '\uFEFF';
    const csvContent = BOM + almlist; // для кирилиці
    fs.writeFileSync(`${path1}wincc_almacts.csv`, csvContent, {
      codepage: 1251,
    });
  }
}

// виведення тривог по тегам з мастерданих в список CSV
function mastertags_to_almlist(tags) {
  const almlist = [];
  for (const tagname in tags) {
    const tag = tags[tagname];
    for (const almname in tag.alms) {
      const almrec = [];
      const alm = tag.alms[almname];
      almrec.push(almname);
      almrec.push(alm.msg);
      almrec.push(alm.class);
      almrec.push(`${tag.hmiprefix}_${tagname}.${alm.word}`);
      almrec.push(alm.bit.toString());
      almrec.push('Rising edge');
      if (alm.class !== 'MSG') {
        almrec.push(`${tag.hmiprefix}_${tagname}_UDT.Alarm_Ack`);
        almrec.push(alm.bit.toString());
      } else {
        almrec.push('');
        almrec.push('');
      }
      almrec.push(`${tag.hmiprefix}_${tagname}_UDT.Alarm_Status`);
      almrec.push(alm.bit.toString());
      almlist.push(almrec.join(';'));
    }
  }

  return almlist.join('\r\n');
}

// виведення тривог по ВМ з мастерданих в список CSV
function masteracts_to_almlist(acts) {
  const almlist = [];
  for (const actname in acts) {
    const act = acts[actname];
    for (const almname in act.alms) {
      const almrec = [];
      const alm = act.alms[almname];
      almrec.push(almname);
      almrec.push(alm.msg);
      almrec.push(alm.class);
      almrec.push(`${act.hmiprefix}_${actname}.${alm.word}`);
      almrec.push(alm.bit.toString());
      almrec.push('Rising edge');
      if (alm.class !== 'MSG') {
        almrec.push(`${act.hmiprefix}_${actname}_UDT.Alarm_Ack`);
        almrec.push(alm.bit.toString());
      } else {
        almrec.push('');
        almrec.push('');
      }
      almrec.push(`${act.hmiprefix}_${actname}_UDT.Alarm_Status`);
      almrec.push(alm.bit.toString());
      almlist.push(almrec.join(';'));
    }
  }

  return almlist.join('\r\n');
}

module.exports = {
  masteracts_to_almlist,
  mastertags_to_almlist,
};
