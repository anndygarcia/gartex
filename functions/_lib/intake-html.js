// The bilingual intake form markup.
//
// Lives in _lib/ (bundled, never routable) and is served by
// functions/apply/index.js.
//
// Language rule: English by default. If the listing was in Spanish, the bot
// sends ?lang=es so the sub sees the Spanish form first — no back-and-forth.
// The toggle switches the whole form client-side, and the chosen language is
// submitted with the payload so we know how to run the phone screen.
//
// FRAMING RULE — this form is a QUALIFYING INQUIRY, not a network signup.
// The sub must never see the words "network" or "subcontractor network".
// We are a builder who needs a trade crew for upcoming projects and we are
// reaching out to see who is available and attentive. Everything the sub
// reads should sound like one contractor hiring another for a job.
//
// LENGTH RULE — required fields must be few enough to finish on a phone in
// under a minute. The vetting paperwork (COI, W-9, entity, pricing) lives
// behind a collapsed <details> so it never blocks the first response.
//

const TRADES = [
  'Framing', 'Electrical', 'Cornice & Trim', 'Carpentry', 'Drywall & Paint',
  'HVAC', 'Landscaping', 'Concrete', 'Plumbing', 'Roofing', 'Flooring & Tile',
  'Cabinets & Countertops', 'Siding', 'Windows & Doors', 'Insulation',
  'Masonry', 'Fencing', 'Demolition', 'Hauling', 'Final Clean', 'Gutters',
  'Garage Doors', 'Low Voltage', 'Solar',
];

const COUNTIES = [
  'Harris', 'Fort Bend', 'Montgomery', 'Brazoria', 'Galveston',
  'Waller', 'Liberty', 'Chambers',
];

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function intakeHtml(lang = 'en') {
  const es = lang === 'es';
  const t = es
    ? {
        title: 'Trabaja con Gartex Construction',
        sub: 'Gartex Construction — Houston, TX. Toma menos de un minuto.',
        intro: 'Tenemos proyectos empezando en Houston y estoy buscando gente de oficio que quiera trabajar. Si buscas trabajo constante, llena esta forma y te llamo esta semana. Sin compromiso — solo quiero ver quién está disponible.',
        langBtn: 'English',
        who: 'Quién eres',
        name: 'Tu nombre',
        phone: 'Tu teléfono',
        email: 'Tu correo electrónico',
        emailOpt: 'opcional',
        what: 'A qué te dedicas',
        trades: 'Oficios que ofreces',
        tradesHint: 'Elige todos los que apliquen.',
        specialty: '¿Qué tipo de trabajo haces?',
        specialtyPh: 'Ejemplo: tablaroca y textura, casas nuevas y remodelaciones.',
        where: 'Dónde trabajas',
        counties: 'Condados donde trabajas',
        whenStart: '¿Cuándo podrías empezar?',
        whenPh: 'Ejemplo: en 2 semanas',
        insuredQ: '¿Tienes seguro?',
        yes: 'Sí',
        no: 'No',
        more: 'Más detalles (opcional — me ayuda a tenerte listo más rápido)',
        company: 'Nombre de la empresa',
        years: 'Años en el negocio',
        crew: 'Tamaño de tu equipo',
        licenses: 'Licencias (TX)',
        licensesPh: 'Ejemplo: electricista TECL-12345',
        carrier: 'Compañía de seguros',
        policy: 'Número de póliza',
        coverage: 'Cobertura GL',
        expiry: 'Vencimiento del seguro',
        coiFile: 'Copia del seguro (COI)',
        wc: 'Compensación para trabajadores',
        entityQ: '¿Tienes empresa registrada en Texas?',
        legalName: 'Nombre legal de la empresa',
        ein: 'EIN',
        w9File: 'Subir W-9',
        capacity: 'Disponibilidad',
        capacityPh: 'Ejemplo: puedo empezar en 2 proyectos a la vez.',
        pricing: 'Cómo cobras',
        pricingPh: 'Ejemplo: por pie cuadrado o por presupuesto.',
        terms: 'Condiciones de pago',
        termsPh: 'Ejemplo: net 15, draws',
        refs: 'Dos referencias',
        refsPh: 'Nombre, empresa y teléfono de un constructor con quien trabajaste.',
        photos: 'Fotos de trabajos recientes',
        notes: 'Algo más que debamos saber',
        notesPh: 'Ejemplo: equipo propio, no subcontrato trabajo.',
        submit: 'Enviar',
        consent: 'Al enviar aceptas que Gartex Construction te contacte por teléfono o mensaje sobre trabajo.',
        success: '¡Gracias! Recibimos tu información. Te llamamos dentro de 48 horas.',
        errGeneric: 'Algo salió mal. Intenta de nuevo.',
        errTrade: 'Elige al menos un oficio.',
        errRequired: 'Completa los campos marcados con *.',
      }
    : {
        title: 'Work with Gartex Construction',
        sub: 'Gartex Construction — Houston, TX. Takes less than a minute.',
        intro: "We have projects starting around Houston and I'm looking for tradespeople who are ready to work. If you want steady work, fill this out and I'll call you this week. No commitment — I just want to see who's available.",
        langBtn: 'Español',
        who: 'Who you are',
        name: 'Your name',
        phone: 'Your phone',
        email: 'Your email',
        emailOpt: 'optional',
        what: 'What you do',
        trades: 'Trades you offer',
        tradesHint: 'Pick every one that applies.',
        specialty: 'What kind of work do you do?',
        specialtyPh: 'Example: drywall and texture, new construction and remodels.',
        where: 'Where you work',
        counties: 'Counties you work',
        whenStart: 'When could you start?',
        whenPh: 'Example: in 2 weeks',
        insuredQ: 'Are you insured?',
        yes: 'Yes',
        no: 'No',
        more: 'More details (optional — helps me get you set up faster)',
        company: 'Company name',
        years: 'Years in business',
        crew: 'Crew size',
        licenses: 'Licenses (TX)',
        licensesPh: 'Example: electrician TECL-12345',
        carrier: 'Insurance carrier',
        policy: 'Policy number',
        coverage: 'GL coverage',
        expiry: 'Insurance expiration',
        coiFile: 'Upload COI (certificate of insurance)',
        wc: "Workers' comp",
        entityQ: 'Is your company registered in Texas?',
        legalName: 'Legal entity name',
        ein: 'EIN',
        w9File: 'Upload W-9',
        capacity: 'Availability',
        capacityPh: 'Example: can run 2 jobs at once.',
        pricing: 'How you price work',
        pricingPh: 'Example: per square foot or bid per plans.',
        terms: 'Payment terms',
        termsPh: 'Example: net 15, draws',
        refs: 'Two references',
        refsPh: 'Name, company, and phone of a builder you worked for.',
        photos: 'Photos of recent work',
        notes: 'Anything else we should know',
        notesPh: 'Example: own crew, we do not sub out the work.',
        submit: 'Send',
        consent: 'By submitting you agree that Gartex Construction may contact you by phone or message about work.',
        success: "Thanks — we've got it. We'll call you within 48 hours.",
        errGeneric: 'Something went wrong. Please try again.',
        errTrade: 'Pick at least one trade.',
        errRequired: 'Fill in the fields marked with *.',
      };

  const tradeChecks = TRADES.map(
    (x) => `<label class="chip"><input type="checkbox" name="trades" value="${esc(x)}"><span>${esc(x)}</span></label>`,
  ).join('');

  const countyChecks = COUNTIES.map(
    (x) => `<label class="chip"><input type="checkbox" name="counties" value="${esc(x)}"><span>${esc(x)}</span></label>`,
  ).join('');

  return `<!DOCTYPE html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${esc(t.title)} · Gartex Construction</title>
<style>
  :root{--navy:#1f3a5f;--navy-d:#152844;--accent:#c87f3a;--line:#dce7f5;--text:#0b1729;--muted:#5a6b7d;--bg:#f4f8ff;--ok:#14663a}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.55;-webkit-text-size-adjust:100%}
  .hero{position:relative;background:linear-gradient(135deg,var(--navy),var(--navy-d));color:#fff;padding:26px 20px 30px;text-align:center}
  .hero .mark{width:46px;height:46px;border-radius:10px;background:#fff;color:var(--navy);display:grid;place-items:center;font-weight:800;font-size:19px;margin:0 auto 12px}
  .hero h1{font-size:25px;font-weight:800;letter-spacing:-.3px;padding:0 8px}
  .hero p.sub{opacity:.85;font-size:14px;margin-top:6px}
  .wrap{max-width:720px;margin:0 auto;padding:18px 14px 60px}
  .intro{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:9px;padding:15px 16px;font-size:14.5px;margin-bottom:16px}
  form{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px 18px;box-shadow:0 4px 14px rgba(16,42,67,.06)}
  fieldset{border:0;border-top:1px solid var(--line);padding:18px 0 4px;margin:0 0 2px}
  fieldset:first-of-type{border-top:0;padding-top:2px}
  legend{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--navy);font-weight:800;padding:0;margin-bottom:12px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .full{grid-column:1/-1}
  label.f{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
  label.f .opt{font-weight:400;color:var(--muted);font-size:12px}
  input[type=text],input[type=email],input[type=tel],input[type=number],input[type=date],select,textarea{
    width:100%;padding:12px;border:1px solid #cfdcea;border-radius:8px;font-size:16px;font-family:inherit;background:#fff;color:var(--text)}
  input:focus,select:focus,textarea:focus{outline:2px solid rgba(31,58,95,.35);border-color:var(--navy)}
  textarea{min-height:74px;resize:vertical}
  .chips{display:flex;flex-wrap:wrap;gap:7px}
  .chip{display:inline-flex;align-items:center;gap:7px;font-size:14px;background:#f7fafd;border:1px solid var(--line);border-radius:20px;padding:9px 13px;cursor:pointer;user-select:none}
  .chip input{width:17px;height:17px;accent-color:var(--navy);flex:none;margin:0}
  .chip:has(input:checked){background:#eaf2fd;border-color:var(--navy);color:var(--navy);font-weight:600}
  .hint{font-size:12.5px;color:var(--muted);margin-top:7px}
  .radios{display:flex;gap:9px;flex-wrap:wrap}
  .radios label{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#f7fafd;border-radius:20px;padding:10px 16px;font-size:14px;cursor:pointer}
  .radios input{width:17px;height:17px;accent-color:var(--navy);margin:0}
  details{margin-top:18px;border:1px solid var(--line);border-radius:10px;background:#fbfdff}
  details>summary{cursor:pointer;padding:14px 16px;font-size:14px;font-weight:600;color:var(--navy);list-style:none}
  details>summary::-webkit-details-marker{display:none}
  details>summary::after{content:'+';float:right;font-weight:800;font-size:18px;line-height:1}
  details[open]>summary::after{content:'−'}
  .details-body{padding:4px 16px 16px;border-top:1px solid var(--line)}
  .details-body fieldset{border-top:0;padding-top:14px}
  .details-body fieldset:first-of-type{padding-top:10px}
  input[type=file]{width:100%;font-size:13px;padding:10px;border:1px dashed #bfd0e4;border-radius:8px;background:#f7fafd}
  button[type=submit]{width:100%;background:var(--accent);border:0;color:#1a1206;font-weight:800;font-size:16px;padding:15px;border-radius:9px;cursor:pointer;font-family:inherit;margin-top:18px}
  button[type=submit]:hover{filter:brightness(1.07)}
  button[type=submit]:disabled{opacity:.6;cursor:not-allowed}
  .consent{font-size:12.5px;color:var(--muted);margin-top:12px;text-align:center}
  .err{background:#fdecec;border:1px solid #f5c2c2;color:#b02a2a;font-size:14px;padding:12px 14px;border-radius:8px;margin-bottom:14px}
  .ok{background:#e8f8ef;border:1px solid #a8ddbd;color:var(--ok);font-size:15px;padding:18px;border-radius:9px;text-align:center;font-weight:600}
  .langbtn{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);color:#fff;padding:7px 13px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
  @media (max-width:560px){.row{grid-template-columns:1fr}.hero h1{font-size:22px}}
</style>
</head>
<body>
<div class="hero">
  <a class="langbtn" id="langBtn" href="#">${esc(t.langBtn)}</a>
  <div class="mark">G</div>
  <h1>${esc(t.title)}</h1>
  <p class="sub">${esc(t.sub)}</p>
</div>
<div class="wrap">
  <div class="intro">${esc(t.intro)}</div>
  <div id="msg"></div>
  <form id="form" enctype="multipart/form-data">
    <input type="hidden" name="lang" id="langField" value="${es ? 'es' : 'en'}">
    <input type="text" name="website" id="hp" tabindex="-1" autocomplete="off"
           style="position:absolute;left:-9999px;opacity:0;height:0;width:0" aria-hidden="true">

    <fieldset>
      <legend>${esc(t.who)}</legend>
      <div class="row">
        <div><label class="f">${esc(t.name)} *</label><input type="text" name="Name" required autocomplete="name"></div>
        <div><label class="f">${esc(t.phone)} *</label><input type="tel" name="Phone" required autocomplete="tel"></div>
        <div class="full"><label class="f">${esc(t.email)} <span class="opt">(${esc(t.emailOpt)})</span></label><input type="email" name="Email" autocomplete="email"></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.what)}</legend>
      <label class="f">${esc(t.trades)} *</label>
      <div class="chips" id="tradeChips">${tradeChecks}</div>
      <div class="hint">${esc(t.tradesHint)}</div>
      <div style="margin-top:14px">
        <label class="f">${esc(t.specialty)} *</label>
        <textarea name="Specialty" required placeholder="${esc(t.specialtyPh)}"></textarea>
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.where)}</legend>
      <label class="f">${esc(t.counties)}</label>
      <div class="chips">${countyChecks}</div>
      <div style="margin-top:14px">
        <label class="f">${esc(t.whenStart)}</label>
        <input type="text" name="When Could You Start" placeholder="${esc(t.whenPh)}">
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.insuredQ)}</legend>
      <div class="radios">
        <label><input type="radio" name="Insured" value="Yes" required> ${esc(t.yes)}</label>
        <label><input type="radio" name="Insured" value="No"> ${esc(t.no)}</label>
      </div>
    </fieldset>

    <details>
      <summary>${esc(t.more)}</summary>
      <div class="details-body">
        <fieldset>
          <div class="row">
            <div><label class="f">${esc(t.company)}</label><input type="text" name="Company" autocomplete="organization"></div>
            <div><label class="f">${esc(t.years)}</label><input type="number" name="Years In Business" min="0" max="90"></div>
            <div><label class="f">${esc(t.crew)}</label><input type="number" name="Crew Size" min="0" max="200"></div>
            <div><label class="f">${esc(t.licenses)}</label><input type="text" name="License Numbers" placeholder="${esc(t.licensesPh)}"></div>
          </div>
        </fieldset>

        <fieldset>
          <label class="f">${esc(t.carrier)}</label>
          <div class="row">
            <div><input type="text" name="Insurance Carrier"></div>
            <div><input type="text" name="Policy Number"></div>
            <div><input type="text" name="Coverage" placeholder="$1M / occurrence"></div>
            <div><input type="date" name="COI Expiry"></div>
          </div>
          <div style="margin-top:12px">
            <label class="f">${esc(t.coiFile)}</label>
            <input type="file" name="coi" accept=".pdf,.jpg,.jpeg,.png,.webp">
            <div class="hint">PDF or photo. We verify coverage with your carrier.</div>
          </div>
          <div style="margin-top:12px">
            <label class="f">${esc(t.wc)}</label>
            <select name="Workers Comp">
              <option value="">—</option>
              <option value="Yes">Yes / covered</option>
              <option value="Non-subscriber exemption">Non-subscriber exemption (TX)</option>
              <option value="No">No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </fieldset>

        <fieldset>
          <label class="f">${esc(t.entityQ)}</label>
          <div class="radios" style="margin-bottom:12px">
            <label><input type="radio" name="Entity Registered" value="Yes"> ${esc(t.yes)}</label>
            <label><input type="radio" name="Entity Registered" value="No"> ${esc(t.no)}</label>
          </div>
          <div class="row">
            <div><label class="f">${esc(t.legalName)}</label><input type="text" name="Legal Entity"></div>
            <div><label class="f">${esc(t.ein)}</label><input type="text" name="EIN"></div>
          </div>
          <div style="margin-top:12px">
            <label class="f">${esc(t.w9File)}</label>
            <input type="file" name="w9" accept=".pdf,.jpg,.jpeg,.png,.webp">
          </div>
        </fieldset>

        <fieldset>
          <label class="f">${esc(t.capacity)}</label>
          <textarea name="Capacity" placeholder="${esc(t.capacityPh)}"></textarea>
          <div class="row" style="margin-top:12px">
            <div><label class="f">${esc(t.pricing)}</label><input type="text" name="Pricing Model" placeholder="${esc(t.pricingPh)}"></div>
            <div><label class="f">${esc(t.terms)}</label><input type="text" name="Payment Terms" placeholder="${esc(t.termsPh)}"></div>
          </div>
        </fieldset>

        <fieldset>
          <label class="f">${esc(t.refs)}</label>
          <textarea name="References" placeholder="${esc(t.refsPh)}"></textarea>
        </fieldset>

        <fieldset>
          <label class="f">${esc(t.notes)}</label>
          <textarea name="Notes" placeholder="${esc(t.notesPh)}"></textarea>
          <div style="margin-top:12px">
            <label class="f">${esc(t.photos)}</label>
            <input type="file" name="photos" accept=".jpg,.jpeg,.png,.webp" multiple>
          </div>
        </fieldset>
      </div>
    </details>

    <button type="submit" id="submitBtn">${esc(t.submit)}</button>
    <div class="consent">${esc(t.consent)}</div>
  </form>
</div>
<script>
(function(){
  var form=document.getElementById('form'),msg=document.getElementById('msg'),btn=document.getElementById('submitBtn');
  var params=new URLSearchParams(location.search);
  var lp=params.get('lang');
  // The intake token identifies WHICH lead this submission belongs to.
  // It is issued by the sweep with the marketplace message, so the form
  // can attach the vetting answers to the lead we already tracked
  // instead of creating a duplicate row. It must survive the language
  // toggle, or the Spanish form loses the link back to the lead.
  var tok=params.get('t')||'';
  if(tok){
    var tf=document.createElement('input');
    tf.type='hidden';tf.name='Intake Token';tf.value=tok;
    form.appendChild(tf);
  }
  if(lp==='es'||lp==='en'){
    var u=new URL(location.href);u.searchParams.set('lang',lp==='es'?'en':'es');
    document.getElementById('langBtn').href=u.toString();
  }
  var ERR_TRADE=${JSON.stringify(t.errTrade)};
  var ERR_REQ=${JSON.stringify(t.errRequired)};
  var ERR_GEN=${JSON.stringify(t.errGeneric)};
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    msg.innerHTML='';
    // A trade is the one thing we cannot do a job without, so it is
    // required — but the browser cannot express "one of these checkboxes",
    // so it is checked here and the message is shown next to the chips.
    var picked=form.querySelectorAll('input[name=trades]:checked').length;
    if(!picked){
      msg.innerHTML='<div class="err">'+ERR_TRADE+'</div>';
      var c=document.getElementById('tradeChips');
      if(c)c.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(!form.checkValidity()){
      msg.innerHTML='<div class="err">'+ERR_REQ+'</div>';
      form.reportValidity();
      return;
    }
    btn.disabled=true;
    var fd=new FormData(form);
    // File uploads go as base64 so the whole payload is one JSON POST.
    var files={};
    var fileFields=['coi','w9','photos'];
    for(var i=0;i<fileFields.length;i++){
      var f=fd.get(fileFields[i]);
      if(f&&f.size){files[fileFields[i]]={name:f.name,type:f.type,data:await toB64(f)};}
    }
    var payload={fields:{},files:files};
    fd.forEach(function(v,k){
      if(k==='website'||fileFields.indexOf(k)>=0)return;
      if(k==='trades'||k==='counties'){(payload.fields[k]=payload.fields[k]||[]).push(v);}
      else payload.fields[k]=v;
    });
    try{
      var res=await fetch('/api/network/intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      var data=await res.json();
      if(!res.ok)throw new Error(data.error||'failed');
      form.style.display='none';
      msg.innerHTML='<div class="ok">'+data.message+'</div>';
    }catch(err){
      msg.innerHTML='<div class="err">'+(err.message||ERR_GEN)+'</div>';
      btn.disabled=false;
    }
  });
  function toB64(file){
    return new Promise(function(resolve,reject){
      var r=new FileReader();
      r.onload=function(){resolve(String(r.result).split(',')[1]);};
      r.onerror=reject;r.readAsDataURL(file);
    });
  }
})();
</script>
</body>
</html>`;
}
