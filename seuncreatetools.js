const os = require('os');
const fs = require ('fs');
let path = require('path');
const xmlparser = require('xml-js'); //https://www.npmjs.com/package/xml-js
const ini = require('ini');//https://github.com/npm/ini#readme 
//const config = ini.parse (fs.readFileSync(global.inipath, 'utf-8'));
const userdir = path.normalize(os.homedir()+'/pacframeworktools');;
const masterdatatools = require ('./masterdatatools');

const opts = {
  logpath: 'log',
  logfile: 'general.log',
  resultpath: 'tounitypro'
};

masterdatatools.opts.logfile = opts.logfile; 
//скорочені назви функцій
const logmsg = masterdatatools.logmsg;

const xmlxddheader =  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const jsDDTExchangeFile = { DDTExchangeFile :{
  fileHeader: {_attributes: {company:"Schneider Automation", 
    product:"Unity Pro XL V13.1 - 180823C", 
    dateTime:'date_and_time#' + dateTimeSEUN(),
    content:"Derived Data Type source file",
    DTDVersion:"41"}},
  contentHeader: {_attributes: {name:"Project", version:"0.0.000"}}
}}
const jsVariablesExchangeFile = { VariablesExchangeFile :{
  fileHeader: {_attributes: {company:"Schneider Automation", 
    product:"Unity Pro XL V13.1 - 180823C", 
    dateTime:'date_and_time#' + dateTimeSEUN(),
    content:"Variable source file",
    DTDVersion:"41"}},
  contentHeader: {_attributes: {name:"Project", version:"0.0.000"}}
}}
const jsSTExchangeFile = { STExchangeFile :{
  fileHeader: {_attributes: {company:"Schneider Automation", 
    product:"Unity Pro XL V13.1 - 180823C", 
    dateTime:'date_and_time#' + dateTimeSEUN(),
    content:"Structured source file",
    DTDVersion:"41"}},
  contentHeader: {_attributes: {name:"Project", version:"0.0.000"}}
}}

//test ();

function create_all (cfgchs, cfgtags, cfgacts) {
  //create_pstsdb (cfgchs);
  //create_chdb (cfgchs);
  //create_dbmodulesdb (cfgchs);
  //create_plcmapsscl (cfgchs);
  create_vars (cfgtags);
  //create_actrtrsdb (cfgacts);
}

function create_vars (cfgtags) {
  //cfgtags = JSON.parse(fs.readFileSync ('C:/Users/san/pacframeworktools/result/cfg_tags.json'));
  logmsg ('-------------------- Створюю змінні та сеції VARS');
  let jsprog = createiovarsprogram (cfgtags, 'SR', 'MAST'); 
  let jsdataBlock = {};
  addvars_to_dataBlock (cfgtags, jsdataBlock);
  jsSTExchangeFile.STExchangeFile.dataBlock = jsdataBlock;
  addvar_to_dataBlock ('DIH', 'DIH', jsdataBlock);
  addvar_to_dataBlock ('DOH', 'DOH', jsdataBlock);
  addvar_to_dataBlock ('AIH', 'AIH', jsdataBlock);
  addvar_to_dataBlock ('AOH', 'AOH', jsdataBlock);
  let jsDDTSource = [];
  jsDDTSource.push (createDDTSource ('VARS', cfgtags, 'VAR_CFG'));
  jsDDTSource.push (createDDTSource ('DIH', cfgtags, 'DIVAR_HMI'));
  jsDDTSource.push (createDDTSource ('DOH', cfgtags, 'DOVAR_HMI'));
  jsDDTSource.push (createDDTSource ('AIH', cfgtags, 'AIVAR_HMI'));
  jsDDTSource.push (createDDTSource ('AOH', cfgtags, 'AOVAR_HMI'));      
  jsSTExchangeFile.STExchangeFile.DDTSource = jsDDTSource;
  
  //файли імпорту для змінних
  for (progname in jsprog) {
    jsSTExchangeFile.STExchangeFile.program = jsprog[progname];//jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog
    let xmlcontent = xmlxddheader + xmlparser.js2xml(jsSTExchangeFile, {compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement:true});
    let filename = userdir + '\\' + opts.resultpath + '\\' + jsprog[progname].identProgram._attributes.name + '.xst';
    if  (fs.existsSync(path.dirname(filename)) === false) {
      fs.mkdirSync (path.dirname(filename));
    }
    //console.log (filename);
    fs.writeFileSync (filename, xmlcontent);
    logmsg (` Файл імпорту ${filename} створено.`);
    if (jsSTExchangeFile.STExchangeFile.DDTSource) {
      logmsg (` Файл вміщує також усі змінні та типи VARS.`);
    }
    delete jsSTExchangeFile.STExchangeFile.DDTSource;
    delete jsSTExchangeFile.STExchangeFile.dataBlock;
  }
  
  //файли імпорту для ініціалізації 
  jsprog = createinitvarsprogram (cfgtags, 'SR', 'MAST'); 
  jsSTExchangeFile.STExchangeFile.program = jsprog;
  let xmlcontent = xmlxddheader + xmlparser.js2xml(jsSTExchangeFile, {compact: true, ignoreComment: true, spaces: 4, fullTagEmptyElement:true});
  let filename = userdir + '\\' + opts.resultpath + '\\INITVARS.xst'; 
  fs.writeFileSync (filename, xmlcontent);
  logmsg (` Файл імпорту ${filename} створено.`);
} 


function dateTimeSEUN () {
  let now = new Date();
  let dateTime = `${now.getFullYear()}-${now.getMonth().toString()+1}-${now.getDate()}-${now.toLocaleTimeString()}`; //'dt#2022-01-16-20:47:30'
  return dateTime
}

//добавляє DDTcontent в опис структурного типу 
function createDDTSource (DDTName, DDTcontent, PACFWtype = 'VAR_CFG' , version = '0.01'){
  let jsDDTsource = {
    _attributes: {DDTName: DDTName, version: version, dateTime: 'dt#' + dateTimeSEUN()}, 
    structure: {variables:[]}
  }
  //варіант з тегами
  if (PACFWtype === 'VAR_CFG' && DDTcontent.tags) {
    const tags = DDTcontent.tags;
    for (let tagname in tags) {
      let tag = tags[tagname];
      tag.props.TAGNAME;
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log ('Кирилиця в імені ' +  tag.props.TAGNAME);
        break;
      }else{
        //{ _attributes: { name: 'STA', typeName: 'INT'}, comment: { _text: 'статус' }}
        jsDDTsource.structure.variables.push ( 
        {_attributes: { name: tag.props.TAGNAME, typeName: tag.props.TYPE + 'VAR_CFG'},
          comment: { _text: tag.props.DESCRIPTION }})
      };
    }
  }
  //варіант з HMI
  if (PACFWtype.search('VAR_HMI')>=0 && DDTcontent.tags) {
    const tags = DDTcontent.tags;
    for (let tagname in tags) {
      let tag = tags[tagname];
      tag.props.TAGNAME;
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log ('Кирилиця в імені ' +  tag.props.TAGNAME);
        break;
      }else{
        let pushenbl = false;
        let typeName = PACFWtype;
        //перевірка чи конкретний тип, чи загальні 
        switch (PACFWtype) {
          case 'DIVAR_HMI':
            pushenbl = (tag.props.TYPE === 'DI'); 
            break;
          case 'DOVAR_HMI':
            pushenbl = (tag.props.TYPE === 'DO'); 
            break;
          case 'AIVAR_HMI':
            pushenbl = (tag.props.TYPE === 'AI'); 
            break;
          case 'AOVAR_HMI':
            pushenbl = (tag.props.TYPE === 'AO'); 
            break;          
          default:
            pushenbl = true;
            typeName = tag.props.TYPE + 'VAR_HMI';
            break;
        }
        if (pushenbl){
          jsDDTsource.structure.variables.push ( 
            {_attributes: { name: tag.props.TAGNAME, typeName: typeName },
              comment: { _text: tag.props.DESCRIPTION }})
          };    
        } 
    }
  }  

  /*
  <variables name="STA" typeName="INT">
    <comment>біти статусу STA+CMD (X15 - CMDLOAD)</comment>
  </variables>
  { _attributes: { name: 'STA', typeName: 'INT'}, comment: { _text: 'статус' }} 
  */  
  return jsDDTsource 
}

//добавляє змінні в dataBlock
function addvars_to_dataBlock (cfgtags, jsdataBlock){
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  //усі змінні 
  let jsvariables = jsdataBlock.variables;
  if (cfgtags.tags) {
    //значення структурної змінної VARS
    let jsVARS = {
      _attributes: {name: 'VARS', typeName: 'VARS'},
      instanceElementDesc: [] 
    }
    /*{
    _attributes: { name: 'VARS', typeName: 'VARS' },
    instanceElementDesc: [
      { _attributes: [Object], instanceElementDesc: [Array] },
      { _attributes: [Object], instanceElementDesc: [Array] }]
    }*/
    const tags = cfgtags.tags;
    for (let tagname in tags) {
      let tag = tags[tagname];
      tag.props.TAGNAME;
      //check CYRYLYC
      let rforeign = /[^\u0000-\u007f]/;
      if (rforeign.test(tag.props.TAGNAME)) {
        console.log ('Кирилиця в імені ' +  tag.props.TAGNAME);
        break;
      }else{
        /*  _attributes: { name: 'VNabor_T1_OPN' },
            instanceElementDesc: [
            { _attributes: { name: 'ID' }, value:  { _text: '1' } },
            { _attributes: { name: 'CLSID' }, value: { _text: '2' } }
        ]*/
        let jsVAR = {_attributes:{name:tag.props.TAGNAME}, instanceElementDesc:[]}; 
        let chid =  tag.props.TAGNAME.substr(0, 3).toLowerCase()==='rez' ? 0 : tag.props.CHID; 
        //добавлення змінюваних властивостей
        jsVAR.instanceElementDesc.push({_attributes: {name: 'ID'}, value: { _text: tag.props.ID.toString()}});
        jsVAR.instanceElementDesc.push({_attributes: {name: 'CHID'}, value: { _text: chid.toString()}});
        jsVAR.instanceElementDesc.push({_attributes: {name: 'CHIDDF'}, value: { _text: chid.toString()}}); 
        //добавляємо машстабування, якщо воно вказане
        if ((tag.props.TYPE === 'AI' || tag.props.TYPE === 'AO') && tag.props.SCALE) {
          let scalear = tag.props.SCALE.replace(/[()]/g,'').split ('..');
          if (scalear.length === 2) {
            let min = (parseFloat(scalear[0])).toFixed(3);
            let max = (parseFloat(scalear[1])).toFixed(3);
            jsVAR.instanceElementDesc.push({_attributes: {name: 'LOENG'}, value: { _text: min.toString()}});
            jsVAR.instanceElementDesc.push({_attributes: {name: 'HIENG'}, value: { _text: max.toString()}});            
          }
        }
        //добавлення тегу до тегів
        jsVARS.instanceElementDesc.push(jsVAR);        
      }
    }
    //додавння структурної змінної тегів до змінних dataBlock
    jsvariables.push (jsVARS);  
  }
  /*
	<dataBlock>
		<variables name="VARS" typeName="VARSold">
			<instanceElementDesc name="VNabor_T1_OPN">
				<instanceElementDesc name="ID">
					<value>1</value>
				</instanceElementDesc>
				<instanceElementDesc name="CLSID">
					<value>2</value>
				</instanceElementDesc>
			</instanceElementDesc>
			<instanceElementDesc name="VNabor_T2_OPN">
				<instanceElementDesc name="ID">
					<value>3</value>
				</instanceElementDesc>
				<instanceElementDesc name="CLSID">
					<value>4</value>
				</instanceElementDesc>
			</instanceElementDesc>
		</variables>
	</dataBlock>
  */  
}
//добавляє змінну заданого типу в dataBlock
function addvar_to_dataBlock (varname, vartype, jsdataBlock){
  if (!jsdataBlock.variables) jsdataBlock.variables = [];
  jsdataBlock.variables.push ({_attributes: {name: varname, typeName: vartype}});  
}

//ствобрює секції обробки змінних
function createiovarsprogram (cfgtags, secttype = 'SR', task = 'MAST') {
  let bodyDIVARS = '', bodyDOVARS = '', bodyAIVARS = '', bodyAOVARS = '';
  let jsdivarsprog = {
    identProgram : {_attributes: {name: "DIVARS", type: secttype, task: task}},
    STSource: {}}
  let jsdovarsprog = {
    identProgram : {_attributes: {name: "DOVARS", type: secttype, task: task}},
    STSource: {}}
  let jsaivarsprog = {
    identProgram : {_attributes: {name: "AIVARS", type: secttype, task: task}},
    STSource: {}};
  let jsaovarsprog = {
    identProgram : {_attributes: {name: "AOVARS", type: secttype, task: task}},
    STSource: {}}
  
  const tags = [];
  for (let tagname in cfgtags.tags) {
    tags.push (cfgtags.tags[tagname]) 
  }  
  tags.sort (function(a, b) {
    return a.props.ID - b.props.ID;
  })
  for (tag of tags) {
    switch (tag.props.TYPE) {
      case 'DI':
        bodyDIVARS+=`DIVARFN(CHCFG := CHDI[VARS.${tag.props.TAGNAME}.CHID], DIVARCFG := VARS.${tag.props.TAGNAME}, DIVARHMI := DIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI); (*${tag.props.DESCRIPTION}*) \n`;        
        //`DIVARFN (CHCFG := CHDI[VARS.VNabor_T1_OPN.CHID],  DIVARCFG := VARS.VNabor_T1_OPN,  DIVARHMI := VAR_HMI.VNabor_T1_OPN,  VARBUF := VARBUF, PLCCFG := PLC, CHDI := CHDI);`
        break;
      case 'DO':
        bodyDOVARS+=`DOVARFN(CHCFG := CHDO[VARS.${tag.props.TAGNAME}.CHID], DOVARCFG := VARS.${tag.props.TAGNAME}, DOVARHMI := DOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHDO := CHDO); (*${tag.props.DESCRIPTION}*) \n`;        
      break;
      case 'AI':
        bodyAIVARS+=`AIVARFN(CHCFG := CHAI[VARS.${tag.props.TAGNAME}.CHID], AIVARCFG := VARS.${tag.props.TAGNAME}, AIVARHMI := AIH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAI := CHAI); (*${tag.props.DESCRIPTION}*) \n`;        
      break;
      case 'AO':
        bodyDIVARS+=`AOVARFN(CHCFG := CHAO[VARS.${tag.props.TAGNAME}.CHID], AOVARCFG := VARS.${tag.props.TAGNAME}, AOVARHMI := AOH.${tag.props.TAGNAME}, VARBUF := VARBUF, PLCCFG := PLC, CHAO := CHAO); (*${tag.props.DESCRIPTION}*) \n`;        
        break;                                
      default:
        break;
    }
  }
  
  const progdescr = '(* Ця секція згенерована автоматично PACFramework Tools ' + (new Date()).toLocaleString() + '*)\n';
  jsdivarsprog.STSource =  progdescr + bodyDIVARS;
  jsdovarsprog.STSource =  progdescr + bodyDOVARS;
  jsaivarsprog.STSource =  progdescr + bodyAIVARS;
  jsaovarsprog.STSource =  progdescr + bodyAOVARS; 

  return {jsdivarsprog, jsdovarsprog, jsaivarsprog, jsaovarsprog}
  /*
  	<identProgram name="INPUTS" type="SR" task="MAST"></identProgram>
		<STSource>FOR i := 1 TO PLC.DICNT DO
  */
}

function createinitvarsprogram (cfgtags, secttype = 'SR', task = 'MAST'){
  let jsprog = {
    identProgram : {_attributes: {name: "INITVARS", type: secttype, task: task}},
    STSource: {}}
  let bodyprog = '';
  
  const tags = [];
  for (let tagname in cfgtags.tags) {
    tags.push (cfgtags.tags[tagname]) 
  }  
  tags.sort (function(a, b) {
    return a.props.ID - b.props.ID;
  })
  for (tag of tags) {
    let tagname = tag.props.TAGNAME; 
    let chid =  tag.props.TAGNAME.substr(0, 3).toLowerCase()==='rez' ? 0 : tag.props.CHID; 
    let id = tag.props.ID.toString();
    jsprog += `VARS.${tagname}.ID:=${id}; VARS.${tagname}.CHID:=${chid}; VARS.${tagname}.CHIDDF:=${chid};`
    //VARS.VNabor_T1_OPN.ID:=10001;  VARS.VNabor_T1_OPN.CHID:=1;   VARS.VNabor_T1_OPN.CHIDDF:=1;     
  }
  const progdescr = '(* Ця секція згенерована автоматично PACFramework Tools ' + (new Date()).toLocaleString() + '*)\n';
  jsprog.STSource =  progdescr + bodyprog;
  return jsprog
}


module.exports = {
  create_all
};