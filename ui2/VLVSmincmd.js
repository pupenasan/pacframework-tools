//початкова ініціалізація
VLVSmincmd_init ();

//пошук і зповнення своїх віджетів з посиланням на себе 
function VLVSmincmd_init () {
  let widgets = window.IoTGW.widgets;
  const svgfile = 'VLVSmincmd.svg';
  const classname = 'VLVSmincmd';
  //заповнення віджетів
  for (wdgtname of window.IoTGW.classes[classname].widgets) {
    let wdgt = widgets[wdgtname];
    let elm = wdgt.html;
    let wdgtid = wdgt.id;  
    wdgt.svgid = `svg${wdgtid}`;
    elm.innerHTML = `<object onload = "VLVSmincmd_onload('${wdgtname}')" id="${wdgt.svgid}" type="image/svg+xml" data="${svgfile}">Your browser does not support SVG </object>`;
    wdgt.svg = wdgt.html.childNodes[0];
    //console.log (htmlel);
  }
  window.IoTGW.classes[classname].updateFn = VLVSmincmd_update;
}

//при ініціалізації добавити події  
function VLVSmincmd_onload (wdgtname) {
  VLVSmincmd_addevents(wdgtname);
}

function VLVSmincmd_addevents (wdgtname) {
  //добавлення подій
  let wdgt = window.IoTGW.widgets[wdgtname];
  let htmlel = wdgt.svg.contentDocument;

  let tagname = wdgt.tag;
  let urlcmd = tagname.replaceAll ('.', '/');
  let fnprefix = 'top.senddata ("' + urlcmd + '",';
  //console.log (fnprefix + `{CMD: "CMDAUTO"})`); 

  htmlel.querySelector('.CMDAUTO').setAttribute('onclick', fnprefix + `{CMD: "CMDAUTO"})`);
  htmlel.querySelector('.CMDMAN').setAttribute('onclick', fnprefix + `{CMD: "CMDMAN"})`);
  htmlel.querySelector('.CMDSTP').setAttribute('onclick', fnprefix + `{CMD: "CMDSTOP"})`);
  htmlel.querySelector('.CMDCLS').setAttribute('onclick', fnprefix + `{CMD: "CMDCLS"})`);
  htmlel.querySelector('.CMDOPN').setAttribute('onclick', fnprefix + `{CMD: "CMDOPN"})`);
  htmlel.querySelector('.CMDLOAD').setAttribute('onclick', `top.VLVSmincmd_bufload("${wdgtname}")`);
 
}  

//завантаження в ВМ в буфер
function VLVSmincmd_bufload (wdgtname) {
  //console.log (wdgtname);
  let wdgt = window.IoTGW.widgets[wdgtname];
  let tagname = wdgt.tag;
  let urlcmd = tagname.replaceAll ('.', '/');
  //відправити команду
  senddata (urlcmd, {CMD: "CMDLOADTOBUF"});
  //завантажити контент в віджет
 
  let wdgtCFG =  window.IoTGW.widgets['CFG'];
  let cfgclass = 'ACTbuf';
  wdgtCFG.tag = 'RT.PLC1.IOTDB.IOTBUF.ACT';
  
  //якщо клас інший, добавити в класи і завантажити скрипт
  if (wdgtCFG.class !== cfgclass) {
    wdgtCFG.class = cfgclass;
    if (!window.IoTGW.classes[cfgclass]) window.IoTGW.classes[cfgclass] = {
      classid: cfgclass, 
      scriptname : cfgclass + '.js', 
      widgets: [],
      updateFn: {}
    };
    window.IoTGW.classes[cfgclass].widgets.push ('CFG');       
    let script = document.createElement('script');
    script.src = window.IoTGW.classes[cfgclass].scriptname;
    document.body.append(script);
    //добалвяємо тег до віджету 
    if (!window.IoTGW.tags[wdgtCFG.tag]) {
      window.IoTGW.tags[wdgtCFG.tag] = {
        tagid: wdgtCFG.tag, 
        wdgids:['CFG']
      }
    }
    //перебираємо список тегів, якщо потрібного немаж - добавляємо
    let find = false;
    for (tagname of window.IoTGW.tagsar) {
      if (tagname === wdgtCFG.tag) find = true
    }
    
    if (find === false) {
      window.IoTGW.tagsar.push (wdgtCFG.tag)
      //console.log (wdgtCFG.tag);
    }
  } else {
    ACTbuf_addevents ('CFG')
  } 
}

function VLVSmincmd_update () {
  let tags = window.IoTGW.tags;
  let widgets = window.IoTGW.widgets;
  let widgetnames = this.widgets;
  for (let widgetname of widgetnames) {
    let widget = widgets[widgetname];
    VLVSmincmd_updatewidget (widget) 
  }   
}

function VLVSmincmd_updatewidget (widget) {
  let tagname =  widget.tag;
  const tag = window.IoTGW.RT[tagname];
  
  let tagnamear = tagname.split('.');
  tagname = tagnamear[tagnamear.length-1];
  htmlel = widget.svg.contentDocument;//html.childNodes[0];//.contentDocument
  htmlel.querySelector('.NAMETXT').innerHTML = tagname;
  htmlel.querySelector('.DESCRTXT').innerHTML = tag.description;

}

