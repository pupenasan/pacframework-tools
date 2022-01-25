const fs = require ('fs');
const xmlparser = require('xml-js'); //https://www.npmjs.com/package/xml-js

const xmlcontentwrite = {
  _declaration: {
    _attributes: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' }
  },
  VariablesExchangeFile: {
    dataBlock: { 
      variables: { _attributes: { name: 'VARS', typeName: 'VARS' }}
    },
    DDTSource: []
  }
}

const jsDDTSource = [
  {_attributes: {DDTName: 'VARS',version: '0.01',dateTime: 'dt#2022-01-16-20:47:30'}, 
    attribute: {}, structure: {}},
  {_attributes: {DDTName: 'DIH',version: '0.01',dateTime: 'dt#2022-01-16-20:47:30'}, 
  attribute: {}, structure: {}},
  {_attributes: {DDTName: 'DOH',version: '0.01',dateTime: 'dt#2022-01-16-20:47:30'}, 
  attribute: {}, structure: {}},
  {_attributes: {DDTName: 'AIH',version: '0.01',dateTime: 'dt#2022-01-16-20:47:30'}, 
  attribute: {}, structure: {}},
  {_attributes: {DDTName: 'AOH',version: '0.01',dateTime: 'dt#2022-01-16-20:47:30'}, 
  attribute: {}, structure: {}}
];
const jsXDD = {
  _declaration: {
    _attributes: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' }
  },
  DDTExchangeFile: {
    //fileHeader: { _attributes: [Object] },
    //contentHeader: { _attributes: [Object] },
    DDTSource: jsDDTSource
  }
} 

let xmlcontent = fs.readFileSync('C:/tmp/1.xsy', 'utf8');
let jsoncontent = xmlparser.xml2js (xmlcontent, {compact: true}); 
console.log (jsoncontent.VariablesExchangeFile);
//console.log (jsoncontent.VariablesExchangeFile.dataBlock.variables[1].instanceElementDesc);
console.log (jsoncontent.VariablesExchangeFile.dataBlock.variables.instanceElementDesc[0].instanceElementDesc[1]);
