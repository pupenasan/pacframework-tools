//console.log ("VLVDmin.js завантажено");

//початкова ініціалізація
VLVDmin_init ();

//пошук і зповнення своїх віджетів з посиланням на себе 
function VLVDmin_init () {
  let widgets = window.IoTGW.widgets;
  const svgfile = 'VLVDmin.svg';
  const classname = 'VLVDmin';
  //пошук і заповнення віджетів
  for (wdgtname of window.IoTGW.classes[classname].widgets) {
    let wdgt = widgets[wdgtname];
    let elm = wdgt.html;
    let wdgtid = wdgt.id;  
    wdgt.svgid = `svg${wdgtid}`;
    elm.innerHTML = `<object onload = "VLVDmin_onload('${wdgtname}')" id="${wdgt.svgid}" type="image/svg+xml" data="${svgfile}">Your browser does not support SVG </object>`;
    wdgt.svg = wdgt.html.childNodes[0];
    if (window.IoTGW.selid.length <1) {
      VLVDmin_select(wdgtname);
      //window.IoTGW.selid = wdgtname
    };
    //console.log (htmlel);
  }
  window.IoTGW.classes[classname].updateFn = VLVDmin_update;
}

//при ініціалізації добавити події  
function VLVDmin_onload (wdgtname) {
  //добавлення подій
  let htmlel = window.IoTGW.widgets[wdgtname].svg.contentDocument;
  htmlel.querySelector('.VLVD').setAttribute('onclick', `top.VLVDmin_select ('${wdgtname}')`);
  //console.log (htmlel.querySelector('.VLVD'));
  
  //підрівняти svg під розміри
  let svgel = htmlel.querySelector('.VLVD');
  //console.log (svgel);
  let height = parseInt(svgel.getAttribute ('height'));
  let width = parseInt(svgel.getAttribute ('width'));
  window.IoTGW.widgets[wdgtname].html.setAttribute ('height',  height + 22);
  window.IoTGW.widgets[wdgtname].html.setAttribute ('width',  width + 22);
  window.IoTGW.widgets[wdgtname].svg.setAttribute ('height', height + 20);
  window.IoTGW.widgets[wdgtname].svg.setAttribute ('width', width + 20);
}

function VLVDmin_update () {
  let tags = window.IoTGW.tags;
  let widgets = window.IoTGW.widgets;
  let widgetnames = this.widgets;
  for (let widgetname of widgetnames) {
    let widget = widgets[widgetname];
    VLVDmin_updatewidget (widget) 
  }   
}

function VLVDmin_updatewidget (widget) {
  let tagname =  widget.tag;
  const tag = window.IoTGW.RT[tagname];
  if (!tag) {
    console.log ('ВМ ' + tagname + ' не знайдено!')
    return;
  } 
  const offclr = '#7F7F7F';
  const onclr = '#FAFAFA';
  const imclr =  '#AAAAAA';
  const VMclr = (tag.OPND) && ((tag.OPND.val === true) || (tag.OPNING.val === true)) ? onclr : offclr;
  const VLVclr = (tag.OPND) && (tag.OPND.val === true) ? onclr : (tag.CLSD.val === true) ? offclr : imclr; 
  
  let tagnamear = tagname.split('.');
  tagname = tagnamear[tagnamear.length-1];
  htmlel = widget.svg.contentDocument;//html.childNodes[0];//.contentDocument
  htmlel.querySelector('.ALM').style.visibility = tag.ALM && tag.ALM.val === true ? 'visible': 'hidden';
  htmlel.querySelector('.WRN').style.visibility = tag.WRN && tag.WRN.val === true ? 'visible': 'hidden';
  htmlel.querySelector('.BAD').style.visibility = 'hidden';
  htmlel.querySelector('.SML').style.visibility = tag.SML && tag.SML.val === true ? 'visible': 'hidden';
  htmlel.querySelector('.DISP').style.visibility = tag.DISP && tag.DISP.val === true ? 'visible': 'hidden';
  htmlel.querySelector('.MANBX').style.visibility = tag.MANBX && tag.MANBX.val === true ? 'visible': 'hidden';
  htmlel.querySelector('.INIOTBUF').style.visibility = tag.INIOTBUF && tag.INIOTBUF.val === true ? 'visible': 'hidden';
  htmlel.querySelector('.BACKGRND').style.visibility = (window.IoTGW && window.IoTGW.selid === widget.id)? 'visible': 'hidden';
  for (let el of htmlel.querySelectorAll('.VM')) {el.style.fill = VMclr};
  for (let el of htmlel.querySelectorAll('.VLV')) {el.style.fill = VLVclr};
  htmlel.querySelector('.STATXT').innerHTML = tag.stapos.bitname;
  htmlel.querySelector('.POSTXT').innerHTML = tag.POS.val;
  htmlel.querySelector('.NAMETXT').innerHTML = tagname;

  //console.log (widget.tag);
}

function VLVDmin_select (wdgtname) {
  //console.log ('click' + ' ' + wdgtname);
  window.IoTGW.selid = wdgtname;
  let wdgt = window.IoTGW.widgets[wdgtname];
  let wdgtCMD =  window.IoTGW.widgets['CMD'];
  let wdgtINFO = window.IoTGW.widgets['INFO'];
  let cmdclass = wdgt.class + 'cmd';
  wdgtCMD.tag = wdgt.tag;
  
  //якщо клас інший, добавити в класи і завантажити скрипт
  if (wdgtCMD.class !== cmdclass) {
    wdgtCMD.class = cmdclass;
    if (!window.IoTGW.classes[cmdclass]) window.IoTGW.classes[cmdclass] = {
      classid: cmdclass, 
      scriptname : cmdclass + '.js', 
      widgets: [],
      updateFn: {}
    };
    window.IoTGW.classes[cmdclass].widgets.push ('CMD');       
    let script = document.createElement('script');
    script.src = window.IoTGW.classes[cmdclass].scriptname;
    document.body.append(script);
    //VLVDmincmd_init ();
  } else {
    VLVDmincmd_addevents ('CMD')
  } 
}
