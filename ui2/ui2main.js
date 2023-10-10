let divstatusbar; let divtimestatus; let divnavigation; let divmain; let
  divtopbar;
let menu;
let timersta;
const xhttpsta = new XMLHttpRequest();
const ui2main_url = '/apiv1/RT/plccfg/STA';
xhttpsta.open('GET', ui2main_url, true);
xhttpsta.send();
const step = 0;
const staalm_perm = {};
const twns = {};

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const page = path.split('/').pop();
  // console.log( page );

  divmenu = document.createElement('div');
  divmenu.id = 'menu';
  divmenu.innerHTML = `
  <a href="index.html">Main</a>
  <a href="modules.html">MODULES</a>
  <a href="vars.html">VARS</a>
  <a href="acth.html">ACTS</a>
  <a href="svggen.html">svggen</a>
  `;
  switch (page) {
    case 'modules.html':
      divmenu.innerHTML += '<a href="chreports.html">DefTagMap</a>';
      break;

    default:
      break;
  }
  divtopbar = document.createElement('div');
  divtopbar.innerHTML = ` 
    <div id="navigation"></div>
    <div id="statusbar">BAR</div>
    <div id="timestatus">BAR</div>`;
  divtopbar.id = 'topbar';
  // let div1 = document.querySelector('div');
  // console.log (div1);
  document.body.prepend(divtopbar);
  document.body.prepend(divmenu);

  const cssstyle = document.createElement('style');
  cssstyle.innerHTML = csshtml;
  document.head.append(cssstyle);

  divstatusbar = document.getElementById('statusbar');
  divtimestatus = document.getElementById('timestatus');
  divnavigation = document.getElementById('navigation');

  // divstatusbar.style.margin = '10px auto'; //тут налаштовуються стилі за замовченням
  divstatusbar.innerHTML = '<p>plcstatus</p>';// тимчасовий текст
  // divtimestatus.style.margin = '5px';
  divtimestatus.innerHTML = '<p>time</p>';

  // console.log (divstatusbar);
  timersta = setInterval(() => {
    divtimestatus.innerHTML = `${new Date().toLocaleString()}`;
    // console.log (xhttpsta.readyState);
    if (xhttpsta.readyState > 1 && xhttpsta.readyState < 4) return;
    xhttpsta.open('GET', ui2main_url, true);
    xhttpsta.send();
  }, 1000);
});

xhttpsta.onreadystatechange = function () {
  if (this.readyState === 4 && this.status === 200) {
    // console.log (xhttpsta.getResponseHeader('Content-Type'));
    let content;
    try {
      content = JSON.parse(xhttpsta.responseText);
    } catch (e) {
      console.log(`Помилка ${e} ${xhttpsta.responseText}`);
    }
    if (content.p && content.twn && content.v && content.ts) {
      if (typeof (twns[content.twn]) === 'undefined') twns[content.twn] = {};
      const twn = twns[content.twn];
      const v = twn[content.p] = content.v;
      for (prop in v) {
        staalm_perm[prop] = v[prop];
      }
      if (divstatusbar && staalm_perm.ALM && staalm_perm.FRC) { // STA
        const bodysta = updateSTA(staalm_perm);
        divstatusbar.innerHTML = bodysta;
      }
    }
  }
};

// https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
const stahmicfg = {
  PLCSIM: {
    text: 'PLCSIM', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'green'],
  },
  CON2ERR: {
    text: 'CON2ERR', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'red'],
  },
  PLC2STOP: {
    text: 'PLC2STOP', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'red'],
  },
  BLK: {
    text: 'BLK', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  ALDIS: {
    text: 'ALDIS', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  DION: {
    text: 'DION', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  DIOERR: {
    text: 'DIOERR', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  DBLCKALL: {
    text: 'DBLCKALL', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  FRC: {
    text: 'FRC', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  SMLALL: {
    text: 'SMLALL', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  DISP: {
    text: 'DISP', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  FRC2: {
    text: 'FRC2', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  FRC1: {
    text: 'FRC1', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  SCN1: {
    text: 'SCN1', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  FRC0: {
    text: 'FRC0', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  SML: {
    text: 'SML', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  CMACK: {
    text: 'CMACK', vis: false, color: ['black', 'black'], bgcolor: ['silver', 'blue'],
  },
  ALM: {
    text: 'ALM', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'red'],
  },
  WRN: {
    text: 'WRN', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'yellow'],
  },
  BAD: {
    text: 'BAD', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'magenta'],
  },
  EMCYSTP: {
    text: 'EMCYSTP', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'red'],
  },
  PLCERR: {
    text: 'PLCERR', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'red'],
  },
  CONHIERR: {
    text: 'CONHIERR', vis: true, color: ['black', 'black'], bgcolor: ['silver', 'red'],
  },
};

function updateSTA(sta_perm) {
  let body = `<table style="border-collapse: collapse; width: 100%; height: 20px;" border="1">
  <tbody><tr style="height: 20px;">`;
  for (const bitname in sta_perm) {
    stabit = sta_perm[bitname];
    if (typeof (stabit) === 'object' && stahmicfg[bitname] && stahmicfg[bitname].vis === true) {
      let color; let
        bgcolor;
      if (stabit.val === false) {
        color = stahmicfg[bitname].color[0];
        bgcolor = stahmicfg[bitname].bgcolor[0];
      } else {
        color = stahmicfg[bitname].color[1];
        bgcolor = stahmicfg[bitname].bgcolor[1];
      }
      const td = `<td style="width: 10%; height: 20px; color: ${color} ; background-color: ${bgcolor};">${stahmicfg[bitname].text}</td>`;
      body += `${td}\n`;
    }
  }
  body += '</tr></tbody></table>';
  return body;
}

var csshtml = `
#menu {
  text-align: center;
  height: 25px;
}
#topbar {
  display: flex;
  margin-top: 5px;
  text-align: center;
  height: 30px;
  vertical-align: middle;
}
#statusbar {
  display: inline;
  float:left;
  width: 70%;
  margin: auto;
}
#timestatus {
  display: inline;
  width: 20%;
  margin: auto;
}`;
// margin-left: 1%;
// margin-right: 1%;
