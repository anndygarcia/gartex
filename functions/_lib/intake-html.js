// The bilingual intake form markup.
//
// Lives in _lib/ (bundled, never routable) and is served by
// functions/apply/index.js.
//
// Language rule: English by default. If the listing was in Spanish, the bot
// sends ?lang=es so the sub sees the Spanish form first — no back-and-forth.
// The toggle switches the whole form client-side, and the chosen language is
// submitted with the payload so we know how to run the phone screen.

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
        title: 'Únete a la red de subcontratistas',
        sub: 'Gartex Construction — Houston, TX. Toma 3-4 minutos.',
        intro: 'Estamos armando una red de subcontratistas para proyectos de construcción de casas en Houston. Si tienes trabajo disponible y estás asegurado y registrado como empresa, completa esta forma y te llamamos esta semana.',
        langBtn: 'English',
        contact: 'Contacto',
        name: 'Nombre completo',
        company: 'Nombre de la empresa',
        phone: 'Teléfono',
        email: 'Correo electrónico',
        trades: 'Oficios que ofreces',
        specialty: 'Describe tu especialidad',
        specialtyPh: 'Ejemplo: tablaroca y textura, casas nuevas y remodelaciones.',
        years: 'Años en el negocio',
        crew: 'Tamaño de tu equipo',
        insuredQ: '¿Tienes seguro?',
        carrier: 'Compañía de seguros',
        policy: 'Número de póliza',
        coverage: 'Cobertura GL',
        expiry: 'Vencimiento del seguro',
        coiFile: 'Copia del seguro (COI)',
        wc: 'Compensación para trabajadores',
        entityQ: '¿Tienes empresa registrada en Texas?',
        legalName: 'Nombre legal de la empresa',
        ein: 'EIN (opcional)',
        w9File: 'Subir W-9',
        capacity: 'Disponibilidad',
        capacityPh: 'Ejemplo: 2 semanas, puedo empezar en 2 proyectos a la vez.',
        whenStart: '¿Cuándo podrías empezar?',
        counties: 'Condados donde trabajas',
        travel: '¿Trabajas fuera de Houston?',
        travelPh: 'Ejemplo: sí, cobro 10% extra por fuera del área.',
        licenses: 'Licencias (TX)',
        licensesPh: 'Ejemplo: electricista TECL-12345, aire acondicionado TACL-67890.',
        pricing: 'Cómo cobras',
        pricingPh: 'Ejemplo: por pie cuadrado, por unidad, o por presupuesto.',
        terms: 'Condiciones de pago',
        refs: 'Dos referencias',
        refsPh: 'Nombre, empresa y teléfono de un constructor con quien trabajaste.',
        photos: 'Fotos de trabajos recientes',
        notes: 'Algo más que debamos saber',
        notesPh: 'Ejemplo: equipo propio, no subcontrato trabajo.',
        submit: 'Enviar forma',
        required: 'obligatorio',
        consent: 'Al enviar aceptas que Gartex Construction te contacte por teléfono o mensaje sobre proyectos.',
        success: '¡Gracias! Recibimos tu información. Te llamamos dentro de 48 horas.',
        errGeneric: 'Algo salió mal. Intenta de nuevo.',
      }
    : {
        title: 'Join the subcontractor network',
        sub: 'Gartex Construction — Houston, TX. Takes 3–4 minutes.',
        intro: "We're building a subcontractor network for home construction projects across Houston. If you have work available and you're insured with a registered company, fill this out and we'll call you this week.",
        langBtn: 'Español',
        contact: 'Contact',
        name: 'Full name',
        company: 'Company name',
        phone: 'Phone',
        email: 'Email',
        trades: 'Trades you offer',
        specialty: 'Describe your specialty',
        specialtyPh: 'Example: drywall and texture, new construction and remodels.',
        years: 'Years in business',
        crew: 'Crew size',
        insuredQ: 'Are you insured?',
        carrier: 'Insurance carrier',
        policy: 'Policy number',
        coverage: 'GL coverage',
        expiry: 'Insurance expiration',
        coiFile: 'Upload COI (certificate of insurance)',
        wc: "Workers' comp",
        entityQ: 'Is your company registered in Texas?',
        legalName: 'Legal entity name',
        ein: 'EIN (optional)',
        w9File: 'Upload W-9',
        capacity: 'Availability',
        capacityPh: 'Example: 2-week backlog, can run 2 jobs at once.',
        whenStart: 'When could you start?',
        counties: 'Counties you work',
        travel: 'Do you work outside Houston?',
        travelPh: 'Example: yes, 10% upcharge outside the metro.',
        licenses: 'Licenses (TX)',
        licensesPh: 'Example: electrician TECL-12345, HVAC TACL-67890.',
        pricing: 'How you price work',
        pricingPh: 'Example: per square foot, per unit, or bid per plans.',
        terms: 'Payment terms you expect',
        refs: 'Two references',
        refsPh: 'Name, company, and phone of a builder you worked for.',
        photos: 'Photos of recent work',
        notes: 'Anything else we should know',
        notesPh: 'Example: own crew, we do not sub out the work.',
        submit: 'Submit',
        required: 'required',
        consent: 'By submitting you agree that Gartex Construction may contact you by phone or message about projects.',
        success: "Thanks — we've got it. We'll call you within 48 hours.",
        errGeneric: 'Something went wrong. Please try again.',
      };

  const tradeChecks = TRADES.map(
    (x) => `<label class="chk"><input type="checkbox" name="trades" value="${esc(x)}"><span>${esc(x)}</span></label>`,
  ).join('');

  const countyChecks = COUNTIES.map(
    (x) => `<label class="chk"><input type="checkbox" name="counties" value="${esc(x)}"><span>${esc(x)}</span></label>`,
  ).join('');

  return `<!DOCTYPE html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${esc(t.title)} · Gartex Construction</title>
<style>
  :root{--navy:#1f3a5f;--navy-d:#152844;--accent:#c87f3a;--line:#dce7f5;--text:#0b1729;--muted:#5a6b7d;--bg:#f4f8ff}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.55}
  .hero{background:linear-gradient(135deg,var(--navy),var(--navy-d));color:#fff;padding:30px 20px 34px;text-align:center}
  .hero .mark{width:46px;height:46px;border-radius:10px;background:#fff;color:var(--navy);display:grid;place-items:center;font-weight:800;font-size:19px;margin:0 auto 12px}
  .hero h1{font-size:25px;font-weight:800;letter-spacing:-.3px}
  .hero p.sub{opacity:.85;font-size:14px;margin-top:6px}
  .wrap{max-width:860px;margin:0 auto;padding:24px 16px 70px}
  .intro{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:9px;padding:16px 18px;font-size:14.5px;margin-bottom:18px}
  form{background:#fff;border:1px solid var(--line);border-radius:11px;padding:22px;box-shadow:0 4px 14px rgba(16,42,67,.06)}
  fieldset{border:0;border-top:1px solid var(--line);padding:20px 0 4px;margin:0 0 4px}
  fieldset:first-of-type{border-top:0;padding-top:4px}
  legend{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--navy);font-weight:800;padding:0;margin-bottom:13px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}
  .full{grid-column:1/-1}
  label.f{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
  label.f .opt{font-weight:400;color:var(--muted);font-size:12px}
  input[type=text],input[type=email],input[type=tel],input[type=number],input[type=date],select,textarea{
    width:100%;padding:11px 12px;border:1px solid #cfdcea;border-radius:7px;font-size:15px;font-family:inherit;background:#fff;color:var(--text)}
  input:focus,select:focus,textarea:focus{outline:2px solid rgba(31,58,95,.35);border-color:var(--navy)}
  textarea{min-height:82px;resize:vertical}
  .checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:7px}
  .chk{display:flex;align-items:center;gap:8px;font-size:13.5px;background:#f7fafd;border:1px solid var(--line);border-radius:7px;padding:8px 10px;cursor:pointer}
  .chk input{width:16px;height:16px;accent-color:var(--navy);flex:none}
  .radio-row{display:flex;gap:9px;flex-wrap:wrap}
  .radio-row label{display:flex;align-items:center;gap:7px;border:1px solid var(--line);background:#f7fafd;border-radius:7px;padding:9px 13px;font-size:13.5px;cursor:pointer}
  .radio-row input{accent-color:var(--navy)}
  input[type=file]{width:100%;font-size:13px;padding:9px;border:1px dashed #bfd0e4;border-radius:7px;background:#f7fafd}
  .hint{font-size:12.5px;color:var(--muted);margin-top:4px}
  button[type=submit]{width:100%;background:var(--accent);border:0;color:#1a1206;font-weight:800;font-size:16px;padding:14px;border-radius:8px;cursor:pointer;font-family:inherit;margin-top:8px}
  button[type=submit]:hover{filter:brightness(1.07)}
  button[type=submit]:disabled{opacity:.6;cursor:not-allowed}
  .consent{font-size:12.5px;color:var(--muted);margin-top:12px;text-align:center}
  .err{background:#fdecec;border:1px solid #f5c2c2;color:#b02a2a;font-size:14px;padding:12px 14px;border-radius:8px;margin-bottom:16px}
  .ok{background:#e8f8ef;border:1px solid #a8ddbd;color:#14663a;font-size:15px;padding:18px;border-radius:9px;text-align:center;font-weight:600}
  .langbtn{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);color:#fff;padding:7px 13px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
  .hero{position:relative}
  @media (max-width:620px){.row{grid-template-columns:1fr}}
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
      <legend>${esc(t.contact)}</legend>
      <div class="row">
        <div><label class="f">${esc(t.name)} *</label><input type="text" name="Name" required autocomplete="name"></div>
        <div><label class="f">${esc(t.company)}</label><input type="text" name="Company" autocomplete="organization"></div>
        <div><label class="f">${esc(t.phone)} *</label><input type="tel" name="Phone" required autocomplete="tel"></div>
        <div><label class="f">${esc(t.email)} *</label><input type="email" name="Email" required autocomplete="email"></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.trades)}</legend>
      <div class="checks">${tradeChecks}</div>
      <div style="margin-top:13px">
        <label class="f">${esc(t.specialty)} *</label>
        <textarea name="Specialty" required placeholder="${esc(t.specialtyPh)}"></textarea>
      </div>
      <div class="row" style="margin-top:13px">
        <div><label class="f">${esc(t.years)}</label><input type="number" name="Years In Business" min="0" max="90"></div>
        <div><label class="f">${esc(t.crew)}</label><input type="number" name="Crew Size" min="0" max="200"></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.insuredQ)}</legend>
      <div class="radio-row" style="margin-bottom:13px">
        <label><input type="radio" name="Insured" value="Yes" required> Yes</label>
        <label><input type="radio" name="Insured" value="No"> No</label>
      </div>
      <div class="row">
        <div><label class="f">${esc(t.carrier)}</label><input type="text" name="Insurance Carrier"></div>
        <div><label class="f">${esc(t.policy)}</label><input type="text" name="Policy Number"></div>
        <div><label class="f">${esc(t.coverage)}</label><input type="text" name="Coverage" placeholder="$1M / occurrence"></div>
        <div><label class="f">${esc(t.expiry)}</label><input type="date" name="COI Expiry"></div>
      </div>
      <div style="margin-bottom:13px">
        <label class="f">${esc(t.coiFile)}</label>
        <input type="file" name="coi" accept=".pdf,.jpg,.jpeg,.png,.webp">
        <div class="hint">PDF or photo. We verify coverage with your carrier.</div>
      </div>
      <div>
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
      <legend>${esc(t.entityQ)}</legend>
      <div class="radio-row" style="margin-bottom:13px">
        <label><input type="radio" name="Entity Registered" value="Yes" required> Yes</label>
        <label><input type="radio" name="Entity Registered" value="No"> No</label>
      </div>
      <div class="row">
        <div><label class="f">${esc(t.legalName)}</label><input type="text" name="Legal Entity"></div>
        <div><label class="f">${esc(t.ein)}</label><input type="text" name="EIN"></div>
      </div>
      <div>
        <label class="f">${esc(t.w9File)}</label>
        <input type="file" name="w9" accept=".pdf,.jpg,.jpeg,.png,.webp">
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.capacity)}</legend>
      <div style="margin-bottom:13px">
        <label class="f">${esc(t.capacity)} *</label>
        <textarea name="Capacity" required placeholder="${esc(t.capacityPh)}"></textarea>
      </div>
      <div class="row">
        <div><label class="f">${esc(t.whenStart)}</label><input type="text" name="When Could You Start" placeholder="2 weeks"></div>
        <div><label class="f">${esc(t.pricing)}</label><input type="text" name="Pricing Model" placeholder="${esc(t.pricingPh)}"></div>
        <div><label class="f">${esc(t.terms)}</label><input type="text" name="Payment Terms" placeholder="Net 15, draws"></div>
        <div><label class="f">${esc(t.licenses)}</label><input type="text" name="License Numbers" placeholder="${esc(t.licensesPh)}"></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.counties)}</legend>
      <div class="checks" style="margin-bottom:13px">${countyChecks}</div>
      <div>
        <label class="f">${esc(t.travel)}</label>
        <textarea name="Travel" placeholder="${esc(t.travelPh)}"></textarea>
      </div>
    </fieldset>

    <fieldset>
      <legend>${esc(t.refs)}</legend>
      <label class="f">${esc(t.refs)}</label>
      <textarea name="References" placeholder="${esc(t.refsPh)}"></textarea>
    </fieldset>

    <fieldset>
      <legend>${esc(t.notes)}</legend>
      <label class="f">${esc(t.notes)}</label>
      <textarea name="Notes" placeholder="${esc(t.notesPh)}"></textarea>
      <div style="margin-top:13px">
        <label class="f">${esc(t.photos)}</label>
        <input type="file" name="photos" accept=".jpg,.jpeg,.png,.webp" multiple>
      </div>
    </fieldset>

    <button type="submit" id="submitBtn">${esc(t.submit)}</button>
    <div class="consent">${esc(t.consent)}</div>
  </form>
</div>
<script>
(function(){
  var form=document.getElementById('form'),msg=document.getElementById('msg'),btn=document.getElementById('submitBtn');
  var lp=new URLSearchParams(location.search).get('lang');
  if(lp==='es'||lp==='en'){
    var u=new URL(location.href);u.searchParams.set('lang',lp==='es'?'en':'es');
    document.getElementById('langBtn').href=u.toString();
  }
  form.addEventListener('submit',async function(e){
    e.preventDefault();
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
    msg.innerHTML='';
    try{
      var res=await fetch('/api/network/intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      var data=await res.json();
      if(!res.ok)throw new Error(data.error||'failed');
      form.style.display='none';
      msg.innerHTML='<div class="ok">'+data.message+'</div>';
    }catch(err){
      msg.innerHTML='<div class="err">'+(err.message||'Error')+'</div>';
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
