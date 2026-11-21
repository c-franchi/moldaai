import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import '../public/mold-classification.js';
const source=readFileSync(new URL('../public/store.js',import.meta.url),'utf8');
const products=[{id:'milk-safari',title:'Caixa Milk Lucca',type:'Caixa Milk',types:['Caixa Milk'],theme:'Safari',price:690},{id:'milk-garden',title:'Caixa Milk Bruno',type:'Caixa Milk',types:['Caixa Milk'],theme:'Jardim',price:890},{id:'topper',title:'Topper Safari',type:'Topper',types:['Topper'],theme:'Safari',price:490}];
const scope=vm.createContext({MoldaeMolds:globalThis.MoldaeMolds,PRODUCTS:products,money:n=>String(n),escapeHTML:s=>String(s)});
vm.runInContext(source.slice(source.indexOf('function moldType('),source.indexOf("document.addEventListener('change',e=>{if(e.target.matches('[data-mold-theme]')")),scope);
test('store groups by mold type and keeps exact product IDs and prices for theme choice',()=>{const groups=scope.groupMolds(products);assert.equal(groups.length,2);assert.equal(groups[0].moldLabel,'Caixa Milk');assert.equal(groups[0].moldVariants,2);assert.equal(groups[0].price,690);assert.equal(groups[0].id,'milk-safari');const picker=scope.moldThemePicker(products[0]);assert.match(picker,/milk-garden/);assert.match(picker,/Safari/);assert.match(picker,/Jardim/);assert.doesNotMatch(picker,/value="topper"/);});
test('uncategorized products do not group into one misleading mold and kits stay separate',()=>{assert.equal(scope.groupMolds([{id:'a',name:'A',price:1},{id:'b',name:'B',price:2}]).length,2);assert.equal(scope.moldKey({...products[0],is_kit:true}),scope.moldKey(products[0]));assert.notEqual(scope.moldKey({id:'studio-kit-a',title:'Kit Jardim'}),scope.moldKey({id:'studio-kit-b',title:'Kit Safari'}));});

test('regression: wrongly checked kit flag never mixes tags, toppers and candy boxes',()=>{const examples=[{id:'tag',title:'Tag retangular Safari Baby Moderno',is_kit:1},{id:'topper',title:'Toppers Safari Baby Moderno',is_kit:1},{id:'candy',title:'Caixa Bala Safari Baby Moderno',is_kit:1},{id:'garden',title:'Jardim Encantado',is_kit:1}];assert.equal(new Set(examples.map(scope.moldKey)).size,4);assert.equal(scope.moldType(examples[0]),'Tag retangular');assert.equal(scope.groupMolds(examples).length,4);});
test('round and rectangular tags and contradictory classifications remain separate',()=>{assert.notEqual(scope.moldKey({id:'r',title:'Tag redonda',types:['Tags']}),scope.moldKey({id:'t',title:'Tag retangular',types:['Tags']}));assert.match(scope.moldKey({id:'bad',title:'Topper',types:['Caixa Milk']}),/^product:/);});
