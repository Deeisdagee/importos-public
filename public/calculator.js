function calculateShipment(v) {
  for (const key of ['goods','freight','insurance','other','dutyBase','taxBase','dutyRate','taxRate','units']) {
    if (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0) throw new Error('Enter a valid non-negative number in every numeric field.');
  }
  if (!Number.isInteger(v.units) || v.units < 1 || v.units > 1e9) throw new Error('Units must be a whole number between 1 and 1,000,000,000.');
  if (v.dutyRate > 100 || v.taxRate > 100) throw new Error('Rates must be between 0 and 100.');
  const base = v.goods + v.freight + v.insurance;
  const duty = v.dutyBase * v.dutyRate / 100;
  const tax = v.taxBase * v.taxRate / 100;
  const total = base + duty + tax + v.other;
  return {base,duty,tax,total,perUnit:total/v.units};
}
if (typeof module !== 'undefined') module.exports = {calculateShipment};
if (typeof document !== 'undefined') {
  const form = document.getElementById('cost-form');
  const clear = () => {for(const id of ['total','base','duty','tax','otherResult']) document.getElementById(id).textContent='—'; document.getElementById('perUnit').textContent='Calculate to see cost per unit.';};
  form.addEventListener('input',clear);
  form.addEventListener('reset',()=>{clear();document.getElementById('error').textContent='';});
  form.addEventListener('submit', e => {
    e.preventDefault();clear();
    try {
      const v = {};
      for(const id of ['goods','freight','insurance','other','dutyBase','taxBase','dutyRate','taxRate','units']) {
        const raw=document.getElementById(id).value.trim();
        if(raw==='') throw new Error('Complete every numeric field. Enter 0 where appropriate.');
        v[id]=Number(raw);
      }
      const r=calculateShipment(v), currency=document.getElementById('currency').value.trim();
      if(!currency) throw new Error('Enter a currency label.');
      const money=x=>currency+' '+x.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
      for(const id of ['total','base','duty','tax']) document.getElementById(id).textContent=money(r[id]);
      document.getElementById('otherResult').textContent=money(v.other);
      document.getElementById('perUnit').textContent=money(r.perUnit)+' per unit';
      document.getElementById('error').textContent='';
    } catch(err) {document.getElementById('error').textContent=err.message;}
  });
  document.getElementById('print').addEventListener('click',()=>window.print());
}
