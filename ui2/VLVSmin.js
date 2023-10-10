// console.log ("VLVSmin.js завантажено");

// початкова ініціалізація
VLVSmin_init();

// пошук і зповнення своїх віджетів з посиланням на себе
function VLVSmin_init() {
  const { widgets } = window.IoTGW;
  const svgfile = 'VLVSmin.svg';
  const classname = 'VLVSmin';
  // пошук і заповнення віджетів
  for (wdgtname of window.IoTGW.classes[classname].widgets) {
    const wdgt = widgets[wdgtname];
    const elm = wdgt.html;
    const wdgtid = wdgt.id;
    wdgt.svgid = `svg${wdgtid}`;
    elm.innerHTML = `<object onload = "VLVSmin_onload('${wdgtname}')" id="${wdgt.svgid}" type="image/svg+xml" data="${svgfile}">Your browser does not support SVG </object>`;
    wdgt.svg = wdgt.html.childNodes[0];
    if (window.IoTGW.selid.length < 1) {
      VLVSmin_select(wdgtname);
      // window.IoTGW.selid = wdgtname
    }
    // console.log (htmlel);
  }
  window.IoTGW.classes[classname].updateFn = VLVSmin_update;
}

// при ініціалізації добавити події
function VLVSmin_onload(wdgtname) {
  // добавлення подій
  const htmlel = window.IoTGW.widgets[wdgtname].svg.contentDocument;
  htmlel.querySelector('.VLVS').setAttribute('onclick', `top.VLVSmin_select ('${wdgtname}')`);
  // console.log (htmlel.querySelector('.VLVS'));

  // підрівняти svg під розміри
  const svgel = htmlel.querySelector('.VLVS');
  // console.log (svgel);
  const height = parseInt(svgel.getAttribute('height'));
  const width = parseInt(svgel.getAttribute('width'));
  window.IoTGW.widgets[wdgtname].html.setAttribute('height', height + 22);
  window.IoTGW.widgets[wdgtname].html.setAttribute('width', width + 22);
  window.IoTGW.widgets[wdgtname].svg.setAttribute('height', height + 20);
  window.IoTGW.widgets[wdgtname].svg.setAttribute('width', width + 20);
}

function VLVSmin_update() {
  const { tags } = window.IoTGW;
  const { widgets } = window.IoTGW;
  const widgetnames = this.widgets;
  for (const widgetname of widgetnames) {
    const widget = widgets[widgetname];
    VLVSmin_updatewidget(widget);
  }
}

function VLVSmin_updatewidget(widget) {
  let tagname = widget.tag;
  const tag = window.IoTGW.RT[tagname];
  const offclr = '#7F7F7F';
  const onclr = '#FAFAFA';
  const imclr = '#AAAAAA';
  const VMclr = (tag.OPND) && ((tag.OPND.val === true) || (tag.OPNING.val === true)) ? onclr : offclr;
  const VLVclr = (tag.OPND) && (tag.OPND.val === true) ? onclr : (tag.CLSD.val === true) ? offclr : imclr;

  const tagnamear = tagname.split('.');
  tagname = tagnamear[tagnamear.length - 1];
  htmlel = widget.svg.contentDocument;// html.childNodes[0];//.contentDocument
  htmlel.querySelector('.ALM').style.visibility = tag.ALM && tag.ALM.val === true ? 'visible' : 'hidden';
  htmlel.querySelector('.WRN').style.visibility = tag.WRN && tag.WRN.val === true ? 'visible' : 'hidden';
  htmlel.querySelector('.BAD').style.visibility = 'hidden';
  htmlel.querySelector('.SML').style.visibility = tag.SML && tag.SML.val === true ? 'visible' : 'hidden';
  htmlel.querySelector('.DISP').style.visibility = tag.DISP && tag.DISP.val === true ? 'visible' : 'hidden';
  htmlel.querySelector('.MANBX').style.visibility = tag.MANBX && tag.MANBX.val === true ? 'visible' : 'hidden';
  htmlel.querySelector('.INIOTBUF').style.visibility = tag.INIOTBUF && tag.INIOTBUF.val === true ? 'visible' : 'hidden';
  htmlel.querySelector('.BACKGRND').style.visibility = (window.IoTGW.selid === widget.id) ? 'visible' : 'hidden';
  for (const el of htmlel.querySelectorAll('.VM')) { el.style.fill = VMclr; }
  for (const el of htmlel.querySelectorAll('.VLV')) { el.style.fill = VLVclr; }
  htmlel.querySelector('.STATXT').innerHTML = tag.stapos.bitname;
  htmlel.querySelector('.POSTXT').innerHTML = tag.POS.val;
  htmlel.querySelector('.NAMETXT').innerHTML = tagname;

  // console.log (widget.tag);
}

function VLVSmin_select(wdgtname) {
  // console.log ('click' + ' ' + wdgtname);
  window.IoTGW.selid = wdgtname;
  const wdgt = window.IoTGW.widgets[wdgtname];
  const wdgtCMD = window.IoTGW.widgets.CMD;
  const wdgtINFO = window.IoTGW.widgets.INFO;
  const cmdclass = `${wdgt.class}cmd`;
  wdgtCMD.tag = wdgt.tag;

  // якщо клас інший, добавити в класи і завантажити скрипт
  if (wdgtCMD.class !== cmdclass) {
    wdgtCMD.class = cmdclass;
    if (!window.IoTGW.classes[cmdclass]) {
      window.IoTGW.classes[cmdclass] = {
        classid: cmdclass,
        scriptname: `${cmdclass}.js`,
        widgets: [],
        updateFn: {},
      };
    }
    window.IoTGW.classes[cmdclass].widgets.push('CMD');
    const script = document.createElement('script');
    script.src = window.IoTGW.classes[cmdclass].scriptname;
    document.body.append(script);
    // VLVSmincmd_init ();
  } else {
    VLVSmincmd_addevents('CMD');
  }
}
