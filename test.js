const DT1 = new Date('2020, 4, 18 19:29:33');
console.log(DT1.toLocaleTimeString('uk-UA', {
  day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit',
}));// субота, 18 квітня 2020 р., 19:29:33
