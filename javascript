/* ============ STORAGE HELPERS ============ */
const DB_KEY = 'snapstudy_users';
const SESSION_KEY = 'snapstudy_session';
const STREAK_KEY = 'snapstudy_streak';

function getUsers(){ return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); }
function saveUsers(u){ localStorage.setItem(DB_KEY, JSON.stringify(u)); }
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ============ AUTH ============ */
function showAuth(which){
  document.getElementById('view-login').classList.toggle('hidden', which!=='login');
  document.getElementById('view-signup').classList.toggle('hidden', which!=='signup');
}

function handleSignup(){
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim().toLowerCase();
  const pass = document.getElementById('su-pass').value;
  const err = document.getElementById('su-error');
  if(!name || !email || !pass){ err.textContent = 'Please fill in your name, email and password.'; return; }
  if(!email.includes('@')){ err.textContent = 'Please enter a valid email.'; return; }
  const users = getUsers();
  if(users.find(u=>u.email===email)){ err.textContent = 'An account with that email already exists — try logging in.'; return; }
  users.push({name, email, pass});
  saveUsers(users);
  err.textContent = '';
  toast('Account created! Logging you in...');
  startSession(name, email);
}

function handleLogin(){
  const email = document.getElementById('li-email').value.trim().toLowerCase();
  const pass = document.getElementById('li-pass').value;
  const err = document.getElementById('li-error');
  const users = getUsers();
  const found = users.find(u=>u.email===email && u.pass===pass);
  if(!found){ err.textContent = 'No matching account. Check your details or sign up.'; return; }
  err.textContent = '';
  startSession(found.name, found.email);
}

function demoLogin(){
  const users = getUsers();
  if(!users.find(u=>u.email==='demo@snapstudy.app')){
    users.push({name:'Demo Student', email:'demo@snapstudy.app', pass:'demo'});
    saveUsers(users);
  }
  startSession('Demo Student','demo@snapstudy.app');
}

function startSession(name, email){
  localStorage.setItem(SESSION_KEY, JSON.stringify({name, email}));
  enterApp(name, email);
}

function handleLogout(){
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('app-shell').style.display = 'none';
  showAuth('login');
  toast('Logged out — see you tomorrow!');
}

function enterApp(name, email){
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-signup').classList.add('hidden');
  document.getElementById('app-shell').style.display = 'flex';
  document.getElementById('greet-name').textContent = 'Hi, ' + name.split(' ')[0] + ' 👋';
  document.getElementById('dash-greet').textContent = 'Welcome back, ' + name.split(' ')[0] + ' 👋';
  document.getElementById('set-name').value = name;
  document.getElementById('set-email').value = email;
  showView('dashboard');
  refreshStreakUI();
  refreshDashStats();
}

/* ============ NAVIGATION ============ */
function showView(id){
  document.querySelectorAll('main .view').forEach(v=>v.classList.add('hidden'));
  document.getElementById('view-'+id).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  if(id==='streak') refreshStreakUI();
  if(id==='dashboard') refreshDashStats();
}

/* ============ AI TUTOR (rule-based, always works offline) ============ */
const RESPONSE_BANK = {
  maths: [
    "Break it into smaller steps — write down what you know, what you need to find, then the formula that connects them.",
    "Try substituting easy numbers first to see the pattern before using the real values.",
    "Draw it out! A quick diagram or number line makes most maths problems click faster."
  ],
  english: [
    "Start with a one-line summary of your main point, then back it up with one quote or example.",
    "Read your sentence out loud — if you run out of breath, it's probably two sentences, not one.",
    "Use the P.E.E. method: Point, Evidence, Explain. It works for almost any English answer."
  ],
  science: [
    "Identify the variable being tested first — that usually tells you what the question is really asking.",
    "Try explaining it like you're teaching a Year 7 — if you can simplify it, you understand it.",
    "Sketch a quick diagram of the process; science questions are often easier once you can see them."
  ],
  history: [
    "Think in terms of Cause → Event → Effect — most history answers fit that structure.",
    "Ask 'who benefited?' — it usually reveals the motive behind the event.",
    "Timeline it out on paper first, then write your answer from the timeline."
  ],
  general: [
    "You don't need to know everything at once — just the next small step. What's the very first part you're stuck on?",
    "That's a totally fair question — a lot of students get stuck right there. Let's break it down together.",
    "Good instinct to ask instead of guessing. Can you tell me which part specifically feels confusing?"
  ]
};
let chatCount = parseInt(localStorage.getItem('snapstudy_qcount') || '0');

/* ---- Real calculator: handles chained expressions, percentages and square roots ---- */
function tryCalculate(text){
  let clean = text.trim().replace(/\s+/g,' ');

  const pctMatch = clean.match(/^(-?\d+(\.\d+)?)\s*%\s*of\s*(-?\d+(\.\d+)?)$/i);
  if(pctMatch){
    const result = (parseFloat(pctMatch[1])/100) * parseFloat(pctMatch[3]);
    return `${pctMatch[1]}% of ${pctMatch[3]} = <b>${Math.round(result*10000)/10000}</b>`;
  }

  const sqrtMatch = clean.match(/^sqrt\(?\s*(-?\d+(\.\d+)?)\)?$/i) || clean.match(/^square root of (-?\d+(\.\d+)?)$/i);
  if(sqrtMatch){
    const n = parseFloat(sqrtMatch[1]);
    if(n<0) return "Can't take the square root of a negative number in real maths — that's where imaginary numbers (i) come in, if you've covered that yet!";
    return `√${n} = <b>${Math.round(Math.sqrt(n)*10000)/10000}</b>`;
  }

  clean = clean.replace(/\bx\b/gi,'*').replace(/×/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/=|\?/g,'').trim();
  if(/^[\d+\-*/(). ]+$/.test(clean) && /\d/.test(clean) && /[+\-*/]/.test(clean)){
    try{
      const result = Function('"use strict"; return (' + clean + ')')();
      if(typeof result === 'number' && isFinite(result)){
        return `${text.trim().replace(/\?$/,'')} = <b>${Math.round(result*10000)/10000}</b>`;
      }
    }catch(e){ /* not a valid expression, fall through */ }
  }
  return null;
}

/* ---- Knowledge base: common school Q&A, checked before the generic fallback ---- */
const KNOWLEDGE_BASE = [
  { pattern:/pythagoras/i, answer:"Pythagoras' theorem: a² + b² = c² — it only works on right-angled triangles, where c is the longest side (the hypotenuse)." },
  { pattern:/order of operations|bidmas|bodmas|pemdas/i, answer:"Order of operations = BIDMAS: Brackets, Indices, Division/Multiplication (left to right), Addition/Subtraction (left to right)." },
  { pattern:/area of a?\s*circle/i, answer:"Area of a circle = π × r² (radius squared, times pi)." },
  { pattern:/area of a?\s*triangle/i, answer:"Area of a triangle = ½ × base × height." },
  { pattern:/prime number/i, answer:"A prime number has exactly two factors: 1 and itself. 2, 3, 5, 7, 11, 13... (2 is the only even prime)." },
  { pattern:/mean.*median.*mode|median.*mean/i, answer:"Mean = add them all up ÷ how many there are. Median = the middle value when sorted. Mode = the value that appears most often." },
  { pattern:/simile/i, answer:"A simile compares two things using 'like' or 'as' — e.g. 'brave as a lion'." },
  { pattern:/metaphor/i, answer:"A metaphor says one thing IS another for effect — e.g. 'time is money' — no 'like' or 'as' needed." },
  { pattern:/p\.?e\.?e\.?\s*(structure|method)?/i, answer:"P.E.E. = Point (make your claim), Evidence (quote or example), Explain (link it back to the question)." },
  { pattern:/thesis statement/i, answer:"A thesis statement is a one or two sentence summary of the main argument your whole essay is going to prove." },
  { pattern:/active.*passive voice|passive.*active voice/i, answer:"Active voice: the subject does the action ('The dog bit the man'). Passive voice: the subject receives the action ('The man was bitten by the dog')." },
  { pattern:/photosynthesis/i, answer:"Photosynthesis: plants use sunlight to turn carbon dioxide + water into glucose (food) + oxygen. Happens mainly in the leaves, in the chloroplasts." },
  { pattern:/newton'?s? (first|1st) law/i, answer:"Newton's 1st Law: an object stays at rest, or keeps moving at a constant velocity, unless an unbalanced force acts on it (inertia)." },
  { pattern:/newton'?s? (second|2nd) law/i, answer:"Newton's 2nd Law: Force = mass × acceleration (F = ma)." },
  { pattern:/newton'?s? (third|3rd) law/i, answer:"Newton's 3rd Law: for every action there's an equal and opposite reaction." },
  { pattern:/states? of matter/i, answer:"The main states of matter are solid, liquid and gas — particles are packed tightest in solids and most spread out (and fastest moving) in gases." },
  { pattern:/water cycle/i, answer:"Water cycle, roughly: evaporation (water → vapour) → condensation (vapour → clouds) → precipitation (rain/snow) → collection (rivers, oceans) → repeat." },
  { pattern:/atom (structure|made of|parts)|parts of an atom/i, answer:"An atom has a nucleus (protons + neutrons) in the middle, with electrons orbiting around it. Protons are positive, electrons are negative, neutrons are neutral." },
  { pattern:/primary source/i, answer:"A primary source was created at the time of the event by someone who witnessed it — e.g. a diary, photo, or letter." },
  { pattern:/secondary source/i, answer:"A secondary source was created after the event, analysing or interpreting it — e.g. a textbook or documentary." },
  { pattern:/federation.*australia|australia.*federation/i, answer:"Australian Federation: 1 January 1901 — the six separate British colonies united to form one nation, the Commonwealth of Australia." },
  { pattern:/capital of australia/i, answer:"Canberra is the capital of Australia (not Sydney — common mix-up!)." },
  { pattern:/how many (states|territories).*australia/i, answer:"Australia has 6 states (NSW, VIC, QLD, WA, SA, TAS) and 2 mainland territories (NT and ACT)." },

  /* ---- more maths ---- */
  { pattern:/fraction.*decimal|decimal.*fraction/i, answer:"To turn a fraction into a decimal, divide the numerator (top) by the denominator (bottom) — e.g. 3/4 = 3 ÷ 4 = 0.75." },
  { pattern:/percentage.*decimal|decimal.*percentage/i, answer:"Percentage → decimal: divide by 100 (25% = 0.25). Decimal → percentage: multiply by 100 (0.6 = 60%)." },
  { pattern:/\bratio\b/i, answer:"A ratio compares two quantities — e.g. 3:2 means for every 3 of one thing, there are 2 of the other. Simplify ratios the same way you simplify fractions." },
  { pattern:/simple interest/i, answer:"Simple Interest = P × R × T (Principal × Rate as a decimal × Time in years)." },
  { pattern:/quadratic formula/i, answer:"Quadratic formula: x = (−b ± √(b²−4ac)) / 2a — used to solve ax² + bx + c = 0." },
  { pattern:/solve.*linear equation|linear equation/i, answer:"To solve a linear equation: get all the x-terms on one side and numbers on the other by doing the same operation to both sides, then divide to isolate x." },
  { pattern:/gradient|slope of a line/i, answer:"Gradient (slope) = rise ÷ run = (y₂ − y₁) / (x₂ − x₁) — how steep a line is." },
  { pattern:/circumference/i, answer:"Circumference of a circle = 2 × π × r (or π × diameter)." },
  { pattern:/volume of a?\s*cube|volume of a?\s*rectangular prism/i, answer:"Volume of a cube/rectangular prism = length × width × height." },
  { pattern:/volume of a?\s*cylinder/i, answer:"Volume of a cylinder = π × r² × height." },
  { pattern:/angles in a triangle/i, answer:"The angles inside any triangle always add up to 180°." },
  { pattern:/angles in a quadrilateral/i, answer:"The angles inside any quadrilateral (4-sided shape) always add up to 360°." },
  { pattern:/types? of angles?/i, answer:"Acute = less than 90°, Right = exactly 90°, Obtuse = between 90° and 180°, Straight = 180°, Reflex = more than 180°." },
  { pattern:/factoris|factoriz/i, answer:"Factorising means writing an expression as things multiplied together — e.g. 2x + 4 = 2(x + 2). Look for the highest common factor first." },
  { pattern:/expand.*bracket|expanding brackets/i, answer:"Expanding brackets means multiplying everything inside by what's outside — e.g. 3(x + 2) = 3x + 6." },
  { pattern:/index law|indices rule/i, answer:"Key index laws: aᵐ × aⁿ = aᵐ⁺ⁿ, aᵐ ÷ aⁿ = aᵐ⁻ⁿ, (aᵐ)ⁿ = aᵐˣⁿ, a⁰ = 1." },
  { pattern:/negative numbers?.*(rule|multiply|divide)/i, answer:"Same signs multiply/divide to a positive (− × − = +), different signs give a negative (− × + = −)." },
  { pattern:/pythagorean triple/i, answer:"A Pythagorean triple is a set of 3 whole numbers that satisfy a²+b²=c² — the most common is 3, 4, 5 (and its multiples like 6,8,10)." },

  /* ---- more English ---- */
  { pattern:/alliteration/i, answer:"Alliteration is repeating the same starting sound in nearby words — e.g. 'She sells seashells'." },
  { pattern:/personification/i, answer:"Personification gives human qualities to something non-human — e.g. 'the wind whispered'." },
  { pattern:/onomatopoeia/i, answer:"Onomatopoeia is a word that sounds like what it means — e.g. 'buzz', 'crash', 'sizzle'." },
  { pattern:/hyperbole/i, answer:"Hyperbole is deliberate exaggeration for effect — e.g. 'I've told you a million times'." },
  { pattern:/\birony\b/i, answer:"Irony is when the opposite of what's expected happens, or words mean the opposite of what's said — e.g. a fire station burning down." },
  { pattern:/symbolis/i, answer:"Symbolism is using an object or image to represent a bigger idea — e.g. a dove often symbolises peace." },
  { pattern:/protagonist/i, answer:"The protagonist is the main character the story follows — usually who the reader is meant to root for." },
  { pattern:/antagonist/i, answer:"The antagonist is the character (or force) that opposes the protagonist — the 'villain' role, but doesn't have to be evil." },
  { pattern:/first person.*third person|third person.*first person|point of view/i, answer:"First person: told using 'I/we' (the narrator is a character). Third person: told using 'he/she/they' (narrator is outside the story)." },
  { pattern:/persuasive technique/i, answer:"Common persuasive techniques: rhetorical questions, emotive language, repetition, statistics/facts, expert opinion, rule of three." },
  { pattern:/rhetorical question/i, answer:"A rhetorical question is asked for effect, not to get an answer — e.g. 'Don't we all deserve better?'" },
  { pattern:/emotive language/i, answer:"Emotive language is word choice designed to trigger an emotional reaction — e.g. 'devastating' instead of 'bad'." },
  { pattern:/noun|verb|adjective|adverb/i, answer:"Noun = a thing/person/place. Verb = an action or state. Adjective = describes a noun. Adverb = describes a verb (often ends in -ly)." },
  { pattern:/semicolon/i, answer:"A semicolon joins two related complete sentences without using 'and' — e.g. 'I was tired; I went to bed.'" },
  { pattern:/introduction.*body.*conclusion|essay structure/i, answer:"Standard essay structure: Introduction (thesis + outline) → Body paragraphs (P.E.E. each) → Conclusion (restate thesis, sum up)." },

  /* ---- more science ---- */
  { pattern:/plant cell.*animal cell|animal cell.*plant cell|difference.*cells?/i, answer:"Plant cells have a cell wall, chloroplasts and a large vacuole that animal cells don't have. Both have a nucleus, cell membrane, mitochondria and cytoplasm." },
  { pattern:/food chain/i, answer:"A food chain shows energy flow: Producer (plant) → Primary consumer (herbivore) → Secondary consumer (carnivore) → Decomposer breaks it all down." },
  { pattern:/food web/i, answer:"A food web is several connected food chains, showing how most animals eat more than one type of food." },
  { pattern:/\bfriction\b/i, answer:"Friction is a force that resists motion between two surfaces touching each other — it's why things slow down and stop." },
  { pattern:/gravity/i, answer:"Gravity is the force that pulls objects with mass toward each other — on Earth it pulls everything toward the ground at about 9.8 m/s²." },
  { pattern:/kinetic.*potential|potential.*kinetic/i, answer:"Kinetic energy = energy of movement. Potential energy = stored energy (e.g. height, stretched spring) that could become kinetic." },
  { pattern:/acid.*base|ph scale/i, answer:"The pH scale runs 0–14: below 7 is acidic, 7 is neutral (pure water), above 7 is basic/alkaline." },
  { pattern:/natural selection|evolution/i, answer:"Natural selection: organisms with traits better suited to their environment survive and reproduce more, passing those traits on — over time this changes the species." },
  { pattern:/ecosystem/i, answer:"An ecosystem is all the living things (plants, animals) and non-living things (water, soil, climate) in an area, interacting together." },
  { pattern:/rock cycle/i, answer:"Rock cycle, roughly: Igneous rock (cooled magma) → weathers into sediment → becomes Sedimentary rock → heat/pressure turns it into Metamorphic rock → melts back into magma → repeat." },
  { pattern:/theory.*hypothesis|hypothesis.*theory/i, answer:"A hypothesis is a testable prediction. A theory is a well-tested, widely accepted explanation backed by lots of evidence — theories are stronger than hypotheses, not weaker." },
  { pattern:/series.*parallel circuit|parallel.*series circuit/i, answer:"Series circuit: one path, if it breaks everything stops. Parallel circuit: multiple paths, each component can work independently." },
  { pattern:/renewable.*non-?renewable|non-?renewable.*renewable/i, answer:"Renewable energy (solar, wind, hydro) naturally replenishes. Non-renewable (coal, oil, gas) is finite and takes millions of years to form." },

  /* ---- more history ---- */
  { pattern:/causes? of (world war (one|1|i)|ww1|wwi)/i, answer:"Main causes of WWI, remembered as MAIN: Militarism, Alliances, Imperialism, Nationalism — sparked by the assassination of Archduke Franz Ferdinand in 1914." },
  { pattern:/causes? of (world war (two|2|ii)|ww2|wwii)/i, answer:"Main causes of WWII: the harsh Treaty of Versailles after WWI, the Great Depression, the rise of fascism (Hitler, Mussolini), and failed appeasement policies." },
  { pattern:/cold war/i, answer:"The Cold War (roughly 1947–1991) was a period of tension between the USA and USSR — no direct fighting between them, but proxy wars, an arms race, and a space race." },
  { pattern:/pyramids?/i, answer:"Ancient Egyptian pyramids were built as tombs for pharaohs, designed to help them journey safely into the afterlife." },
  { pattern:/colosseum/i, answer:"The Colosseum in Rome was an amphitheatre built around 80 CE, used for gladiator contests and public spectacles." },
  { pattern:/industrial revolution/i, answer:"The Industrial Revolution (from the late 1700s) was the shift from hand-made goods to machine and factory production, starting in Britain." },
  { pattern:/first fleet|colonisation of australia|1788/i, answer:"The First Fleet of British ships arrived at Sydney Cove in January 1788, beginning British colonisation of Australia." },
  { pattern:/eureka stockade/i, answer:"The Eureka Stockade (1854) was a rebellion by gold miners in Ballarat, Victoria, against unfair licence fees — seen as an early step toward Australian democracy." },
  { pattern:/branches? of government|legislative.*executive.*judiciary/i, answer:"Three branches of government: Legislative (makes laws — Parliament), Executive (enforces laws — Government/PM), Judiciary (interprets laws — Courts)." },
  { pattern:/democracy/i, answer:"Democracy is a system where citizens have the power to choose their government, usually through voting." },

  /* ---- study skills (matches the app's whole purpose) ---- */
  { pattern:/how (do|to) i? ?study|study tips|study for (an? )?exam/i, answer:"Try active recall + spaced repetition: quiz yourself instead of re-reading notes, and review a little bit every few days instead of cramming once." },
  { pattern:/procrastinat/i, answer:"Beat procrastination with the '2-minute rule' — commit to just 2 minutes of the task. Starting is usually the hardest part; momentum does the rest." },
  { pattern:/how (do|to) i? ?focus|can'?t concentrate/i, answer:"Try the Pomodoro technique: 25 minutes focused work, 5 minute break, repeat. Put your phone in another room while you work." },
  { pattern:/take notes|note.?taking/i, answer:"Try the Cornell method: split your page into notes, a cue column for keywords/questions, and a summary at the bottom." },
  { pattern:/time management/i, answer:"Write down everything you need to do, then rank it by deadline + difficulty. Do the hardest task first while your energy is highest." }
];

/* Decides what SnapBot actually says, checking specific things before falling back to a general tip */
function getBotReply(text, subject){
  const calc = tryCalculate(text);
  if(calc) return calc;

  if(/^\s*(hi|hey|hello|yo|sup|g'?day)\b/i.test(text)){
    return "Hey there! What are you working on right now — I can help with maths, English, science or history.";
  }
  if(/thank/i.test(text)){
    return "Anytime! That's what I'm here for. Got another question?";
  }
  if(/how are you/i.test(text)){
    return "Running smoothly and ready to help! More importantly — how's the study going?";
  }
  if(/what('?s| is) your name|who are you/i.test(text)){
    return "I'm SnapBot, your SnapStudy tutor. Ask me a subject question any time.";
  }

  for(const item of KNOWLEDGE_BASE){
    if(item.pattern.test(text)) return item.answer;
  }

  if(/essay|paragraph|writing/i.test(text)) return RESPONSE_BANK.english[0];
  if(/algebra|equation|solve for/i.test(text)) return RESPONSE_BANK.maths[0];
  if(/don'?t (know|get)|stuck|confused|help me/i.test(text)){
    return "No worries — that's exactly what I'm here for. Tell me one thing you DO understand about it, and we'll build from there.";
  }

  const bank = RESPONSE_BANK[subject] || RESPONSE_BANK.general;
  return bank[Math.floor(Math.random()*bank.length)];
}

function clearChat(){
  document.getElementById('chat-window').innerHTML =
    '<div class="bubble bot"><b>SnapBot:</b> Chat cleared. What do you want to work on?</div>';
}

function askBot(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text) return;
  const subject = document.getElementById('tutor-subject').value;
  const win = document.getElementById('chat-window');

  const userBubble = document.createElement('div');
  userBubble.className = 'bubble user';
  userBubble.textContent = text;
  win.appendChild(userBubble);
  input.value = '';
  win.scrollTop = win.scrollHeight;

  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  win.appendChild(typing);
  win.scrollTop = win.scrollHeight;

  setTimeout(()=>{
    typing.remove();
    let reply = getBotReply(text, subject);

    const botBubble = document.createElement('div');
    botBubble.className = 'bubble bot';
    botBubble.innerHTML = '<b>SnapBot:</b> ' + reply;
    win.appendChild(botBubble);
    win.scrollTop = win.scrollHeight;

    chatCount++;
    localStorage.setItem('snapstudy_qcount', chatCount);
    refreshDashStats();
  }, 700 + Math.random()*500);
}

/* ============ FLASHCARDS ============ */
function previewImage(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    const img = document.getElementById('preview-img');
    img.src = ev.target.result;
    img.classList.remove('hidden');
    document.getElementById('upload-text').textContent = '✅ ' + file.name + ' uploaded';
  };
  reader.readAsDataURL(file);
}

const FLASHCARD_BANK = {
  maths: [["Pythagoras' theorem","a² + b² = c²"],["Order of operations","BIDMAS: Brackets, Indices, Div/Mult, Add/Sub"],["Area of a circle","π × r²"],["Gradient formula","(y₂−y₁) / (x₂−x₁)"]],
  english: [["Simile","Compares two things using 'like' or 'as'"],["Metaphor","Says one thing IS another for effect"],["P.E.E. structure","Point, Evidence, Explain"],["Tone","The writer's attitude toward the subject"]],
  science: [["Photosynthesis","Plants turn CO₂ + water + light into glucose + O₂"],["Newton's 1st Law","An object stays at rest or in motion unless a force acts on it"],["Atom","Smallest unit of matter — protons, neutrons, electrons"],["Independent variable","The one YOU change in an experiment"]],
  history: [["Cause vs effect","Cause = why it happened, Effect = what happened after"],["Primary source","Created at the time of the event"],["Secondary source","Created after, analysing the event"],["Federation (Aus)","1901 — the six colonies united as one nation"]]
};

function generateFlashcards(){
  const subject = document.getElementById('flash-subject').value;
  const cards = FLASHCARD_BANK[subject] || FLASHCARD_BANK.maths;
  const grid = document.getElementById('flash-grid');
  grid.innerHTML = '';
  cards.forEach(([front, back])=>{
    const card = document.createElement('div');
    card.className = 'flashcard';
    card.onclick = ()=>card.classList.toggle('flipped');
    card.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-face flashcard-front">${front}</div>
        <div class="flashcard-face flashcard-back">${back}</div>
      </div>`;
    grid.appendChild(card);
  });
  const made = parseInt(localStorage.getItem('snapstudy_cardcount')||'0') + cards.length;
  localStorage.setItem('snapstudy_cardcount', made);
  refreshDashStats();
  toast('Flashcards ready — click a card to flip it!');
}

/* ============ SMART SUMMARY (real lightweight algorithm) ============ */
function generateSummary(){
  const raw = document.getElementById('summary-input').value.trim();
  const out = document.getElementById('summary-output');
  if(!raw){ out.innerHTML = 'Paste some notes above first!'; return; }

  const sentences = raw.replace(/\n+/g,' ').split(/(?<=[.!?])\s+/).filter(s=>s.trim().length>0);
  let key = sentences.filter(s=>s.split(' ').length>6);
  if(key.length===0) key = sentences;
  key = key.sort((a,b)=>b.length-a.length).slice(0, Math.max(3, Math.ceil(sentences.length*0.4)));
  const originalOrder = sentences.filter(s=>key.includes(s));

  out.innerHTML = '<ul>' + originalOrder.map(s=>`<li>${s.trim()}</li>`).join('') + '</ul>';
  toast('Summary ready!');
}

/* ============ STUDY STREAK ============ */
function getStreakData(){
  return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"days":{}}');
}
function saveStreakData(d){ localStorage.setItem(STREAK_KEY, JSON.stringify(d)); }

function markToday(){
  const d = getStreakData();
  const today = new Date().toDateString();
  if(d.days[today]){ toast("Already marked today — nice work!"); return; }
  d.days[today] = true;
  d.count += 1;
  saveStreakData(d);
  refreshStreakUI();
  refreshDashStats();
  toast('Day logged! Streak: ' + d.count);
}

function refreshStreakUI(){
  const d = getStreakData();
  document.getElementById('streak-num').textContent = d.count + (d.count===1 ? ' day' : ' days');
  document.getElementById('stat-streak').textContent = d.count;

  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay()+6)%7));
  for(let i=0;i<7;i++){
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate()+i);
    const done = !!d.days[day.toDateString()];
    const box = document.createElement('div');
    box.className = 'day-box' + (done?' done':'');
    box.innerHTML = `<div class="mark">${done?'✔️':'—'}</div><div>${labels[i]}</div>`;
    grid.appendChild(box);
  }

  const badgeWrap = document.getElementById('badges');
  const milestones = [{n:3,label:'3-Day Spark 🔥'},{n:7,label:'1 Week Streak ⭐'},{n:14,label:'2 Week Legend 🏆'},{n:30,label:'30-Day Master 👑'}];
  badgeWrap.innerHTML = milestones.map(m=>
    `<div class="badge ${d.count>=m.n?'':'locked'}">${m.label}${d.count>=m.n?'':' (locked)'}</div>`
  ).join('');
}

/* ============ THEME (colour reward — live CSS variable swap) ============ */
function setTheme(theme){
  const map = {
    blue:'#5F93D6',
    green:'#3B7A3B',
    mauve:'#A85578',
    gold:'#C98A2C'
  };
  document.documentElement.style.setProperty('--accent', map[theme] || map.blue);
  toast('Theme updated!');
}

/* ============ DASHBOARD STATS ============ */
function refreshDashStats(){
  document.getElementById('stat-questions').textContent = localStorage.getItem('snapstudy_qcount') || '0';
  document.getElementById('stat-cards').textContent = localStorage.getItem('snapstudy_cardcount') || '0';
  document.getElementById('stat-streak').textContent = getStreakData().count;
}

/* ============ SETTINGS ============ */
function saveSettings(){
  toast('Settings saved!');
}

/* ============ RESTORE SESSION ON LOAD ============ */
(function init(){
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if(session){ enterApp(session.name, session.email); }
})();
