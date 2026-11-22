(() => {
'use strict';
const main = document.getElementById('app');
if (!main) return;
const words = [
  ['پنجره','window','پنجره را باز کردم.'], ['باران','rain','صدای باران را شنیدم.'],
  ['ایستگاه','station','از ایستگاه تا خانه پیاده رفتم.'], ['کلید','key','کلید کنار در بود.'],
  ['همسایه','neighbor','همسایه برای ما نان آورد.'], ['کتابخانه','library','روز جمعه به کتابخانه رفتم.'],
  ['برنامه','plan','برای فردا برنامه داریم.'], ['فرصت','opportunity','فرصت تازه‌ای برای تمرین پیدا کردیم.']
];
const entries = [
  {id:'bus', level:'Beginner', label:'A rainy morning', seconds:45,
   fa:'صبح باران می‌بارید. لیلا چترش را برداشت و از خانه بیرون رفت. ایستگاه اتوبوس نزدیک بود، اما او آهسته راه رفت. کنار ایستگاه، یک نانوایی باز بود. لیلا نان تازه خرید و وقتی برگشت، اتوبوس هنوز نرسیده بود.',
   en:'It was raining in the morning. Leila picked up her umbrella and left home. The bus stop was nearby, but she walked slowly. A bakery next to the stop was open. Leila bought fresh bread, and when she returned, the bus had not arrived yet.',
   q:'What did Leila buy while waiting for the bus?', opts:['Fresh bread','A new umbrella','A bus ticket'], correct:0,
   why:'The last sentence says لیلا نان تازه خرید, meaning “Leila bought fresh bread.”'},
  {id:'garden', level:'Intermediate',label:'A courtyard garden',seconds:60,
   fa:'ساکنان ساختمان می‌خواستند در حیاط سبزی بکارند، اما دربارهٔ جای گلدان‌ها اختلاف داشتند. یک طرف حیاط آفتاب بیشتری داشت، ولی راه عبور را تنگ می‌کرد. سرانجام قرار شد گلدان‌ها روی قفسه‌ای کنار دیوار گذاشته شوند. خانواده‌ها نوبتی به گیاهان آب می‌دادند. بعد از چند هفته، حتی کسانی که در جلسهٔ اول سکوت کرده بودند، برای چیدن سبزی به حیاط می‌آمدند.',
   en:'The building residents wanted to grow herbs in the courtyard, but disagreed about where to put the pots. One side got more sun, but the pots there would narrow the passage. They finally decided to place the pots on a shelf by the wall. Families took turns watering the plants. A few weeks later, even those who had stayed quiet at the first meeting came to the courtyard to pick herbs.',
   q:'Why did the residents choose a shelf by the wall?',opts:['To keep the plants out of the sun','To leave room for people to pass','To stop families from picking herbs'],correct:1,
   why:'راه عبور را تنگ می‌کرد describes narrowing the passage. The shelf solved that problem.'},
  {id:'library',level:'Advanced',label:'Measuring what matters',seconds:90,
   fa:'در نخستین ماه اجرای طرح امانت کتاب در محله، تعداد کتاب‌های امانت‌گرفته‌شده کمتر از انتظار بود. گروهی این رقم را نشانهٔ بی‌علاقگی مردم دانستند. اما مسئول طرح از داوطلبان خواست به جای شمارش دوبارهٔ کتاب‌ها، با کسانی حرف بزنند که هنوز مراجعه نکرده بودند. گفت‌وگوها نشان داد که بسیاری از ساکنان علاقه داشتند، ولی ساعت کارشان با زمان باز بودن کتابخانه هم‌خوانی نداشت. پس از افزودن یک نوبت عصرانه، مراجعه‌ها بیشتر شد. این تغییر ثابت نمی‌کرد که همهٔ مشکلات برطرف شده‌اند؛ فقط نشان می‌داد که آمار نخست، بیش از آنکه دربارهٔ علاقهٔ مردم چیزی بگوید، محدودیت دسترسی آنان را منعکس می‌کرد.',
   en:'In the first month of the neighborhood book-lending program, fewer books were borrowed than expected. Some took that figure as a sign of indifference. But the program lead asked volunteers to talk to people who had not yet visited rather than count the books again. The conversations showed that many residents were interested, but their working hours did not line up with library hours. After an evening session was added, visits increased. That change did not prove that every problem was solved. It only showed that the initial figure reflected barriers to access more than it revealed what people were interested in.',
   q:'What is the author’s main point about the initial statistic?',opts:['It proved that the library had enough books','It showed that all obstacles vanished after a schedule change','It reflected limited access more than lack of interest'],correct:2,
   why:'The final sentence contrasts علاقه (interest) with محدودیت دسترسی (limited access), and cautions against overinterpreting the numbers.'}
];
const key = 'roshan-public-demo-v1';
let progress = {reviewed:[], quiz:0, reading:[], speech:false};
try {
 const s=JSON.parse(localStorage.getItem(key) || '{}');
 if (s && typeof s === 'object') {
  if (Array.isArray(s.reviewed)) progress.reviewed=[...new Set(s.reviewed.filter(i=>Number.isInteger(i)&&i>=0&&i<words.length))];
  if (Array.isArray(s.reading)) progress.reading=[...new Set(s.reading.filter(i=>entries.some(p=>p.id===i)))];
  if (Number.isInteger(s.quiz)&&s.quiz>=0&&s.quiz<=words.length) progress.quiz=s.quiz;
  progress.speech=s.speech===true;
 }
} catch (_) {}
const save=()=>{try {localStorage.setItem(key,JSON.stringify(progress));} catch (_) {}};
const labels={home:'Home',study:'Study',quiz:'Quiz',reading:'Reading'};
let view='home', word=0, revealed=false;
let qi=0, score=0, answer=null;
let reading=null, timer=null;
const fa=s=>'<span class="fa" lang="fa" dir="rtl">'+s+'</span>';
const button=(a,t)=>'<button type="button" class="button" data-action="'+a+'">'+t+'</button>';
const nav=(a,t)=>'<button type="button" class="button" data-view="'+a+'">'+t+'</button>';
const heading=(tag,title,desc)=>'<p class="eyebrow">'+tag+'</p><h1 tabindex="-1">'+title+'</h1><p class="muted">'+desc+'</p>';
const announce=(s)=>{const node=document.getElementById('speech-status');if(node)node.textContent=s;};
const speechOptions=()=>'<p><label><input id="speech-setting" type="checkbox" '+(progress.speech?'checked':'')+'> Enable optional device pronunciation</label></p><p class="muted">Plays only with a locally installed Persian voice. The demo does not send text to a speech service.</p><p role="status" id="speech-status" class="muted"></p>';
function speak(text){
 if(!progress.speech)return;
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){announce('Speech is not available in this browser.');return;}
 const voice=window.speechSynthesis.getVoices().find(v=>v.localService===true&&/^fa(?:[-_]|$)/i.test(v.lang));
 if(!voice){announce('No local Persian voice is available on this device.');return;}
 const u=new SpeechSynthesisUtterance(text);
 u.voice=voice;u.lang=voice.lang;u.rate=.87;
 u.onerror=()=>announce('Device pronunciation was unavailable.');
 window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
}
function home(){
 return '<section class="hero"><div class="hero-copy">'+heading('Persian learning demo','Practice Persian at your pace','A small collection of original examples for learning Persian vocabulary and reading.')+
 '<div class="actions">'+nav('study','Start studying')+nav('reading','Try timed reading')+'</div></div><div class="hero-art" aria-hidden="true"><span class="fa" lang="fa" dir="rtl">روشن</span></div></section>'+
 '<div class="grid"><section class="card"><p class="eyebrow">Vocabulary</p><h2>Study cards</h2><p>Reveal meanings and read a short example for each word.</p><p class="pill">'+progress.reviewed.length+' of '+words.length+' reviewed</p></section>'+
 '<section class="card"><p class="eyebrow">Recall</p><h2>Quiz</h2><p>Check your recall and get immediate feedback.</p><p class="pill">Best: '+progress.quiz+' of '+words.length+'</p></section>'+
 '<section class="card"><p class="eyebrow">Comprehension</p><h2>Timed reading</h2><p>Read across three levels, answer a question, then review the English translation.</p><p class="pill">'+progress.reading.length+' of '+entries.length+' completed</p></section></div>';
}
function study(){
 const w=words[word];
 return heading('Study','Vocabulary cards','Read the Persian word, then reveal its meaning and an example.')+
 '<section class="card"><p class="pill">Card '+(word+1)+' of '+words.length+'</p><h2>'+fa(w[0])+'</h2>'+
 '<div aria-live="polite">'+(revealed?'<p><strong>'+w[1]+'</strong></p><p>'+fa(w[2])+'</p>':'<p class="muted">Meaning hidden</p>')+'</div>'+
 '<div class="actions">'+button('prev-word','Previous')+button('reveal',revealed?'Hide meaning':'Reveal meaning')+
 (progress.speech?button('speak','Play pronunciation'):'')+button('next-word','Next')+'</div>'+speechOptions()+'</section>';
}
function quiz(){
 const title=heading('Quiz','Check your recall','Choose the English meaning for each Persian word.');
 if(qi>=words.length)return title+'<section class="card"><h2>Quiz complete</h2><p>You answered '+score+' of '+words.length+' correctly.</p>'+button('restart-quiz','Try again')+'</section>';
 const index=(qi*3)%words.length;
 const wrong=[(index+1)%words.length,(index+4)%words.length];
 const options=wrong.slice();options.splice(qi%3,0,index);
 return title+'<section class="card"><p class="pill">Question '+(qi+1)+' of '+words.length+'</p><h2>'+fa(words[index][0])+'</h2><div class="actions">'+
 options.map(i=>'<button type="button" class="button" data-action="quiz-choice" data-id="'+i+'" '+(answer!==null?'disabled':'')+'>'+words[i][1]+'</button>').join('')+
 '</div><div role="status" class="feedback">'+(answer===null?'':(answer===index?'Correct.':'Not quite. The answer is “'+words[index][1]+'.”'))+'</div>'+
 (answer===null?'':button('quiz-next',qi===words.length-1?'See results':'Next question'))+'</section>';
}
function readingView(){
 const title=heading('Reading','Timed reading','Choose a level, read the passage, then answer one untimed question.');
 if(!reading)return title+'<div class="grid">'+entries.map(p=>'<section class="card"><p class="pill">'+p.level+'</p><h2>'+p.label+'</h2><p>'+p.seconds+' seconds'+(progress.reading.includes(p.id)?' · Completed':'')+'</p><button type="button" class="button" data-action="start-reading" data-id="'+p.id+'">Start '+p.level.toLowerCase()+'</button></section>').join('')+'</div>';
 const {p,stage}=reading;
 const stop=button('end-reading','Choose another passage');
 if(stage==='text')return title+'<section class="card"><p class="eyebrow">'+p.level+'</p><h2>'+p.label+'</h2><p class="pill" id="time-left" aria-label="Time remaining"></p><p class="fa" lang="fa" dir="rtl">'+p.fa+'</p><div class="actions">'+button('reading-question','Go to question')+stop+'</div></section>';
 if(stage==='question')return title+'<section class="card"><p class="eyebrow">Untimed question</p><h2>'+p.q+'</h2><div class="actions">'+p.opts.map((opt,i)=>'<button class="button" type="button" data-action="reading-answer" data-id="'+i+'">'+opt+'</button>').join('')+'</div>'+stop+'</section>';
 return title+'<section class="card"><p class="feedback">'+(reading.choice===p.correct?'Correct.':'Not quite.')+' '+p.why+'</p><h2>Review the passage</h2><p class="fa" lang="fa" dir="rtl">'+p.fa+'</p><h3>English translation</h3><p>'+p.en+'</p>'+stop+'</section>';
}
function tick(){
 if(!reading||reading.stage!=='text')return;
 const sec=Math.max(0,Math.ceil((reading.deadline-Date.now())/1000));
 if(sec===0){reading.stage='question';render(true);return;}
 const el=document.getElementById('time-left');
 if(el)el.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')+' remaining';
}
function render(focus=false){
 clearInterval(timer);timer=null;
 main.innerHTML=({home,study,quiz,reading:readingView})[view]();
 document.querySelectorAll('header [data-view]').forEach(e=>{
  if(e.dataset.view===view)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');
 });
 if(focus)main.querySelector('h1')?.focus();
 if(view==='reading'&&reading?.stage==='text'){
  tick();if(reading?.stage==='text')timer=setInterval(tick,250);
 }
}
document.addEventListener('click', e=>{
 const el=e.target.closest('button[data-view], button[data-action]');
 if(!el)return;
 const navTo=el.dataset.view;
 if(navTo && Object.hasOwn(labels,navTo)){view=navTo;render(true);return;}
 switch(el.dataset.action){
  case 'prev-word':case 'next-word':word=(word+(el.dataset.action==='prev-word'?-1:1)+words.length)%words.length;revealed=false;break;
  case 'reveal':revealed=!revealed;if(revealed&&!progress.reviewed.includes(word)){progress.reviewed.push(word);save();}break;
  case 'speak':speak(words[word][0]);return;
  case 'quiz-choice':if(answer!==null)return;answer=Number(el.dataset.id);if(answer===(qi*3)%words.length)score++;break;
  case 'quiz-next':if(answer===null)return;qi++;answer=null;if(qi===words.length){progress.quiz=Math.max(progress.quiz,score);save();}break;
  case 'restart-quiz':qi=0;score=0;answer=null;break;
  case 'start-reading':{const p=entries.find(x=>x.id===el.dataset.id);if(!p)return;reading={p,stage:'text',deadline:Date.now()+p.seconds*1000};break;}
  case 'reading-question':if(!reading||reading.stage!=='text')return;reading.stage='question';break;
  case 'reading-answer':if(!reading||reading.stage!=='question')return;reading.choice=Number(el.dataset.id);reading.stage='review';if(!progress.reading.includes(reading.p.id)){progress.reading.push(reading.p.id);save();}break;
  case 'end-reading':reading=null;break;
  default:return;
 }
 render(true);
});
document.addEventListener('change',e=>{
 if(e.target.id!=='speech-setting')return;
 progress.speech=e.target.checked;
 if(!progress.speech&&'speechSynthesis' in window)window.speechSynthesis.cancel();
 save();render();
 document.getElementById('speech-setting')?.focus();
});
document.addEventListener('visibilitychange',()=>{if(view==='reading')tick();});
render();
})();
