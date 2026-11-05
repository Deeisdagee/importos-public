'use strict';
const ids=['goods','units','freight','insurance','other','dutyBase','dutyRate','taxBase','taxRate'];
const form=document.getElementById('shipment-form');
const baseline={goods:10000,units:100,freight:1000,insurance:100,other:400,dutyBase:11100,dutyRate:5,taxBase:11655,taxRate:15};
function calculate(v){
 for(const id of ids)if(!Number.isFinite(v[id])||v[id]<0)throw new Error('أكمل جميع الحقول بأرقام صالحة غير سالبة. أدخل 0 عندما لا ينطبق المبلغ.');
 if(!Number.isInteger(v.units)||v.units<1||v.units>1e9)throw new Error('أدخل عدد وحدات صحيحًا بين 1 و1,000,000,000.');
 if(v.dutyRate>100||v.taxRate>100)throw new Error('يجب أن تكون كل نسبة بين 0٪ و100٪.');
 const subtotal=v.goods+v.freight+v.insurance,duty=v.dutyBase*v.dutyRate/100,tax=v.taxBase*v.taxRate/100,total=subtotal+duty+tax+v.other;
 if(![subtotal,duty,tax,total,total/v.units].every(Number.isFinite))throw new Error('الأرقام كبيرة جدًا؛ راجع المدخلات.');
 return {subtotal,duty,tax,total,extras:v.other,perUnit:total/v.units};
}
const money=n=>new Intl.NumberFormat('ar-SA-u-nu-latn',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' ر.س';
function clear(){for(const id of ['total','subtotal','duty','tax','extras'])document.getElementById(id).textContent='—';document.getElementById('perUnit').textContent='أُجري تعديل. اضغط «احسب التكلفة» لتحديث النتيجة.';}
form.addEventListener('input',()=>{clear();document.getElementById('error').textContent='';});
form.addEventListener('invalid',e=>{e.preventDefault();clear();document.getElementById('error').textContent='راجع المدخلات: أكمل كل الحقول، واستخدم أرقامًا غير سالبة، وعدد وحدات صحيحًا أكبر من صفر، ونسبًا لا تتجاوز 100٪.';},true);
form.addEventListener('submit',e=>{e.preventDefault();clear();try{const v={};for(const id of ids){const raw=document.getElementById(id).value.trim();if(raw==='')throw new Error('أكمل جميع الحقول. أدخل 0 للمبلغ الذي لا ينطبق.');v[id]=Number(raw);}const r=calculate(v);for(const id of ['total','subtotal','duty','tax','extras'])document.getElementById(id).textContent=money(r[id]);document.getElementById('perUnit').textContent=money(r.perUnit)+' للوحدة';document.getElementById('error').textContent='';}catch(error){document.getElementById('error').textContent=error.message;}});
function load(values){for(const id of ids)document.getElementById(id).value=values[id];form.requestSubmit();}
document.getElementById('baseline').addEventListener('click',()=>load(baseline));
document.getElementById('try-example').addEventListener('click',()=>load(baseline));
document.getElementById('higher-freight').addEventListener('click',()=>load({...baseline,freight:1500,dutyBase:11600,taxBase:12180}));
