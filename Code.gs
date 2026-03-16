// ════════════════════════════════════════════════════════════
//  FANTASMA — Code.gs   Google Apps Script Backend
//  Run setupSheets() once to initialize. Then use onOpen() menu.
// ════════════════════════════════════════════════════════════

// ── CONFIG ── read from Script Properties (set via Admin Panel)
function CFG() {
  const p = PropertiesService.getScriptProperties().getProperties();
  return {
    SS_ID:    p.SS_ID    || '',
    F_AUDIOS: p.F_AUDIOS || '',
    F_LETRAS: p.F_LETRAS || '',
    F_CAPAS:  p.F_CAPAS  || '',
    CACHE_TTL: 300,
  };
}

// ── WEB APP ──────────────────────────────────────────────────

function doGet(e) {
  const t = HtmlService.createTemplateFromFile('index');
  t.page    = e.parameter.page || 'gallery';
  t.musicId = e.parameter.id   || '';
  return t.evaluate()
    .setTitle('Diori e a Trupe Fantasma')
    .addMetaTag('viewport','width=device-width,initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(f) { return HtmlService.createHtmlOutputFromFile(f).getContent(); }

// ── SHEET HELPERS ─────────────────────────────────────────────

function ss()         { return SpreadsheetApp.openById(CFG().SS_ID); }
function sh(name)     { return ss().getSheetByName(name); }
function rows(sheet)  {
  const v = sheet.getDataRange().getValues();
  if (v.length < 2) return [];
  const [hdr, ...data] = v;
  return data.map(r => Object.fromEntries(hdr.map((h,i) => [h, r[i]])));
}

// ── PUBLIC API ────────────────────────────────────────────────

/** Returns published songs with aggregated feedback. Cached. */
function getMusicas() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('musicas');
  if (hit) return JSON.parse(hit);

  const all = rows(sh('musicas'));
  const pub = all
    .filter(m => String(m.publicar).toUpperCase() === 'TRUE')
    .sort((a,b) => Number(a.ordem) - Number(b.ordem))
    .map(safe);

  const fm = feedbackMap();
  pub.forEach(m => { m.feedback = fm[m.id] || { media_nota:null, total_notas:0, reacoes:{} }; });

  const out = JSON.stringify(pub);
  cache.put('musicas', out, CFG().CACHE_TTL);
  return JSON.parse(out);
}

function getMusica(id) { return getMusicas().find(m => String(m.id)===String(id)) || null; }

/** Returns lyrics text from Drive. Cached per file. */
function getLyrics(letraId) {
  if (!letraId) return '';
  const cache = CacheService.getScriptCache();
  const key = 'lyr_' + letraId;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const txt = DriveApp.getFileById(letraId).getBlob().getDataAsString('UTF-8');
    cache.put(key, txt, CFG().CACHE_TTL * 6);
    return txt;
  } catch(e) { return ''; }
}

/** Submit listener feedback. Validates & sanitizes all input. */
function submitFeedback(p) {
  const { musica_id, nota, reacao, comentario, user_hash } = p;
  if (!musica_id) throw new Error('musica_id é obrigatório');
  if (nota != null && (isNaN(nota) || nota < 1 || nota > 5)) throw new Error('nota deve ser 1-5');
  if (reacao && !['👍','🔥','💭',''].includes(reacao)) throw new Error('reação inválida');
  const safeCmt = String(comentario || '').replace(/<[^>]*>/g,'').substring(0,1000);
  sh('feedback').appendRow([new Date(), String(musica_id), nota?Number(nota):'', reacao||'', safeCmt, String(user_hash||'').substring(0,64)]);
  CacheService.getScriptCache().removeAll();
  return { success: true };
}

// ── FEEDBACK MAP ──────────────────────────────────────────────

function feedbackMap() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('fb_map');
  if (hit) return JSON.parse(hit);
  const sheet = sh('feedback');
  if (sheet.getLastRow() < 2) return {};
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues();
  const map = {};
  data.forEach(([,id,nota,reacao]) => {
    if (!map[id]) map[id] = { notas:[], reacoes:{} };
    if (nota !== '' && !isNaN(nota)) map[id].notas.push(Number(nota));
    if (reacao) map[id].reacoes[reacao] = (map[id].reacoes[reacao]||0) + 1;
  });
  const out = {};
  Object.keys(map).forEach(id => {
    const { notas, reacoes } = map[id];
    out[id] = {
      media_nota: notas.length ? Math.round(notas.reduce((a,b)=>a+b,0)/notas.length*10)/10 : null,
      total_notas: notas.length,
      reacoes,
    };
  });
  cache.put('fb_map', JSON.stringify(out), CFG().CACHE_TTL);
  return out;
}

function safe(m) {
  return { id:m.id, titulo:m.titulo, audio_id:m.audio_id, letra_id:m.letra_id,
           capa_id:m.capa_id, notas_autor:m.notas_autor, ordem:m.ordem,
           data_publicacao: m.data_publicacao ? String(m.data_publicacao) : '' };
}

// ── ADMIN: READ ALL (including unpublished) ───────────────────

function adminGetAll() {
  const all = rows(sh('musicas'));
  const fm = feedbackMap();
  return all.map(m => ({
    ...m,
    publicar: String(m.publicar).toUpperCase() === 'TRUE',
    feedback: fm[m.id] || { media_nota:null, total_notas:0, reacoes:{} },
  }));
}

// ── ADMIN: UPDATE FIELDS ──────────────────────────────────────

function adminUpdate(id, updates) {
  const sheet = sh('musicas');
  const [hdr, ...data] = sheet.getDataRange().getValues();
  const idx = data.findIndex(r => String(r[hdr.indexOf('id')]) === String(id));
  if (idx < 0) throw new Error('Música não encontrada: ' + id);
  const row = idx + 2;
  Object.entries(updates).forEach(([field, val]) => {
    const col = hdr.indexOf(field);
    if (col >= 0) sheet.getRange(row, col+1).setValue(val);
  });
  CacheService.getScriptCache().removeAll();
  return { success: true };
}

function adminDelete(id) {
  const sheet = sh('musicas');
  const [hdr, ...data] = sheet.getDataRange().getValues();
  const idx = data.findIndex(r => String(r[hdr.indexOf('id')]) === String(id));
  if (idx < 0) throw new Error('Não encontrada');
  sheet.deleteRow(idx + 2);
  CacheService.getScriptCache().removeAll();
  return { success: true };
}

function adminTogglePublish(id) {
  const all = adminGetAll();
  const s = all.find(x => String(x.id) === String(id));
  if (!s) throw new Error('Não encontrada');
  return adminUpdate(id, { publicar: s.publicar ? 'FALSE' : 'TRUE' });
}

function adminReorder(ids) {
  ids.forEach((id,i) => adminUpdate(id, { ordem: i+1 }));
  return { success: true };
}

// ── ADMIN: FOLDER SCAN ────────────────────────────────────────

/**
 * Scans /audios folder. Matches /letras and /capas by filename stem.
 * Adds new songs to the sheet (skips existing audio_ids).
 */
function adminScanFolders() {
  const cfg = CFG();
  if (!cfg.F_AUDIOS) return { error: 'Pasta /audios não configurada. Abra Config no painel.' };
  const sheet = sh('musicas');
  const existing = rows(sheet);
  const existingIds = new Set(existing.map(m => String(m.audio_id)));

  // Build lookup maps for letras and capas
  const lyricMap = {}, coverMap = {};
  if (cfg.F_LETRAS) {
    const it = DriveApp.getFolderById(cfg.F_LETRAS).getFiles();
    while (it.hasNext()) { const f=it.next(); lyricMap[stem(f.getName())] = f.getId(); }
  }
  if (cfg.F_CAPAS) {
    const it = DriveApp.getFolderById(cfg.F_CAPAS).getFiles();
    while (it.hasNext()) { const f=it.next(); coverMap[stem(f.getName())] = f.getId(); }
  }

  const added=[], skipped=[];
  let order = existing.length ? Math.max(...existing.map(m=>Number(m.ordem)||0))+1 : 1;

  const audioIt = DriveApp.getFolderById(cfg.F_AUDIOS).getFiles();
  while (audioIt.hasNext()) {
    const file = audioIt.next();
    const id = file.getId(), name = file.getName(), s = stem(name);
    const mime = file.getMimeType();
    // Only audio files
    if (!mime.startsWith('audio/') && !name.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)) { skipped.push(name+' (não é áudio)'); continue; }
    if (existingIds.has(id)) { skipped.push(name); continue; }
    const letraId = lyricMap[s] || lyricMap[s.toLowerCase()] || '';
    const capaId  = coverMap[s] || coverMap[s.toLowerCase()]  || '';
    sheet.appendRow(['auto_'+id.slice(0,8), s, id, letraId, capaId, '', 'FALSE', order, new Date().toISOString().split('T')[0]]);
    order++;
    added.push(name);
  }

  CacheService.getScriptCache().removeAll();
  return { added, skipped };
}

function stem(n) { return n.replace(/\.[^.]+$/,''); }

// ── ADMIN: COVER UPLOAD ───────────────────────────────────────

/**
 * Receives a base64 image from the admin panel, saves to /capas folder.
 * Returns the Drive file ID.
 */
function adminUploadCover(base64Data, mimeType, filename) {
  const cfg = CFG();
  if (!cfg.F_CAPAS) throw new Error('Pasta /capas não configurada');
  const folder = DriveApp.getFolderById(cfg.F_CAPAS);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}

// ── ADMIN: FEEDBACK VIEW ──────────────────────────────────────

function adminGetFeedback(musicaId) {
  const sheet = sh('feedback');
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues()
    .filter(r => String(r[1]) === String(musicaId))
    .map(r => ({ timestamp:r[0], nota:r[2]||null, reacao:r[3]||'', comentario:r[4]||'', user_hash:String(r[5]).slice(0,10)+'…' }));
}

// ── ADMIN: CACHE ──────────────────────────────────────────────

function adminFlushCache() {
  CacheService.getScriptCache().removeAll();
  return { success: true };
}

// ── CONFIG (Script Properties) ────────────────────────────────

function getConfig() {
  const p = PropertiesService.getScriptProperties().getProperties();
  return { SS_ID:p.SS_ID||'', F_AUDIOS:p.F_AUDIOS||'', F_LETRAS:p.F_LETRAS||'', F_CAPAS:p.F_CAPAS||'' };
}

function saveConfig(cfg) {
  PropertiesService.getScriptProperties().setProperties(cfg);
  return { success: true };
}

// ── SPREADSHEET MENU ──────────────────────────────────────────

/** Auto-runs when the spreadsheet opens — adds the Fantasma menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎵 Fantasma')
    .addItem('Abrir Painel Admin',         'openAdminPanel')
    .addSeparator()
    .addItem('📂 Escanear pastas do Drive', 'runScan')
    .addItem('🔄 Limpar cache',             'runFlushCache')
    .addSeparator()
    .addItem('⚙ Configurar IDs',           'openConfig')
    .addToUi();
}

function openAdminPanel() {
  const html = HtmlService.createHtmlOutputFromFile('AdminPanel').setWidth(940).setHeight(720).setTitle('🎵 Fantasma Admin');
  SpreadsheetApp.getUi().showModalDialog(html, '🎵 Painel Admin');
}

function openConfig() {
  const html = HtmlService.createHtmlOutputFromFile('AdminConfig').setWidth(520).setHeight(420).setTitle('⚙ Configurações');
  SpreadsheetApp.getUi().showModalDialog(html, '⚙ Configurações');
}

function runScan() {
  const r = adminScanFolders();
  if (r.error) { SpreadsheetApp.getUi().alert('❌ ' + r.error); return; }
  SpreadsheetApp.getUi().alert(`Scan concluído!\n\n✅ Adicionadas (${r.added.length}):\n${r.added.map(n=>' • '+n).join('\n')||'  (nenhuma nova)'}\n\n⏭ Ignoradas (${r.skipped.length}):\n${r.skipped.map(n=>' · '+n).join('\n')||'  (nenhuma)'}`);
}

function runFlushCache() {
  adminFlushCache();
  SpreadsheetApp.getUi().alert('✅ Cache limpo!');
}

// ── SETUP (run once) ──────────────────────────────────────────

function setupSheets() {
  const SS = ss();
  function ensureSheet(name, headers, bgColor) {
    let sh = SS.getSheetByName(name);
    if (!sh) {
      sh = SS.insertSheet(name);
      sh.appendRow(headers);
      sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground(bgColor).setFontColor('#ffffff');
    }
    return sh;
  }
  ensureSheet('musicas',  ['id','titulo','audio_id','letra_id','capa_id','notas_autor','publicar','ordem','data_publicacao'], '#1a1208');
  ensureSheet('feedback', ['timestamp','musica_id','nota','reacao','comentario','user_hash'], '#0a0a14');
  Logger.log('✅ Sheets criadas com sucesso.');
}
