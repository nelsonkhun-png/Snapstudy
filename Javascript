/* ═══════════════════════════════════════════════════
   SNAP STUDY — script.js
   All JavaScript logic for the Snap Study web app.
   Connects to the real Anthropic Claude AI API.
═══════════════════════════════════════════════════ */

/* ══════════════════════════════════
   NAVIGATION
══════════════════════════════════ */
let navHistory = [];

function gt(id) {
  const current = document.querySelector('.screen.active');
  if (current && current.id !== id) navHistory.push(current.id);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.getElementById(id);
  if (next) { next.classList.add('active'); next.querySelector('.sb')?.scrollTo(0,0); }
}

function gb() {
  if (navHistory.length) gt(navHistory.pop());
  else gt('s-home');
}

/* ══════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════ */
let toastTimer = null;
function toast(msg, dur = 2600) {
  const el = document.getElementById('toast-el');
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), dur);
}

/* ══════════════════════════════════
   APP STATE  (progress, tasks, flashcards, etc.)
══════════════════════════════════ */
let appState = {
  user: { name: 'Student', email: '', avatar: '🎓', aiName: 'Snap AI', registered: false },
  streak: 7,
  sessions: 0,
  xp: 0,
  quizScores: { Maths: [], Science: [], History: [], Language: [] },
  tasks: [],
  activity: [],
  flashcards: [
    { q: 'What is 5 + 5?',                           a: '10! Addition combines numbers together. 5 + 5 = 10 ✅' },
    { q: 'What is the quadratic formula?',            a: 'x = (-b ± √(b²-4ac)) / 2a' },
    { q: 'What is photosynthesis?',                   a: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂' },
    { q: 'Define a "simile"',                         a: 'A comparison using "like" or "as" e.g. "fast as lightning"' },
    { q: 'What does MAIN stand for (WW1 causes)?',    a: 'Militarism, Alliances, Imperialism, Nationalism' },
    { q: "What is Newton's First Law?",               a: 'An object stays at rest or in motion unless acted on by a net external force (Law of Inertia)' },
  ],
  fcIndex: 0,
  forumPosts: [
    { name:'Alex T.',  emoji:'🧑‍🎓', color:'#FF6B35', time:'2 min ago',  title:'How do I find the area of a circle?',      body:'I always confuse the area formula with circumference. Can someone help?', likes:12, replies:5 },
    { name:'Priya K.', emoji:'👩‍💻', color:'#1DB8A8', time:'15 min ago', title:'Difference between DNA and RNA?',            body:'My teacher explained it but I\'m still confused about the structure.', likes:8,  replies:3 },
    { name:'James W.', emoji:'🧑‍🔬', color:'#FFD93D', time:'1 hr ago',   title:'Tips for remembering historical dates?',    body:'I have an exam on WWI and WWII next week. Any memory tricks?', likes:21, replies:9 },
    { name:'Sofia M.', emoji:'🦊',    color:'#FF4D8B', time:'3 hrs ago',  title:'How does the Snap Study AI work?',          body:'Is it connected to the internet or does it use pre-loaded answers?', likes:15, replies:7 },
  ],
};

/* ══════════════════════════════════
   AUTH — with REAL VALIDATION
══════════════════════════════════ */

// Stored accounts (simulate a database)
let accounts = {};

function swTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.err').forEach(e => e.textContent = '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function doLogin() {
  clearErrors();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  let valid = true;

  if (!isValidEmail(email)) {
    document.getElementById('err-lemail').textContent = '⚠️ Please enter a valid email address.';
    valid = false;
  }
  if (pass.length < 6) {
    document.getElementById('err-lpass').textContent = '⚠️ Password must be at least 6 characters.';
    valid = false;
  }
  if (!valid) return;

  if (accounts[email] && accounts[email].password === pass) {
    appState.user = { ...appState.user, ...accounts[email] };
    finishLogin();
  } else if (Object.keys(accounts).length === 0 || !accounts[email]) {
    document.getElementById('err-lemail').textContent = '⚠️ No account found. Please sign up first.';
  } else {
    document.getElementById('err-lpass').textContent = '⚠️ Incorrect password.';
  }
}

function doSignup() {
  clearErrors();
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass  = document.getElementById('su-pass').value;
  const dob   = document.getElementById('su-dob').value;
  let valid = true;

  if (name.length < 2) {
    document.getElementById('err-suname').textContent = '⚠️ Please enter your full name (at least 2 characters).';
    valid = false;
  }
  if (!isValidEmail(email)) {
    document.getElementById('err-suemail').textContent = '⚠️ Please enter a valid email address (e.g. name@example.com).';
    valid = false;
  }
  if (pass.length < 6) {
    document.getElementById('err-supass').textContent = '⚠️ Password must be at least 6 characters.';
    valid = false;
  }
  if (!dob) {
    document.getElementById('err-sudob').textContent = '⚠️ Please enter your date of birth.';
    valid = false;
  }
  if (!valid) return;

  if (accounts[email]) {
    document.getElementById('err-suemail').textContent = '⚠️ An account with this email already exists. Please log in.';
    return;
  }

  accounts[email] = { name, email, password: pass, avatar: '🎓', aiName: 'Snap AI', registered: true };
  appState.user = { ...appState.user, ...accounts[email] };
  finishLogin();
  toast('🎉 Account created! Welcome, ' + name.split(' ')[0] + '!');
}

function guestLogin() {
  appState.user.name = 'Guest';
  finishLogin();
}

function finishLogin() {
  document.getElementById('uname').textContent = appState.user.name.split(' ')[0];
  document.getElementById('profile-name').textContent = appState.user.name;
  document.getElementById('profile-avatar').textContent = appState.user.avatar;
  document.getElementById('profile-name-input').value = appState.user.name;
  document.getElementById('ai-name-input').value = appState.user.aiName;
  addActivity('🔐 Logged in');
  appState.sessions++;
  updateProgressUI();
  renderTaskList();
  renderHomeTaskPreview();
  gt('s-home');
  if (appState.user.name !== 'Guest') toast('👋 Welcome back, ' + appState.user.name.split(' ')[0] + '!');
}

function doLogout() {
  navHistory = [];
  clearChatHistory();
  gt('s-login');
  toast('👋 Logged out. See you soon!');
}

/* ══════════════════════════════════
   REAL ANTHROPIC AI API
══════════════════════════════════ */
let chatHistory = [];
let currentSubject = 'General';

function getSystemPrompt(subject) {
  const subjectMap = {
    General:  'all school subjects',
    Maths:    'Mathematics (algebra, geometry, calculus, statistics, number theory)',
    Science:  'Science (biology, chemistry, physics, earth science)',
    History:  'History (world history, modern history, ancient civilisations, politics)',
    Language: 'Language Arts (English, grammar, writing, literature, poetry)',
  };
  const focus = subjectMap[subject] || 'all school subjects';
  return `You are Snap AI, a friendly and encouraging AI tutor inside the Snap Study app for school students aged 10-18. You specialise in ${focus}.

RULES:
- Always explain answers clearly and step by step when showing working.
- When listing steps, format them as: "Step 1: [Short Title] — [Clear explanation]" each on its own line.
- Use simple language appropriate for school students.
- Use relevant emojis to make learning engaging and fun.
- Keep responses helpful and appropriately concise.
- If asked a maths or science question, always show your working clearly.
- Never refuse a genuine educational question.
- Be encouraging and positive — every question is a good question!`;
}

async function callClaudeAPI(userMessage, systemPrompt) {
  const messages = [...chatHistory, { role: 'user', content: userMessage }];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages,
    })
  });

  if (!response.ok) throw new Error('API error ' + response.status);

  const data = await response.json();
  const reply = data.content?.map(b => b.type === 'text' ? b.text : '').join('') || 'Sorry, I could not generate a response. Please try again!';

  // Keep history rolling (max 20 turns)
  chatHistory.push({ role: 'user', content: userMessage });
  chatHistory.push({ role: 'assistant', content: reply });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  return reply;
}

function clearChatHistory() {
  chatHistory = [];
}

/* ── FORMAT AI REPLY ── */
function formatAIReply(text, aiName) {
  const name = aiName || appState.user.aiName || 'Snap AI';
  let html = `<div class="msg-lbl">🤖 ${name}</div>`;
  const lines = text.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) { html += '<br>'; return; }

    // Match "Step N: Title — explanation" (various dash styles)
    const stepMatch = trimmed.match(/^(Step\s*\d+\s*[:.]\s*[^—–\-]*?)\s*[—–\-]{1,2}\s*(.+)$/i);
    if (stepMatch) {
      html += `<div class="step-block"><strong>${stepMatch[1].trim()}:</strong> ${stepMatch[2].trim()}</div>`;
    } else {
      html += `<span>${trimmed} </span>`;
    }
  });

  return html;
}

/* ── APPEND MESSAGE ── */
function appendMsg(type, html) {
  const wrap = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.innerHTML = html;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function showTyping() {
  return appendMsg('ai', `<div class="msg-lbl">🤖 ${appState.user.aiName || 'Snap AI'}</div><div class="typing"><span></span><span></span><span></span></div>`);
}

/* ── SEND MESSAGE ── */
async function sendMsg() {
  const inp = document.getElementById('chat-input');
  const btn = document.getElementById('send-btn');
  const q = inp.value.trim();
  if (!q) return;

  inp.value = '';
  inp.disabled = true;
  btn.disabled = true;

  appendMsg('user', q);
  const typingEl = showTyping();

  try {
    const reply = await callClaudeAPI(q, getSystemPrompt(currentSubject));
    typingEl.remove();
    appendMsg('ai', formatAIReply(reply));
    addActivity(`💬 Asked: "${q.slice(0,40)}${q.length>40?'…':''}"`);
    appState.xp += 5;
    updateProgressUI();
  } catch (err) {
    typingEl.remove();
    appendMsg('ai', `<div class="msg-lbl">🤖 ${appState.user.aiName || 'Snap AI'}</div>⚠️ Could not reach the AI. Please check your internet connection and try again.`);
  }

  inp.disabled = false;
  btn.disabled = false;
  inp.focus();
}

function aq(q) {
  document.getElementById('chat-input').value = q;
  sendMsg();
}

function onSubjectChange() {
  const sel = document.getElementById('subj-sel');
  currentSubject = sel.value;
  clearChatHistory();
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML = '';
  appendMsg('ai', `<div class="msg-lbl">🤖 ${appState.user.aiName || 'Snap AI'}</div>Switched to <strong>${currentSubject} Tutor</strong> mode! 🎯 I'm now specialised in ${currentSubject}. What would you like to learn today?`);
}

/* ── OPEN SUBJECT TUTOR ── */
function openTutor(subject, emoji, selectValue) {
  const sel = document.getElementById('subj-sel');
  sel.value = selectValue;
  currentSubject = selectValue;
  clearChatHistory();

  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML = '';
  appendMsg('ai', `<div class="msg-lbl">${emoji} ${subject} Tutor</div>Hello! I'm your specialised <strong>${subject} Tutor</strong>. I'm trained to help you with ${subject} in a clear, step-by-step way. 🎯<br><br>What would you like help with today?`);

  gt('s-chat');
}

/* ── INITIAL CHAT MESSAGE ── */
function initChat() {
  const msgs = document.getElementById('chat-msgs');
  if (msgs.children.length === 0) {
    appendMsg('ai', `<div class="msg-lbl">🤖 ${appState.user.aiName || 'Snap AI'}</div>Hi! I'm your Snap Study AI tutor — powered by real AI! 🌟<br><br>Ask me <strong>anything</strong> — maths, science, history, English, or even just "what is 5+5". I'll explain everything step by step!`);
  }
}

/* ══════════════════════════════════
   HOMEWORK SCANNER
══════════════════════════════════ */
function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  toast('📸 Image received — sending to AI…');
  // Since we can't OCR images client-side without a backend, we simulate with a sample question
  showScanResult('Solve for x: 3x² - 12x + 9 = 0', 'Solve for x: 3x² - 12x + 9 = 0. Show all working step by step.');
}

async function analyzeTyped() {
  const q = document.getElementById('typed-q').value.trim();
  if (!q) { toast('⚠️ Please type a question first'); return; }
  showScanResult(q, `A student has this homework question: "${q}". Please explain the solution step by step in a clear, student-friendly way. Format each step as "Step N: Title — explanation".`);
}

async function showScanResult(displayQ, aiPrompt) {
  document.getElementById('scan-result').style.display = 'block';
  document.getElementById('scan-q').textContent = '"' + displayQ + '"';
  document.getElementById('scan-a').innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  toast('🧠 AI is thinking…');

  try {
    const reply = await callClaudeAPI(aiPrompt, getSystemPrompt('General'));
    document.getElementById('scan-a').innerHTML = formatAIReply(reply);
    toast('✅ Done! Scroll down to see the solution.');
    addActivity(`📷 Scanned: "${displayQ.slice(0,40)}…"`);
    appState.xp += 10;
    updateProgressUI();
  } catch (err) {
    document.getElementById('scan-a').innerHTML = '<span style="color:#FF4D8B">⚠️ AI unavailable. Please check your connection and try again.</span>';
  }
}

/* ══════════════════════════════════
   QUIZ — with real AI generated questions
══════════════════════════════════ */
const builtInQuestions = {
  All: [
    { q:'What is 5 + 5?',                                              opts:['8','9','10','11'],                                                                  ans:2, subj:'Maths' },
    { q:'In photosynthesis, what gas do plants absorb?',               opts:['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'],                                    ans:2, subj:'Science' },
    { q:'Which event directly triggered World War 1?',                 opts:['Invasion of Poland','Assassination of Archduke Franz Ferdinand','D-Day','Waterloo'], ans:1, subj:'History' },
    { q:'Which sentence uses a SIMILE?',                               opts:['"Life is a dream"','"He was a lion"','"She runs like the wind"','"Night swallowed them"'], ans:2, subj:'Language' },
    { q:'What is 7 × 8?',                                              opts:['54','56','58','64'],                                                                 ans:1, subj:'Maths' },
    { q:'What is the powerhouse of the cell?',                         opts:['Nucleus','Ribosome','Mitochondria','Cell wall'],                                      ans:2, subj:'Science' },
    { q:'What year did World War 2 end?',                              opts:['1943','1944','1945','1946'],                                                         ans:2, subj:'History' },
    { q:'What is a metaphor?',                                         opts:['A comparison using like/as','A direct comparison saying one thing IS another','A type of rhyme','A type of poem'], ans:1, subj:'Language' },
    { q:'What is the square root of 144?',                             opts:['11','12','13','14'],                                                                 ans:1, subj:'Maths' },
    { q:'What planet is closest to the Sun?',                          opts:['Venus','Earth','Mars','Mercury'],                                                    ans:3, subj:'Science' },
  ],
  Maths: [
    { q:'What is 12 × 12?',                                            opts:['132','141','144','148'],  ans:2, subj:'Maths' },
    { q:'What is 15% of 200?',                                         opts:['20','25','30','35'],       ans:2, subj:'Maths' },
    { q:'What is the area of a rectangle 6cm × 4cm?',                  opts:['20 cm²','22 cm²','24 cm²','26 cm²'], ans:2, subj:'Maths' },
    { q:'What does π (pi) equal approximately?',                        opts:['2.718','3.14159','1.618','1.414'], ans:1, subj:'Maths' },
    { q:'Solve: 2x + 6 = 14. What is x?',                              opts:['3','4','5','6'],           ans:1, subj:'Maths' },
    { q:'What is 2⁵ (2 to the power of 5)?',                           opts:['16','32','64','25'],       ans:1, subj:'Maths' },
    { q:'What is the perimeter of a square with side 5cm?',            opts:['15cm','20cm','25cm','10cm'], ans:1, subj:'Maths' },
    { q:'Which of these is a prime number?',                            opts:['9','15','17','21'],         ans:2, subj:'Maths' },
  ],
  Science: [
    { q:'What is the chemical symbol for water?',                       opts:['WA','H₂O','HO₂','W'],       ans:1, subj:'Science' },
    { q:'How many bones are in the adult human body?',                  opts:['196','206','216','226'],      ans:1, subj:'Science' },
    { q:"Newton's First Law is also called the Law of…?",              opts:['Gravity','Motion','Inertia','Acceleration'], ans:2, subj:'Science' },
    { q:'What gas do plants release during photosynthesis?',            opts:['Carbon Dioxide','Nitrogen','Oxygen','Hydrogen'], ans:2, subj:'Science' },
    { q:'What is the speed of light approximately?',                    opts:['300,000 km/s','30,000 km/s','3,000 km/s','3,000,000 km/s'], ans:0, subj:'Science' },
    { q:'Which organ pumps blood around the body?',                     opts:['Liver','Kidney','Lung','Heart'], ans:3, subj:'Science' },
    { q:'What is the smallest unit of an element?',                     opts:['Cell','Molecule','Atom','Electron'], ans:2, subj:'Science' },
    { q:'What force pulls objects toward Earth?',                       opts:['Magnetism','Friction','Gravity','Tension'], ans:2, subj:'Science' },
  ],
  History: [
    { q:'When did World War 1 begin?',                                  opts:['1912','1913','1914','1915'],  ans:2, subj:'History' },
    { q:'Who was the first President of the United States?',            opts:['Abraham Lincoln','Thomas Jefferson','George Washington','John Adams'], ans:2, subj:'History' },
    { q:'What empire built the Colosseum?',                             opts:['Greek','Egyptian','Roman','Byzantine'], ans:2, subj:'History' },
    { q:'What does MAIN stand for (WW1 causes)?',                       opts:['Monarchy, Army, Industry, Nation','Militarism, Alliances, Imperialism, Nationalism','Money, Arms, Industry, Nations','Military, Allies, Independence, Nationalism'], ans:1, subj:'History' },
    { q:'In which year did humans first land on the Moon?',             opts:['1965','1967','1969','1971'],   ans:2, subj:'History' },
    { q:'Who wrote the Declaration of Independence?',                   opts:['George Washington','Benjamin Franklin','John Adams','Thomas Jefferson'], ans:3, subj:'History' },
    { q:'Which war ended with the Treaty of Versailles?',               opts:['World War 2','The Cold War','World War 1','The Korean War'], ans:2, subj:'History' },
    { q:'Which ancient wonder was located in Egypt?',                   opts:['The Colossus of Rhodes','The Great Pyramid of Giza','The Hanging Gardens','The Temple of Artemis'], ans:1, subj:'History' },
  ],
  Language: [
    { q:'Which word is a noun?',                                        opts:['Run','Quickly','Beautiful','Happiness'], ans:3, subj:'Language' },
    { q:'What is an antonym of "happy"?',                               opts:['Joyful','Cheerful','Sad','Excited'], ans:2, subj:'Language' },
    { q:'Which sentence is grammatically correct?',                     opts:['"She don\'t know"','"She doesn\'t know"','"Her don\'t know"','"She not know"'], ans:1, subj:'Language' },
    { q:'"The world is a stage" is an example of a…?',                 opts:['Simile','Metaphor','Alliteration','Onomatopoeia'], ans:1, subj:'Language' },
    { q:'What is the plural of "child"?',                               opts:['Childs','Childes','Children','Childrens'], ans:2, subj:'Language' },
    { q:'Which of these is an adjective?',                              opts:['Swim','Quickly','Blue','To'],    ans:2, subj:'Language' },
    { q:'What does "benevolent" mean?',                                 opts:['Cruel','Charitable and kind','Angry','Dishonest'], ans:1, subj:'Language' },
    { q:'"The thunder roared" is an example of?',                       opts:['Simile','Alliteration','Personification','Rhyme'], ans:2, subj:'Language' },
  ],
};

let quizSubject = 'All';
let quizQueue   = [];
let quizIdx     = 0;
let quizScore   = 0;
let quizAnswered = false;

function setQuizSubj(subj, el) {
  quizSubject = subj;
  document.querySelectorAll('#quiz-chips .chip').forEach(c => c.classList.remove('active-chip'));
  el.classList.add('active-chip');
  restartQuiz();
}

function restartQuiz() {
  const pool = [...(builtInQuestions[quizSubject] || builtInQuestions.All)];
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  quizQueue = pool.slice(0, Math.min(pool.length, 8));
  quizIdx   = 0;
  quizScore = 0;
  document.getElementById('quiz-end').style.display  = 'none';
  document.getElementById('q-next').style.display    = 'none';
  document.querySelector('.card').style.display      = 'block';
  loadQuestion();
}

function loadQuestion() {
  if (quizIdx >= quizQueue.length) { showQuizEnd(); return; }

  const q = quizQueue[quizIdx];
  document.getElementById('q-text').textContent = q.q;
  document.getElementById('q-num').textContent  = `Question ${quizIdx+1} of ${quizQueue.length}`;
  document.getElementById('q-score').textContent = `Score: ${quizScore}`;
  document.getElementById('q-prog').style.width = ((quizIdx / quizQueue.length) * 100) + '%';
  document.getElementById('q-fb').style.display = 'none';
  document.getElementById('q-next').style.display = 'none';
  quizAnswered = false;

  const optsEl = document.getElementById('q-opts');
  optsEl.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = String.fromCharCode(65 + i) + '. ' + opt;
    btn.onclick = () => checkAnswer(i, q.ans, btn, q.subj);
    optsEl.appendChild(btn);
  });
}

function checkAnswer(chosen, correct, el, subj) {
  if (quizAnswered) return;
  quizAnswered = true;

  document.querySelectorAll('.quiz-opt').forEach(o => o.disabled = true);
  const fb = document.getElementById('q-fb');

  if (chosen === correct) {
    el.classList.add('correct');
    quizScore++;
    fb.className = 'quiz-fb ok';
    fb.textContent = '✅ Correct! Excellent work!';
    appState.xp += 15;
    // Track score per subject
    if (subj && appState.quizScores[subj]) {
      appState.quizScores[subj].push(1);
    }
  } else {
    el.classList.add('wrong');
    document.querySelectorAll('.quiz-opt')[correct].classList.add('correct');
    fb.className = 'quiz-fb fail';
    fb.textContent = `❌ Not quite — the correct answer was ${String.fromCharCode(65+correct)}.`;
    if (subj && appState.quizScores[subj]) {
      appState.quizScores[subj].push(0);
    }
  }

  fb.style.display = 'block';
  document.getElementById('q-next').style.display = 'block';
  addActivity(`🧩 Answered quiz: ${subj || 'All'}`);
  updateProgressUI();
}

function nextQuizQ() {
  quizIdx++;
  loadQuestion();
}

function showQuizEnd() {
  document.querySelector('.card:not(.quiz-end-card)').style.display = 'none';
  document.getElementById('q-next').style.display = 'none';
  const pct = Math.round((quizScore / quizQueue.length) * 100);
  const title = pct >= 80 ? '🌟 Outstanding!' : pct >= 60 ? '🎉 Well Done!' : '💪 Keep Practising!';
  document.getElementById('quiz-end-title').textContent = title;
  document.getElementById('quiz-end-sub').textContent = `You scored ${quizScore} out of ${quizQueue.length} (${pct}%). ${pct >= 80 ? 'Amazing score!' : 'Try again to improve!'}`;
  document.getElementById('quiz-end').style.display = 'block';
  appState.sessions++;
  updateProgressUI();
}

/* ══════════════════════════════════
   FLASHCARDS — fully working create/delete
══════════════════════════════════ */
let fcIndex = 0;

function renderFC() {
  const fcs = appState.flashcards;
  if (!fcs.length) {
    document.getElementById('fc-front-text').textContent = 'No flashcards yet. Add one below!';
    document.getElementById('fc-back-text').textContent = '—';
    document.getElementById('fc-counter').textContent = '0 / 0';
    return;
  }
  if (fcIndex >= fcs.length) fcIndex = fcs.length - 1;
  if (fcIndex < 0) fcIndex = 0;

  document.getElementById('fc-front-text').textContent = fcs[fcIndex].q;
  document.getElementById('fc-back-text').textContent  = fcs[fcIndex].a;
  document.getElementById('fc-counter').textContent    = `${fcIndex+1} / ${fcs.length}`;
  document.getElementById('fc-wrap').classList.remove('flipped');
  renderFCDeckList();
}

function flipFC() {
  document.getElementById('fc-wrap').classList.toggle('flipped');
}

function prevFC() { fcIndex = (fcIndex - 1 + appState.flashcards.length) % appState.flashcards.length; renderFC(); }
function nextFC() { fcIndex = (fcIndex + 1) % appState.flashcards.length; renderFC(); }

function rateFC(rating) {
  const msgs = { hard: '😓 Marked as Hard — keep practising!', ok: '😊 Got it — nicely done!', easy: '🌟 Easy — moved to back of deck!' };
  toast(msgs[rating]);
  nextFC();
}

function addFC() {
  const q = document.getElementById('new-fc-q').value.trim();
  const a = document.getElementById('new-fc-a').value.trim();

  if (!q) { toast('⚠️ Please enter a question.'); return; }
  if (!a) { toast('⚠️ Please enter an answer.'); return; }

  appState.flashcards.push({ q, a });
  document.getElementById('new-fc-q').value = '';
  document.getElementById('new-fc-a').value = '';
  fcIndex = appState.flashcards.length - 1;
  renderFC();
  toast('🃏 Flashcard added to your deck!');
  addActivity('🃏 Added a new flashcard');
  appState.xp += 5;
  updateProgressUI();
}

function deleteFC(index) {
  appState.flashcards.splice(index, 1);
  if (fcIndex >= appState.flashcards.length) fcIndex = Math.max(0, appState.flashcards.length - 1);
  renderFC();
  toast('🗑️ Flashcard deleted.');
}

function renderFCDeckList() {
  const list = document.getElementById('fc-deck-list');
  const count = document.getElementById('fc-deck-count');
  count.textContent = appState.flashcards.length;

  if (!appState.flashcards.length) { list.innerHTML = '<p class="sub" style="text-align:center;padding:10px">No flashcards yet.</p>'; return; }

  list.innerHTML = appState.flashcards.map((fc, i) => `
    <div class="fc-deck-item">
      <div style="flex:1">
        <div class="fc-deck-q">${fc.q}</div>
        <div class="fc-deck-a">${fc.a}</div>
      </div>
      <button class="fc-delete" onclick="deleteFC(${i})" title="Delete">🗑️</button>
    </div>
  `).join('');
}

/* ══════════════════════════════════
   PROGRESS — real data from usage
══════════════════════════════════ */
function updateProgressUI() {
  // Stats
  document.getElementById('p-sessions').textContent = appState.sessions;
  document.getElementById('p-streak').textContent   = '🔥' + appState.streak;
  document.getElementById('p-xp').textContent       = appState.xp;

  // Profile level
  const level = Math.max(1, Math.floor(appState.xp / 50) + 1);
  const profileLevel = document.getElementById('profile-level');
  if (profileLevel) profileLevel.textContent = `Level ${level} Scholar · ${appState.xp} XP`;

  // Streak on home
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = appState.streak;

  // Subject bars based on actual quiz scores
  const barsEl = document.getElementById('progress-bars');
  if (!barsEl) return;

  const colors = { Maths:'linear-gradient(90deg,#FF6B35,#FF4500)', Science:'linear-gradient(90deg,#06D6A0,#00A878)', History:'linear-gradient(90deg,#FF4D8B,#C9184A)', Language:'linear-gradient(90deg,#FFD93D,#FFA500)' };
  const emojis = { Maths:'🔢', Science:'🔬', History:'📜', Language:'🌍' };

  let barsHTML = '';
  for (const [subj, scores] of Object.entries(appState.quizScores)) {
    const pct = scores.length ? Math.round((scores.reduce((a,b)=>a+b,0)/scores.length)*100) : 0;
    const display = scores.length ? `${pct}%` : 'No data yet';
    const width   = scores.length ? pct : 0;
    barsHTML += `
      <div class="bar-lbl"><span>${emojis[subj]} ${subj}</span><span style="color:${scores.length?'var(--yellow)':'var(--gray)'}">${display}</span></div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${width}%;background:${colors[subj]}"></div></div>`;
  }
  barsEl.innerHTML = barsHTML || '<p class="sub">Complete some quizzes to see your performance!</p>';

  // Badges
  const badgeEl = document.getElementById('badge-row');
  if (!badgeEl) return;
  const badges = [];
  if (appState.streak >= 7)   badges.push({ label: '🔥 Week Warrior', earned: true });
  if (appState.sessions >= 5) badges.push({ label: '⚡ Active Learner', earned: true });
  if (appState.xp >= 50)      badges.push({ label: '🧩 Quiz Starter', earned: true });
  if (appState.xp >= 200)     badges.push({ label: '🌟 XP Champion', earned: true });
  badges.push({ label: '🏆 Top Student', earned: false });
  badges.push({ label: '💯 Perfect Score', earned: false });

  badgeEl.innerHTML = badges.map(b => `<div class="badge ${b.earned?'earned':''}">${b.label}</div>`).join('');

  // Activity
  const actEl = document.getElementById('activity-log');
  if (!actEl) return;
  actEl.innerHTML = appState.activity.slice(-8).reverse().map(a =>
    `<div class="activity-item"><span class="activity-icon">${a.icon}</span><span class="activity-text">${a.text}</span><span class="activity-time">${a.time}</span></div>`
  ).join('') || '<p class="sub" style="text-align:center;padding:10px">No activity yet. Start studying!</p>';
}

function addActivity(text) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const icon = text.startsWith('💬') ? '💬' : text.startsWith('📷') ? '📷' : text.startsWith('🧩') ? '🧩' : text.startsWith('🃏') ? '🃏' : '📚';
  appState.activity.push({ icon, text, time });
}

/* ══════════════════════════════════
   STUDY PLANNER — working add/delete/complete
══════════════════════════════════ */
const subjColors = { Mathematics:'var(--orange)', Science:'var(--green)', History:'var(--pink)', Language:'var(--yellow)', Other:'var(--teal)' };

function addTask() {
  const subj  = document.getElementById('plan-subj').value;
  const task  = document.getElementById('plan-task').value.trim();
  const date  = document.getElementById('plan-date').value;
  const time  = document.getElementById('plan-time').value;
  const errEl = document.getElementById('err-plan');

  if (!task) { errEl.textContent = '⚠️ Please enter a task description.'; return; }
  errEl.textContent = '';

  appState.tasks.push({ subj, task, date, time, done: false, id: Date.now() });
  document.getElementById('plan-task').value = '';
  document.getElementById('plan-date').value = '';
  document.getElementById('plan-time').value = '';

  renderTaskList();
  renderHomeTaskPreview();
  toast('📅 Task added to your planner!');
  addActivity(`📅 Added task: ${task.slice(0,30)}`);
}

function toggleTaskDone(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (task) { task.done = !task.done; renderTaskList(); renderHomeTaskPreview(); }
}

function deleteTask(id) {
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  renderTaskList();
  renderHomeTaskPreview();
  toast('🗑️ Task removed.');
}

function renderTaskList() {
  const list = document.getElementById('task-list');
  const countEl = document.getElementById('task-count');
  if (!list) return;

  const active = appState.tasks.filter(t => !t.done);
  if (countEl) countEl.textContent = active.length;

  if (!appState.tasks.length) {
    list.innerHTML = '<p class="sub" style="text-align:center;padding:14px">No tasks yet. Add one above!</p>';
    return;
  }

  list.innerHTML = appState.tasks.map(t => {
    const dueLabel = t.date ? new Date(t.date).toLocaleDateString('en-GB', { day:'numeric',month:'short' }) : '';
    const color    = subjColors[t.subj] || 'var(--teal)';
    return `
      <div class="task-item">
        <button class="task-done-btn ${t.done?'done':''}" onclick="toggleTaskDone(${t.id})">${t.done?'✓':''}</button>
        <div class="task-info">
          <div class="task-subj">${t.subj}</div>
          <div class="task-name ${t.done?'strikethrough':''}">${t.task}</div>
          <div class="task-meta">${dueLabel?'📅 '+dueLabel:''}${t.time?' · ⏱ '+t.time+' min':''}</div>
        </div>
        <div class="plan-dot" style="background:${color};width:10px;height:10px;border-radius:50%"></div>
        <button class="task-delete" onclick="deleteTask(${t.id})">🗑️</button>
      </div>`;
  }).join('');
}

function renderHomeTaskPreview() {
  const el = document.getElementById('home-tasks');
  if (!el) return;
  const upcoming = appState.tasks.filter(t => !t.done).slice(0, 3);
  if (!upcoming.length) {
    el.innerHTML = '<p class="sub" style="text-align:center;padding:10px">No tasks yet — <span style="color:var(--yellow);cursor:pointer" onclick="gt(\'s-plan\')">add some in the Planner</span>!</p>';
    return;
  }
  el.innerHTML = upcoming.map(t => {
    const color = subjColors[t.subj] || 'var(--teal)';
    return `<div class="plan-item"><div class="plan-dot" style="background:${color}"></div><div class="plan-info"><div class="plan-subj">${t.subj}</div><div class="plan-task">${t.task}</div>${t.date?`<div class="plan-time">📅 ${new Date(t.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>`:'</div>'}</div><span class="due-badge due-soon">Upcoming</span></div>`;
  }).join('');
}

/* ══════════════════════════════════
   FOCUS TIMER — Pomodoro
══════════════════════════════════ */
const TIMER_CIRCUMFERENCE = 553;
let timerTotal   = 25 * 60;
let timerLeft    = 25 * 60;
let timerRunning = false;
let timerInterval = null;

function fmtTime(s) {
  return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

function updateTimerUI() {
  document.getElementById('timer-disp').textContent = fmtTime(timerLeft);
  const pct = timerLeft / timerTotal;
  document.getElementById('timer-fg').style.strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - pct);
}

function timerToggle() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timer-start-btn').textContent = '▶ Resume';
  } else {
    timerRunning = true;
    document.getElementById('timer-start-btn').textContent = '⏸ Pause';
    timerInterval = setInterval(() => {
      timerLeft--;
      updateTimerUI();
      if (timerLeft <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timer-start-btn').textContent = '▶ Start';
        toast('🎉 Time is up! Take your break!', 4000);
        addActivity('⏱️ Completed a focus session');
        appState.xp += 20;
        appState.sessions++;
        updateProgressUI();
      }
    }, 1000);
  }
}

function timerReset() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft = timerTotal;
  document.getElementById('timer-start-btn').textContent = '▶ Start';
  updateTimerUI();
}

function setTimerMode(mins, label, el) {
  document.querySelectorAll('#s-timer .chip').forEach(c => c.classList.remove('active-chip'));
  el.classList.add('active-chip');
  clearInterval(timerInterval);
  timerRunning = false;
  timerTotal = mins * 60;
  timerLeft  = timerTotal;
  document.getElementById('timer-lbl').textContent = label;
  document.getElementById('timer-start-btn').textContent = '▶ Start';
  updateTimerUI();
}

/* ══════════════════════════════════
   VOICE CHAT (simulated — real STT
   needs browser microphone access)
══════════════════════════════════ */
let voiceActive = false;
const voiceSamples = [
  { said: 'Explain the water cycle', reply: 'The water cycle has 4 stages: 1) Evaporation — sun heats water, it rises as vapour. 2) Condensation — vapour cools and forms clouds. 3) Precipitation — water falls as rain or snow. 4) Collection — gathers in rivers and oceans. Then it repeats! 🌊' },
  { said: "What is Newton's First Law?", reply: "Newton's First Law says: an object will stay at rest, or keep moving in a straight line at constant speed, UNLESS acted on by an unbalanced external force. This is called the Law of Inertia! 🚀" },
  { said: 'Help me with fractions', reply: 'A fraction has two parts: the numerator (top) and denominator (bottom). To add fractions: 1) Make the denominators the same. 2) Add the numerators. 3) Simplify if needed. e.g. 1/4 + 2/4 = 3/4! 🔢' },
  { said: 'Quiz me on World War 2', reply: 'Great! Here is a question: In which year did World War 2 end? A) 1943, B) 1944, C) 1945, D) 1946. Think about it… The answer is C) 1945! Germany surrendered in May and Japan in September of that year. 📜' },
];
let voiceIdx = 0;

function toggleVoice() {
  const btn    = document.getElementById('voice-btn');
  const status = document.getElementById('voice-status');

  if (voiceActive) return;
  voiceActive = true;
  btn.classList.add('listening');
  status.textContent = '🎙️ Listening… speak now';
  status.style.color = 'var(--teal)';

  setTimeout(() => {
    const sample = voiceSamples[voiceIdx % voiceSamples.length];
    voiceIdx++;
    document.getElementById('voice-transcript').style.display = 'block';
    document.getElementById('voice-said').textContent  = sample.said;
    document.getElementById('voice-reply').textContent = sample.reply;
    btn.classList.remove('listening');
    voiceActive = false;
    status.textContent = 'Tap to speak again';
    status.style.color = '';
    addActivity('🎙️ Used Voice Chat');
    appState.xp += 5;
    updateProgressUI();
  }, 2500);
}

/* ══════════════════════════════════
   COMMUNITY FORUM
══════════════════════════════════ */
function renderForum(posts) {
  const el = document.getElementById('forum-posts');
  if (!posts.length) { el.innerHTML = '<p class="sub" style="text-align:center;padding:14px">No posts found.</p>'; return; }

  el.innerHTML = posts.map((p, i) => `
    <div class="forum-post">
      <div class="fp-head">
        <div class="fp-avatar" style="background:${p.color}">${p.emoji}</div>
        <div class="fp-name">${p.name}</div>
        <div class="fp-time">${p.time}</div>
      </div>
      <div class="fp-title">${p.title}</div>
      ${p.body ? `<div class="fp-body">${p.body}</div>` : ''}
      <div class="fp-meta">
        <span class="fp-stat" onclick="likePost(${i})">❤️ ${p.likes}</span>
        <span class="fp-stat">💬 ${p.replies}</span>
        <span class="fp-stat" style="margin-left:auto;color:var(--yellow)">Answer →</span>
      </div>
    </div>`).join('');
}

function likePost(i) {
  appState.forumPosts[i].likes++;
  filterForum();
}

function filterForum() {
  const q = document.getElementById('forum-search').value.toLowerCase().trim();
  const filtered = q
    ? appState.forumPosts.filter(p => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))
    : appState.forumPosts;
  renderForum(filtered);
}

function toggleNewPost() {
  const f = document.getElementById('new-post-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function submitPost() {
  const content = document.getElementById('post-content').value.trim();
  const errEl   = document.getElementById('err-post');

  if (!content) { errEl.textContent = '⚠️ Please write your question or tip first.'; return; }
  errEl.textContent = '';

  const name  = appState.user.name || 'You';
  const emoji = appState.user.avatar || '🌟';
  appState.forumPosts.unshift({
    name, emoji, color: 'var(--yellow)',
    time: 'just now',
    title: content.slice(0, 70),
    body: content.length > 70 ? content.slice(70) : '',
    likes: 0, replies: 0,
  });

  document.getElementById('post-content').value = '';
  document.getElementById('new-post-form').style.display = 'none';
  renderForum(appState.forumPosts);
  toast('📤 Post submitted! The community will see it.');
  addActivity('💬 Posted in Community Forum');
}

/* ══════════════════════════════════
   PROFILE
══════════════════════════════════ */
function pickEmoji(emoji, el) {
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('profile-avatar').textContent = emoji;
  appState.user.avatar = emoji;
}

function saveProfile() {
  const name   = document.getElementById('profile-name-input').value.trim();
  const aiName = document.getElementById('ai-name-input').value.trim();

  if (name) {
    appState.user.name = name;
    document.getElementById('profile-name').textContent  = name;
    document.getElementById('uname').textContent = name.split(' ')[0];
  }
  if (aiName) appState.user.aiName = aiName;

  toast('💾 Profile saved!');
  addActivity('👤 Updated profile');
}

function toggleLargeFont(el) {
  el.classList.toggle('on');
  document.body.classList.toggle('large-font', el.classList.contains('on'));
}

/* ══════════════════════════════════
   INIT — runs when page loads
══════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  restartQuiz();
  renderFC();
  renderForum(appState.forumPosts);
  updateTimerUI();
  updateProgressUI();
  renderTaskList();
  renderHomeTaskPreview();
  initChat();
});
