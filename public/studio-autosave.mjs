// Serializes saves; an older response never replaces edits made in flight.
export class DraftSaver {
 constructor({snapshot,send,accepted,state,storage,key,delay=1000}){Object.assign(this,{snapshot,send,accepted,state,storage,key,delay});this.sequence=0;this.pending=false;this.conflict=false;this.timer=null;this.running=null;}
 backup(){try{const t=this.snapshot();if(t)this.storage.setItem(this.key(t),JSON.stringify({template:t,at:Date.now()}));this.localOK=true;return true;}catch{this.localOK=false;this.state('local-error');return false;}}
 changed(){this.sequence++;this.pending=true;this.backup();if(!this.conflict){if(this.localOK)this.state('pending');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),this.delay);}}
 async flush(){if(this.cancelled)return;clearTimeout(this.timer);if(this.running){await this.running;if(this.pending&&!this.conflict)return this.flush();return;}if(!this.pending||this.conflict)return;
 const payload=structuredClone(this.snapshot()),sequence=this.sequence;this.state('saving');
 this.running=(async()=>{try{const result=await this.send(payload);this.accepted(result,payload,sequence===this.sequence);this.pending=sequence!==this.sequence;if(!this.pending){try{this.storage.removeItem(this.key(payload));}catch{}this.state('saved');}else{this.backup();this.state('pending');}}catch(e){this.backup();if(e.status===409){this.conflict=true;this.state('conflict',e);}else{this.state(this.localOK?'error':'error-no-local',e);if(!e.status||e.status>=500)this.timer=setTimeout(()=>this.flush().catch(()=>{}),10000);}throw e;}finally{this.running=null;}})();await this.running;if(this.pending&&!this.conflict&&!this.cancelled){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),this.delay);}
 }
 cancel(){this.cancelled=true;clearTimeout(this.timer);}
}
