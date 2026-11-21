/* Shared confirmations and page navigation, using the site's visual language. */
(function(){
 let current=null;
 function confirmAction(message,options={}){
  if(current)return Promise.resolve(false);
  return new Promise(resolve=>{const trigger=document.activeElement,dialog=document.createElement('dialog');current=dialog;dialog.className='moldae-confirm';dialog.setAttribute('aria-labelledby','moldae-confirm-title');dialog.setAttribute('aria-describedby','moldae-confirm-message');
   const danger=options.danger??/excluir|remover|descartar/i.test(message);
   const heading=document.createElement('h2');heading.id='moldae-confirm-title';heading.textContent=options.title||(danger?'Confirmar exclusão':'Confirmar ação');
   const body=document.createElement('p');body.id='moldae-confirm-message';body.textContent=message;
   const actions=document.createElement('div');actions.className='moldae-confirm-actions';const cancel=document.createElement('button'),accept=document.createElement('button');cancel.type=accept.type='button';cancel.className='btn-outline';cancel.textContent='Cancelar';accept.className=danger?'btn-primary moldae-danger':'btn-primary';accept.textContent=options.confirmLabel||(danger?'Confirmar exclusão':'Continuar');
   let accepted=false;cancel.onclick=()=>dialog.close();accept.onclick=()=>{accepted=true;dialog.close();};dialog.addEventListener('close',()=>{current=null;dialog.remove();if(trigger?.isConnected)trigger.focus();resolve(accepted);},{once:true});actions.append(cancel,accept);dialog.append(heading,body,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
 }
 function createClassification(kind){
  if(current)return Promise.resolve(null);
  return new Promise(resolve=>{const trigger=document.activeElement,dialog=document.createElement('dialog');current=dialog;dialog.className='moldae-confirm';dialog.setAttribute('aria-label','Criar classificação');
   const heading=document.createElement('h2');heading.textContent='Criar '+(kind==='type'?'tipo de molde':kind==='theme'?'tema':'classificação');const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),status=document.createElement('p'),actions=document.createElement('div'),cancel=document.createElement('button'),submit=document.createElement('button');
   label.className='studio-field';label.textContent='Nome *';input.name='label';input.required=true;input.minLength=2;input.maxLength=80;label.append(input);actions.className='moldae-confirm-actions';cancel.type='button';cancel.className='btn-outline';cancel.textContent='Cancelar';submit.type='submit';submit.className='btn-primary';submit.textContent='Criar e selecionar';status.setAttribute('role','status');actions.append(cancel,submit);form.append(label,status,actions);dialog.append(heading,form);let result=null,saving=false;cancel.onclick=()=>{if(!saving)dialog.close();};dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});
   form.onsubmit=async e=>{e.preventDefault();if(saving)return;saving=true;submit.disabled=cancel.disabled=true;status.textContent='Salvando…';try{const response=await fetch('/api/admin/taxonomies',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({kind,label:input.value.trim()})}),data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível salvar a classificação.');result={...data,kind};saving=false;dialog.close();}catch(error){status.textContent=error.message;saving=false;submit.disabled=cancel.disabled=false;}};
   dialog.addEventListener('close',()=>{current=null;dialog.remove();if(trigger?.isConnected)trigger.focus();resolve(result);},{once:true});document.body.append(dialog);dialog.showModal();input.focus();
  });
 }
 window.MoldaeUI={confirm:confirmAction,createClassification};
 const top=document.createElement('button');top.type='button';top.className='moldae-back-top';top.hidden=true;top.setAttribute('aria-label','Voltar ao topo');top.title='Voltar ao topo';top.textContent='↑';document.body.append(top);
 const update=()=>{top.hidden=window.scrollY<Math.min(400,window.innerHeight/2)||document.body.classList.contains('studio-editing');};window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);window.addEventListener('hashchange',update);top.onclick=()=>{window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};update();
})();
