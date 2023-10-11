//створює таблицю у форматі MD з азголовками у вигляді масиву [HEADER1, HEADER2] та рядками [row1, row2]
//Повертає mdtext 
function createmdtable (tab = {header: ['HEADER'], rows : [['row']]}) {
  let mdtabheader = ' | ';
  let mdtabline = ' | ';
  let mdtabbody = '';
  let collen = [];
  //довжини стовпчиків
  for (i=0; i< tab.header.length; i++ ) {
    col = tab.header[i];
    collen [i] = col.length;
  }
  for (j=0; j< tab.rows.length; j++) {
    for (i=0; i< tab.rows[j].length; i++ ) {
      col = tab.rows[j][i]; 
      if (!collen [i]) collen [i] = col.length; 
      collen [i] = col.length > collen [i] ? col.length : collen [i] ;      
    }
  }

  for (i=0; i<collen.length; i++ ) {
    let col = tab.header[i] || ' ';
    mdtabheader += col.padEnd(collen [i]) + ' | ';
    mdtabline += '-'.repeat(5) + ' | ';//'-'.repeat(collen [i]) + ' | '
  }  
  for (j=0; j<tab.rows.length; j++) {
    let row = tab.rows[j];
    let mdrow = ' | ';
    for (i=0; i<collen.length; i++) {   
      col = (row[i] || ' ').toString();
      //console.log (col);
      mdrow += col.padEnd(collen [i]) + ' | ';
    }
    mdtabbody += mdrow + '\n';
  }
  let mdtext = mdtabheader + '\n' + mdtabline + '\n' + mdtabbody; 

  return mdtext; 
}

module.exports = {
  createmdtable
};