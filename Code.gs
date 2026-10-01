/**
 * Google Sheets live-data endpoint for Kalkulator Promo Apple.
 *
 * 1) Paste your Google Sheet ID into SPREADSHEET_ID below.
 * 2) Deploy this script as a Web App.
 * 3) Set access to Anyone / anonymous and execute as you.
 * 4) Put the resulting /exec URL into the calculator Admin panel.
 */
const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';

const CARD_MATRIX = [
  ['BCA', [3,6,12,18,24]],
  ['BRI', [3,6,12,18,24]],
  ['BNI', [3,6,12,18,24]],
  ['CIMB', [3,6,12,24]],
  ['Bank BSI', [3,6,12,24]],
  ['Panin', [3,6,12]],
  ['Mandiri', [3,6,12,18,24]],
  ['Permata', [3,6,12,18,24]],
  ['DBS', [3,6,12,18,24]],
  ['HSBC', [3,6,12,18,24]],
  ['Danamon', [3,6,12,18,24]],
  ['UOB', [3,6,12,18,24]],
  ['Maybank', [3,6,12,24]],
  ['Jenius (BTPN)', [3,6,12]],
  ['KB Bukopin', [3,6,12,18,24]],
  ['OCBC', [3,6,12]],
];

function doGet(e) {
  try {
    const data = buildData_();
    const version = hash_(JSON.stringify(data));
    const payload = {
      ok: true,
      version: version,
      updated_at: data.updated_at,
      data: data,
    };

    const json = JSON.stringify(payload);
    const prefix = e && e.parameter && e.parameter.prefix ? String(e.parameter.prefix) : '';

    // JSONP is used so a Netlify-hosted static HTML page can read the Apps Script
    // response without needing browser-side OAuth or a server proxy.
    if (prefix && /^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(prefix)) {
      return ContentService
        .createTextOutput(prefix + '(' + json + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const body = JSON.stringify({ok:false, error:String(err && err.message ? err.message : err)});
    const prefix = e && e.parameter && e.parameter.prefix ? String(e.parameter.prefix) : '';
    if (prefix && /^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(prefix)) {
      return ContentService
        .createTextOutput(prefix + '(' + body + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(body)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildData_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE') {
    throw new Error('SPREADSHEET_ID belum diisi di Code.gs.');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const priceRows = getSheet_(ss, 'Price List');
  const promoRows = getSheet_(ss, 'Promo Berjalan');
  const bnplRows = getSheet_(ss, 'BNPL');
  const providerRows = getSheet_(ss, 'Provider');
  const qoalaRows = getSheet_(ss, 'Qoala Protection');
  const tradeRows = getSheet_(ss, 'Trade in');

  const products = parsePriceList_(priceRows);
  const catalog = {iPhone:[], iPad:[], 'Apple Watch':[], Mac:[]};

  products.forEach(function(p) {
    const desc = String(p.description || '').toUpperCase();
    let tab = 'Mac';
    if (p.category === 'Apple Device - iPhone') tab = 'iPhone';
    else if (p.category === 'Apple Device - iPad') tab = 'iPad';
    else if (desc.indexOf('APPLE WATCH') >= 0 || String(p.group || '').toLowerCase().indexOf('apple watch') === 0) tab = 'Apple Watch';

    p.group = normalizeWhitespace_(p.group || p.description);
    p.memory_label = extractMemoryLabel_(p.description);
    catalog[tab].push(p);
  });

  const qoala = parseCatalog_(qoalaRows);
  qoala.forEach(function(q) {
    const maxMatch = String(q.description || '').match(/Max\s*([0-9.]+)/i);
    q.max_device = maxMatch ? Number(maxMatch[1].replace(/\./g,'')) : 0;
    const tenorMatch = String(q.description || '').match(/(\d+)\s*bulan/i);
    q.qoala_tenor = tenorMatch ? Number(tenorMatch[1]) : null;
    if (!q.qoala_tenor) {
      const articleMatch = String(q.article || '').match(/\((\d+)-/);
      q.qoala_tenor = articleMatch ? Number(articleMatch[1]) : null;
    }
  });

  const bnpl = parseBnpl_(bnplRows);
  const providers = parseCatalog_(providerRows);
  const tradeIn = parseTradeIn_(tradeRows);
  const promos = parsePromos_(promoRows);
  const cardOptions = CARD_MATRIX.map(function(item) {
    return {
      name: item[0],
      tenors: item[1],
      promo_note: 'Cicilan 0% berdasarkan tabel kartu kredit pada gambar di sheet Promo Berjalan.'
    };
  });

  const fileUpdated = DriveApp.getFileById(SPREADSHEET_ID).getLastUpdated().toISOString();
  return {
    updated_at: fileUpdated,
    source_file: ss.getName(),
    catalog: catalog,
    bnpl: bnpl,
    providers: providers,
    qoala: qoala,
    promo_notes: [],
    trade_in: tradeIn,
    card_options: cardOptions,
    promos: promos,
  };
}

function getSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet tidak ditemukan: ' + name);
  return sh.getDataRange().getDisplayValues();
}

function text_(v) {
  return v == null ? '' : String(v).trim();
}

function normalizeWhitespace_(s) {
  return text_(s).replace(/\s+/g,' ').trim();
}

function num_(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g,''));
  return isFinite(n) ? n : 0;
}

function headerMap_(rows, candidates) {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r].map(function(v){return text_(v).toLowerCase();});
    let ok = true;
    const out = {};
    candidates.forEach(function(c) {
      const idx = row.findIndex(function(v){ return v === c.toLowerCase(); });
      if (idx < 0) ok = false;
      else out[c] = idx;
    });
    if (ok) return {rowIndex:r, map:out};
  }
  return null;
}

function parsePriceList_(rows) {
  let headerIndex = -1;
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r].map(function(v){return text_(v).toLowerCase();});
    if (row.indexOf('sap article') >= 0 && row.indexOf('sapdescription') >= 0 && row.indexOf('category') >= 0 && row.indexOf('normal price') >= 0 && row.indexOf('promotion') >= 0) {
      headerIndex = r;
      break;
    }
  }
  if (headerIndex < 0) throw new Error('Header Price List tidak ditemukan.');

  const h = rows[headerIndex].map(function(v){return text_(v).toLowerCase();});
  const ia = h.indexOf('sap article'), ib = h.indexOf('sapdescription'), ic = h.indexOf('category');
  const inormal = h.indexOf('normal price'), ipromo = h.indexOf('promotion');
  const ichange = h.indexOf('penurunan-kenaikan dari Promo sebelumnya');
  const iremarks = h.indexOf('cash price remarks');
  const out = [];
  let currentModel = '';

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const a=text_(row[ia]), b=text_(row[ib]), c=text_(row[ic]);
    // A-only title rows act as model grouping labels.
    let nonEmpty=0;
    row.forEach(function(v){if(text_(v)) nonEmpty++;});
    if (a && nonEmpty === 1) currentModel = a;
    if (a && b && c) {
      const category=c;
      if (/^Apple Device - /i.test(category)) {
        const normal=num_(row[inormal]);
        const promo=num_(row[ipromo]);
        out.push({
          article:a,
          description:b,
          category:category,
          group:currentModel || b,
          normal_price:normal,
          promo_price:promo || normal,
          change:ichange>=0?num_(row[ichange]):0,
          remarks:iremarks>=0?text_(row[iremarks]):'',
        });
      }
    }
  }
  return out;
}

function extractMemoryLabel_(description) {
  const s=normalizeWhitespace_(description);
  let m=s.match(/(\d+\s*GB)\s*[\/%x×]\s*(\d+\s*(?:GB|TB))/i);
  if (m) return m[1].replace(/\s+/g,'') + ' / ' + m[2].replace(/\s+/g,'');
  m=s.match(/(\d+\s*(?:GB|TB))(?!.*\d+\s*(?:GB|TB))/i);
  return m ? m[1].replace(/\s+/g,'') : 'Standard';
}

function parseCatalog_(rows) {
  if (!rows || !rows.length) return [];
  let headerIndex = 0;
  for (let r=0;r<Math.min(rows.length,5);r++) {
    const rr=rows[r].map(function(v){return text_(v).toLowerCase();});
    if (rr.indexOf('sap article')>=0 && (rr.indexOf('sap description')>=0 || rr.indexOf('sapdescription')>=0)) {headerIndex=r;break;}
  }
  const h=rows[headerIndex].map(function(v){return text_(v).toLowerCase();});
  function idx(names){
    for (let i=0;i<names.length;i++) { const j=h.indexOf(names[i]); if(j>=0)return j; }
    return -1;
  }
  const iBrand=idx(['brand']), iArticle=idx(['sap article']), iDesc=idx(['sap description','sapdescription']), iRef=idx(['reference','srp reference']), iCur=idx(['current','srp current']), iRep=idx(['repricing','cash repricing','repricing cash']);
  const out=[];
  for(let r=headerIndex+1;r<rows.length;r++){
    const row=rows[r];
    const article=iArticle>=0?text_(row[iArticle]):'';
    if(!article)continue;
    out.push({
      brand:iBrand>=0?text_(row[iBrand]):'',
      article:article,
      description:iDesc>=0?text_(row[iDesc]):article,
      reference:iRef>=0?num_(row[iRef]):0,
      current:iCur>=0?num_(row[iCur]):0,
      repricing:iRep>=0?num_(row[iRep]):0,
    });
  }
  return out;
}

function parseBnpl_(rows) {
  if(!rows||rows.length<2)return[];
  const h=rows[0].map(function(v){return text_(v).toLowerCase();});
  const iName=h.findIndex(function(v){return v==='financing';});
  const out=[];
  for(let r=1;r<rows.length;r++){
    const name=text_(rows[r][iName>=0?iName:0]);
    if(!name)continue;
    const tenors=[];
    for(let c=(iName>=0?iName+1:1);c<=Math.min(rows[r].length-1,(iName>=0?iName+3:3));c++){
      const n=num_(rows[r][c]); if(n)tenors.push(Number(n));
    }
    out.push({name:name,tenors:tenors,interest:text_(rows[r][4])});
  }
  return out;
}

function parseTradeIn_(rows) {
  if(!rows||rows.length<3)return[];
  let headerIndex=1;
  for(let r=0;r<Math.min(rows.length,5);r++){
    const rr=rows[r].map(function(v){return text_(v).toLowerCase();});
    if(rr.indexOf('brand')>=0 && rr.indexOf('model name')>=0){headerIndex=r;break;}
  }
  const h=rows[headerIndex].map(function(v){return text_(v).toLowerCase();});
  const iBrand=h.indexOf('brand'), iModel=h.indexOf('model name');
  const gradeCols={S:h.indexOf('grade s'),A:h.indexOf('grade a'),B:h.indexOf('grade b'),C:h.indexOf('grade c'),D:h.indexOf('grade d')};
  const out=[];
  for(let r=headerIndex+1;r<rows.length;r++){
    const brand=text_(rows[r][iBrand]), model=text_(rows[r][iModel]);
    if(!brand||!model)continue;
    const grades={};
    Object.keys(gradeCols).forEach(function(g){const i=gradeCols[g];if(i>=0 && rows[r][i]!=='' && rows[r][i]!=null)grades[g]=num_(rows[r][i]);});
    if(Object.keys(grades).length)out.push({brand:brand,brand_key:brand.toLowerCase(),model:model,model_key:model.toLowerCase(),grades:grades});
  }
  return out;
}

function parsePromos_(rows) {
  if(!rows||!rows.length)return[];
  let headerIndex=-1;
  for(let r=0;r<Math.min(rows.length,6);r++){
    const rr=rows[r].map(function(v){return text_(v).toLowerCase();});
    if(rr.indexOf('promo')>=0 && rr.indexOf('periode')>=0 && rr.indexOf('bank')>=0 && rr.indexOf('scheme')>=0 && rr.indexOf('minimal amount')>=0 && rr.indexOf('maximal amount')>=0){headerIndex=r;break;}
  }
  if(headerIndex<0)throw new Error('Header Promo Berjalan tidak ditemukan.');
  const h=rows[headerIndex].map(function(v){return text_(v).toLowerCase();});
  const iPromo=h.indexOf('promo'), iPeriod=h.indexOf('periode'), iBank=h.indexOf('bank'), iScheme=h.indexOf('scheme'), iMin=h.indexOf('minimal amount'), iMax=h.indexOf('maximal amount'), iDisc=h.indexOf('discount/cashback');
  const out=[];
  let periodCarry='';
  for(let r=headerIndex+1;r<rows.length;r++){
    const row=rows[r];
    const promo=text_(row[iPromo]), period=text_(row[iPeriod])||periodCarry, bank=text_(row[iBank]), scheme=text_(row[iScheme]);
    if(period)periodCarry=period;
    if(!promo||!bank||!scheme)continue;
    out.push({promo:promo,period:period,bank:bank,scheme:scheme,min:num_(row[iMin]),max:num_(row[iMax]),discount:num_(row[iDisc])});
  }
  return out;
}

function hash_(s) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest);
}
