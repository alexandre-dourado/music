// ════════════════════════════════════════════════════════════
//  FANTASMA — Code.gs
//  ✅ Edite os IDs abaixo conforme seu projeto
// ════════════════════════════════════════════════════════════

const SS_ID    = '1OkbnwXbNjrsBRvN-q1dQ2abvu3YIXkgvwrJ6USCcZQk';
const F_AUDIOS = '1cxA2v4sP3KPaHvE9ZolXTbv27ITjIOxs';
const F_LETRAS = '1Mnpf1zvKVG75a2F14r5ks-dmnP0o8S9j';
const F_CAPAS  = '12V0e1UlJTehjk075O6Vp8HBeq-Rc3Ob0';
const TTL      = 300;

function ss()  { return SpreadsheetApp.openById(SS_ID); }
function sh(n) { return ss().getSheetByName(n); }
function clearCache() { const c=CacheService.getScriptCache(); c.remove('musicas'); c.remove('fb_map'); }
function rows(sheet) { const v=sheet.getDataRange().getValues(); if(v.length<2)return[]; const[hdr,...data]=v; return data.map(r=>Object.fromEntries(hdr.map((h,i)=>[h,r[i]]))); }
function safe(m) { return {id:String(m.id||''),titulo:String(m.titulo||''),audio_id:String(m.audio_id||''),letra_id:String(m.letra_id||''),capa_id:String(m.capa_id||''),notas_autor:String(m.notas_autor||''),ordem:Number(m.ordem)||0,data_publicacao:m.data_publicacao?String(m.data_publicacao):''}; }

function doGet(e) {
  const fn=e.parameter.fn;
  if(fn){
    const allowed=['getMusicas','getLyrics'];
    const out=d=>ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);
    if(!allowed.includes(fn)) return out({error:'not allowed'});
    try{
      const args=e.parameter.args?JSON.parse(e.parameter.args):[];
      if(fn==='getMusicas') return out(getMusicas());
      if(fn==='getLyrics')  return out(getLyrics(args[0]||''));
    }catch(err){ return ContentService.createTextOutput(JSON.stringify({error:err.message})).setMimeType(ContentService.MimeType.JSON); }
  }
  const t=HtmlService.createTemplateFromFile('index');
  t.page=e.parameter.page||'gallery'; t.musicId=e.parameter.id||'';
  return t.evaluate().setTitle('Diori e a Trupe Fantasma').addMetaTag('viewport','width=device-width,initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(f) { return HtmlService.createHtmlOutputFromFile(f).getContent(); }

function getMusicas() {
  const cache=CacheService.getScriptCache(), hit=cache.get('musicas');
  if(hit) return JSON.parse(hit);
  const sheet=sh('musicas'); if(!sheet) return [];
  const all=rows(sheet);
  const pub=all.filter(m=>String(m.publicar).toUpperCase()==='TRUE').sort((a,b)=>Number(a.ordem)-Number(b.ordem)).map(safe);
  const fm=feedbackMap();
  pub.forEach(m=>{ m.feedback=fm[m.id]||{media_nota:null,total_notas:0,reacoes:{}}; });
  const out=JSON.stringify(pub);
  cache.put('musicas',out,TTL);
  return JSON.parse(out);
}

function getLyrics(letraId) {
  if(!letraId) return '';
  if(letraId.includes('/')) return ''; // caminho local — front busca via fetch
  const cache=CacheService.getScriptCache(), key='lyr_'+letraId, hit=cache.get(key);
  if(hit) return hit;
  try{ const txt=DriveApp.getFileById(letraId).getBlob().getDataAsString('UTF-8'); cache.put(key,txt,TTL*6); return txt; }catch(e){ return ''; }
}

function submitFeedback(p) {
  const{musica_id,nota,reacao,comentario,user_hash}=p;
  if(!musica_id) throw new Error('musica_id obrigatório');
  if(nota!=null&&(isNaN(nota)||nota<1||nota>5)) throw new Error('nota inválida');
  if(reacao&&!['👍','🔥','💭',''].includes(reacao)) throw new Error('reação inválida');
  const cmt=String(comentario||'').replace(/<[^>]*>/g,'').substring(0,1000);
  sh('feedback').appendRow([new Date(),String(musica_id),nota?Number(nota):'',reacao||'',cmt,String(user_hash||'').substring(0,64)]);
  clearCache(); return{success:true};
}

function feedbackMap() {
  const cache=CacheService.getScriptCache(), hit=cache.get('fb_map');
  if(hit) return JSON.parse(hit);
  const sheet=sh('feedback'); if(!sheet||sheet.getLastRow()<2) return {};
  const data=sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues();
  const map={};
  data.forEach(([,id,nota,reacao])=>{ if(!id)return; if(!map[id])map[id]={notas:[],reacoes:{}}; if(nota!==''&&!isNaN(nota))map[id].notas.push(Number(nota)); if(reacao)map[id].reacoes[reacao]=(map[id].reacoes[reacao]||0)+1; });
  const out={};
  Object.keys(map).forEach(id=>{ const{notas,reacoes}=map[id]; out[id]={media_nota:notas.length?Math.round(notas.reduce((a,b)=>a+b,0)/notas.length*10)/10:null,total_notas:notas.length,reacoes}; });
  cache.put('fb_map',JSON.stringify(out),TTL); return out;
}

function adminGetAll() { const sheet=sh('musicas'); if(!sheet)return[]; const fm=feedbackMap(); return rows(sheet).map(m=>({...m,publicar:String(m.publicar).toUpperCase()==='TRUE',feedback:fm[m.id]||{media_nota:null,total_notas:0,reacoes:{}}})); }

function adminUpdate(id,updates) {
  const sheet=sh('musicas');
  const[hdr,...data]=sheet.getDataRange().getValues();
  const idx=data.findIndex(r=>String(r[hdr.indexOf('id')])===String(id));
  if(idx<0) throw new Error('Não encontrada: '+id);
  Object.entries(updates).forEach(([field,val])=>{ const col=hdr.indexOf(field); if(col>=0)sheet.getRange(idx+2,col+1).setValue(val); });
  clearCache(); return{success:true};
}

function adminDelete(id) {
  const sheet=sh('musicas');
  const[hdr,...data]=sheet.getDataRange().getValues();
  const idx=data.findIndex(r=>String(r[hdr.indexOf('id')])===String(id));
  if(idx<0) throw new Error('Não encontrada');
  sheet.deleteRow(idx+2); clearCache(); return{success:true};
}

function adminTogglePublish(id) { const all=adminGetAll(); const s=all.find(x=>String(x.id)===String(id)); if(!s)throw new Error('Não encontrada'); return adminUpdate(id,{publicar:s.publicar?'FALSE':'TRUE'}); }

// ── CORRIGIR CAMINHOS LOCAIS ─────────────────────────────────
// Transforma titulo "Minha Música" em caminho "audios/minha-musica.mp3"
function adminFixLocalPaths() {
  const all=adminGetAll();
  const updated=[],skipped=[];
  all.forEach(m=>{
    const slug=toSlug(m.titulo);
    if(!slug){skipped.push(m.titulo+' (título vazio)');return;}
    const updates={};
    if(!String(m.audio_id).includes('/')) updates.audio_id='audios/'+slug+'.mp3';
    if(!String(m.letra_id).includes('/')) updates.letra_id='letras/'+slug+'.txt';
    if(!String(m.capa_id).includes('/'))  updates.capa_id ='capas/' +slug+'.jpg';
    if(Object.keys(updates).length>0){ adminUpdate(m.id,updates); updated.push(m.titulo+' → '+slug); }
    else skipped.push(m.titulo+' (já local)');
  });
  clearCache(); return{updated,skipped};
}

function toSlug(str) {
  return String(str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');
}

// ── SCAN DRIVE ────────────────────────────────────────────────
function adminScanFolders() {
  if(!F_AUDIOS) return{error:'F_AUDIOS não configurado'};
  const sheet=sh('musicas'),existing=rows(sheet),existingIds=new Set(existing.map(m=>String(m.audio_id)));
  const lyricMap={},coverMap={};
  if(F_LETRAS){const it=DriveApp.getFolderById(F_LETRAS).getFiles();while(it.hasNext()){const f=it.next();lyricMap[stemName(f.getName())]=f.getId();}}
  if(F_CAPAS){const it=DriveApp.getFolderById(F_CAPAS).getFiles();while(it.hasNext()){const f=it.next();coverMap[stemName(f.getName())]=f.getId();}}
  const added=[],skipped=[];
  let order=existing.length?Math.max(...existing.map(m=>Number(m.ordem)||0))+1:1;
  const it=DriveApp.getFolderById(F_AUDIOS).getFiles();
  while(it.hasNext()){
    const file=it.next(),fid=file.getId(),name=file.getName(),s=stemName(name);
    if(!file.getMimeType().startsWith('audio/')&&!name.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)){skipped.push(name+' (não é áudio)');continue;}
    if(existingIds.has(fid)){skipped.push(name);continue;}
    const letraId=lyricMap[s]||lyricMap[s.toLowerCase()]||'';
    const capaId=coverMap[s]||coverMap[s.toLowerCase()]||'';
    sheet.appendRow(['auto_'+fid.slice(0,8),s,fid,letraId,capaId,'','FALSE',order,new Date().toISOString().split('T')[0]]);
    order++;added.push(name);
  }
  clearCache(); return{added,skipped};
}

function stemName(n){return n.replace(/\.[^.]+$/,'');}

function adminUploadCover(base64Data,mimeType,filename) {
  if(!F_CAPAS) throw new Error('F_CAPAS não configurado');
  const folder=DriveApp.getFolderById(F_CAPAS);
  const blob=Utilities.newBlob(Utilities.base64Decode(base64Data),mimeType,filename);
  const file=folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  return file.getId();
}

function adminGetFeedback(musicaId) {
  const sheet=sh('feedback'); if(!sheet||sheet.getLastRow()<2)return[];
  return sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues().filter(r=>String(r[1])===String(musicaId)).map(r=>({timestamp:r[0],nota:r[2]||null,reacao:r[3]||'',comentario:r[4]||'',user_hash:String(r[5]).slice(0,10)+'…'}));
}

function adminFlushCache(){clearCache();return{success:true};}
function getConfig(){return{SS_ID,F_AUDIOS,F_LETRAS,F_CAPAS};}
function saveConfig(cfg){return{success:true};}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎵 Fantasma')
    .addItem('Abrir Painel Admin','openAdminPanel')
    .addSeparator()
    .addItem('📁 Corrigir caminhos locais','runFixLocalPaths')
    .addItem('📂 Escanear pasta Drive','runScan')
    .addItem('🔄 Limpar cache','runFlushCache')
    .addToUi();
}

function openAdminPanel() {
  const html=HtmlService.createHtmlOutputFromFile('AdminPanel').setTitle('🎵 Fantasma Admin');
  SpreadsheetApp.getUi().showSidebar(html);
}

function runFixLocalPaths(){
  const r=adminFixLocalPaths();
  SpreadsheetApp.getUi().alert('Caminhos corrigidos!\n\n✅ Atualizadas ('+r.updated.length+'):\n'+(r.updated.map(n=>' • '+n).join('\n')||'  nenhuma')+'\n\n⏭ Sem alteração:\n'+(r.skipped.map(n=>' · '+n).join('\n')||'  nenhuma'));
}

function runScan(){
  const r=adminScanFolders();
  if(r.error){SpreadsheetApp.getUi().alert('❌ '+r.error);return;}
  SpreadsheetApp.getUi().alert('Scan concluído!\n\n✅ Adicionadas: '+r.added.length+'\n'+r.added.map(n=>' • '+n).join('\n'));
}

function runFlushCache(){clearCache();SpreadsheetApp.getUi().alert('✅ Cache limpo!');}

function setupSheets(){
  const s=ss();
  function ensure(name,headers){let sheet=s.getSheetByName(name);if(!sheet){sheet=s.insertSheet(name);sheet.appendRow(headers);sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1a1208').setFontColor('#ffffff');}return sheet;}
  ensure('musicas',['id','titulo','audio_id','letra_id','capa_id','notas_autor','publicar','ordem','data_publicacao']);
  ensure('feedback',['timestamp','musica_id','nota','reacao','comentario','user_hash']);
  Logger.log('✅ Pronto!');
}
