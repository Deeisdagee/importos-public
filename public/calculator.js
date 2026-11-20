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
// Customs/tax bases are official, user-entered values: never silently recompute them.
// These dependencies are review prompts, NOT a legal formula for customs valuation.
const basisDependencies={
 goods:['dutyBase','taxBase'],
 freight:['dutyBase','taxBase'],
 insurance:['dutyBase','taxBase'],
 dutyBase:['taxBase'],
 dutyRate:['taxBase']
};
const basisSources=Object.keys(basisDependencies);
const captureBasisSources=()=>Object.fromEntries(basisSources.map(id=>[id,document.getElementById(id).value.trim()]));
let lastReviewedSources=captureBasisSources();
function pendingBases(){
 const pending=new Set();
 for(const [source,affected] of Object.entries(basisDependencies)){
  const current=document.getElementById(source).value.trim();
  if(current===''||Number(current)!==Number(lastReviewedSources[source]))for(const id of affected)pending.add(id);
 }
 return pending;
}
const assumptions=form.querySelector('details.assumptions');
form.querySelector('.form-actions').insertAdjacentHTML('beforebegin',`<div id="basis-warning" class="basis-warning" role="status" aria-live="polite" hidden>
 <strong>تنبيه: راجع أسس الرسوم والضريبة</strong>
 <p id="basis-warning-text"></p>
 <div class="basis-warning-actions">
  <button id="review-bases" type="button">فتح الأسس للمراجعة</button>
  <button id="confirm-bases" type="button">أؤكد أنني راجعت الأسس المدخلة</button>
 </div>
</div>`);
const basisWarning=document.getElementById('basis-warning');
const basisWarningText=document.getElementById('basis-warning-text');
const confirmBases=document.getElementById('confirm-bases');
const resultBasisWarning=document.createElement('p');
resultBasisWarning.id='result-basis-warning';
resultBasisWarning.className='result-basis-warning';
resultBasisWarning.textContent='تقدير مبدئي: استُخدمت الأسس المدخلة كما هي، وقد تحتاج مراجعة قبل الاعتماد.';
resultBasisWarning.hidden=true;
document.getElementById('perUnit').insertAdjacentElement('afterend',resultBasisWarning);
function renderBasisWarning(){
 const changedBases=pendingBases();
 const pending=changedBases.size>0;
 basisWarning.hidden=!pending;
 resultBasisWarning.hidden=!pending||document.getElementById('total').textContent==='—';
 confirmBases.disabled=!assumptions.open;
 if(pending){
  const affected=[...changedBases].map(id=>id==='dutyBase'?'أساس الرسم الجمركي':'أساس ضريبة الاستيراد');
  const message='تغيّرت مدخلات قد تؤثر في '+affected.join(' و')+'. لا تُحدّث الحاسبة هذه القيم تلقائيًا. راجعها مع الجهة الرسمية أو المخلّص، ثم أكّد مراجعتك.';
  if(basisWarningText.textContent!==message)basisWarningText.textContent=message;
 }
}
assumptions.addEventListener('toggle',renderBasisWarning);
document.getElementById('review-bases').addEventListener('click',()=>{
 assumptions.open=true;
 document.getElementById(pendingBases().has('dutyBase')?'dutyBase':'taxBase').focus();
});
confirmBases.addEventListener('click',()=>{
 if(!assumptions.open)return;
 lastReviewedSources=captureBasisSources();
 renderBasisWarning();
});
form.addEventListener('input',e=>{
 clear();
 document.getElementById('error').textContent='';
 renderBasisWarning();
});
form.addEventListener('invalid',e=>{e.preventDefault();clear();document.getElementById('error').textContent='راجع المدخلات: أكمل كل الحقول، واستخدم أرقامًا غير سالبة، وعدد وحدات صحيحًا أكبر من صفر، ونسبًا لا تتجاوز 100٪.';},true);
form.addEventListener('submit',e=>{e.preventDefault();clear();try{const v={};for(const id of ids){const raw=document.getElementById(id).value.trim();if(raw==='')throw new Error('أكمل جميع الحقول. أدخل 0 للمبلغ الذي لا ينطبق.');v[id]=Number(raw);}const r=calculate(v);for(const id of ['total','subtotal','duty','tax','extras'])document.getElementById(id).textContent=money(r[id]);document.getElementById('perUnit').textContent=money(r.perUnit)+' للوحدة';document.getElementById('error').textContent='';renderBasisWarning();}catch(error){document.getElementById('error').textContent=error.message;}});
function load(values){for(const id of ids)document.getElementById(id).value=values[id];lastReviewedSources=captureBasisSources();renderBasisWarning();form.requestSubmit();}
document.getElementById('baseline').addEventListener('click',()=>load(baseline));
document.getElementById('try-example').addEventListener('click',()=>load(baseline));
document.getElementById('higher-freight').addEventListener('click',()=>load({...baseline,freight:1500,dutyBase:11600,taxBase:12180}));
