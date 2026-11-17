'use strict';
function numericValue(value){
 if(value===null||value===undefined||typeof value==='boolean'||String(value).trim()==='')return null;
 const number=Number(value);return Number.isFinite(number)?number:null;
}
function formatMoneyUSD(value){
 const number=numericValue(value);return number===null?'미확인':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(number);
}
function formatTokenUSD(value){
 const number=numericValue(value);if(number===null||number<=0)return '가격 미확인';
 if(number<1e-12)return '$'+number.toExponential(5);
 return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumSignificantDigits:6}).format(number);
}
