/* Preview appearance preferences stay outside progress, import and Undo state. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./custom-palette.js'));
  else {root.RoshanCustomTheme=factory(root.RoshanCustomPalette);if(root.document&&root.App)root.RoshanCustomTheme.install(root.document,root.App,{getItem:key=>root.localStorage.getItem(key),setItem:(key,value)=>root.localStorage.setItem(key,value)});}
})(typeof globalThis!=='undefined'?globalThis:this,function(Palette){
  'use strict';
  const PREFS_KEY='roshan-preview-20261028:appearance:styleColors:v1';
  const LEGACY_KEY='roshan-preview-20261028:appearance:customThemeColor';
  const THEMES=['light','dark','roshan'];
  const validTheme=value=>THEMES.includes(value)?value:'roshan';
  const isColor=value=>typeof value==='string'&&/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
  const ART_MAIN=['wall-glow','wall-mid','wall-end','wall-overlay','header-bg','mark-bg','welcome-start','welcome-end','hero-start','hero-end','sky-top','sky-mid','frame','hill-back','hill-front'];
  const ART_ACCENT={gold1:-.25,gold2:.2,gold3:0,gold4:-.2,glow1:.25,glow2:-.1,outline:-.15,marks:.15,sun:.1,glint:.25,stars:.1,edge:0,finial:.15,wallglow1:.25,wallglow2:0,wallglow3:-.1,rays:0,wallsun:0,skywarm:-.2,base:0,border:0,focus:.2,welcomeGlow:0,tagBorder:0};
  const managed=[...Object.keys(Palette.derive('roshan').variables),...ART_MAIN.map(k=>'--rs-'+k),...Object.keys(ART_ACCENT).map(k=>'--rs-'+k)];
  function stylePlan(state){
    if(!state.customized)return managed.map(name=>[name,null]);
    const v=Palette.derive(state.theme,state.main,state.accent).variables,out=Object.assign({},v),defaults=Palette.DEFAULTS[state.theme];
    if(state.main!==defaults.main){
      const bg=v['--bg'],surface=v['--surface'],surface2=v['--surface-2'];
      Object.assign(out,{'--rs-wall-glow':Palette.mix(bg,state.main,.22),'--rs-wall-mid':Palette.mix(bg,state.main,.08),'--rs-wall-end':bg,'--rs-wall-overlay':bg+'35','--rs-header-bg':bg+'f5','--rs-mark-bg':surface2,'--rs-welcome-start':surface2,'--rs-welcome-end':bg,'--rs-hero-start':surface2,'--rs-hero-end':surface,'--rs-sky-top':bg,'--rs-sky-mid':surface2,'--rs-frame':bg,'--rs-hill-back':surface2,'--rs-hill-front':surface});
    }
    if(state.accent!==defaults.accent){for(const [name,amount] of Object.entries(ART_ACCENT)){let color=Palette.mix(state.accent,amount<0?'#000000':'#ffffff',Math.abs(amount));if(name==='border')color+='80';if(name==='welcomeGlow')color+='33';if(name==='tagBorder')color+='65';out['--rs-'+name]=color;}}
    return managed.map(name=>[name,out[name]||null]);
  }
  function createController(modeStore,storage,onChange){
    const savedMode=modeStore.get('theme','roshan');let theme=validTheme(savedMode),profiles={},panelOpen=false,colorSaved=true,message='',migrated=false,raw;
    try{
      raw=storage.getItem(PREFS_KEY);
      if(raw!==null){const value=JSON.parse(raw);if(!value||value.version!==1||!value.themes||typeof value.themes!=='object'||Array.isArray(value.themes))throw new Error('Invalid appearance data');for(const name of THEMES){const p=value.themes[name];if(p&&isColor(p.main)&&isColor(p.accent))profiles[name]={main:Palette.normalizeColor(p.main),accent:Palette.normalizeColor(p.accent)};}}
    }catch(_){colorSaved=false;}
    function save(){try{storage.setItem(PREFS_KEY,JSON.stringify({version:1,themes:profiles}));colorSaved=true;}catch(_){colorSaved=false;}}
    if(savedMode==='custom'){
      if(raw===null){try{const legacy=storage.getItem(LEGACY_KEY);if(isColor(legacy)){profiles.roshan={main:Palette.normalizeColor(legacy),accent:Palette.DEFAULTS.roshan.accent};save();migrated=true;}}catch(_){colorSaved=false;}}
      modeStore.set('theme','roshan');
    }
    function snapshot(){const p=profiles[theme]||Palette.DEFAULTS[theme];return {theme,main:p.main,accent:p.accent,customized:Object.prototype.hasOwnProperty.call(profiles,theme),panelOpen,colorSaved,message,migrated};}
    function refresh(){const state=snapshot();if(onChange)onChange(state);return state;}
    function selectTheme(value,persist=true){theme=validTheme(value);panelOpen=false;message='';if(persist)modeStore.set('theme',theme);return refresh();}
    function setColor(part,value){if(!['main','accent'].includes(part))throw new TypeError('Unknown color control');const next=Object.assign({},profiles[theme]||Palette.DEFAULTS[theme]);next[part]=Palette.normalizeColor(value,Palette.DEFAULTS[theme][part]);if(next.main===Palette.DEFAULTS[theme].main&&next.accent===Palette.DEFAULTS[theme].accent)delete profiles[theme];else profiles[theme]=next;save();message='Colors saved in this browser.';return refresh();}
    function resetColors(){delete profiles[theme];save();message='Default colors restored.';return refresh();}
    function open(){panelOpen=true;return refresh();}
    function close(){panelOpen=false;return refresh();}
    return Object.freeze({snapshot,refresh,selectTheme,setColor,resetColors,open,close});
  }
  function install(document,App,storage){
    const select=document.getElementById('theme');if(!select||document.getElementById('appearance-dialog'))return;
    const dialog=document.createElement('dialog');dialog.id='appearance-dialog';dialog.className='appearance-dialog';dialog.setAttribute('aria-labelledby','appearance-title');
    dialog.innerHTML='<div class="appearance-heading"><h2 id="appearance-title">Customize colors</h2><button type="button" class="sm" id="appearance-close">Close</button></div><p class="appearance-note">Choose your main and accent colors. Text stays readable.</p><div class="appearance-fields"></div><div class="appearance-footer"><button type="button" id="appearance-reset">Reset colors</button><span class="appearance-status" role="status"></span></div>';
    const fields=dialog.querySelector('.appearance-fields'),controls={},allButtons=[];
    const choices=[['Blue','#3978c6'],['Teal','#168b8b'],['Green','#39945c'],['Gold','#ffd153'],['Orange','#de7737'],['Rose','#bf537f'],['Purple','#8159b6'],['Slate','#66778b']];
    for(const part of ['main','accent']){
      const field=document.createElement('fieldset');field.innerHTML='<legend>'+ (part==='main'?'Main color':'Accent color')+'</legend><div class="appearance-swatches" role="group" aria-label="'+part+' color palette"></div><label class="appearance-color-label" for="appearance-'+part+'">Choose any color <input id="appearance-'+part+'" type="color"></label><output for="appearance-'+part+'"></output>';
      const group=field.querySelector('.appearance-swatches'),input=field.querySelector('input'),output=field.querySelector('output');controls[part]={input,output};
      for(const [name,color] of choices){const button=document.createElement('button');button.type='button';button.style.setProperty('--swatch',color);button.setAttribute('aria-label',name+' '+part+' color');button.setAttribute('title',name);button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>controller.setColor(part,color));group.append(button);allButtons.push([button,part,color]);}
      input.addEventListener('change',()=>controller.setColor(part,input.value));fields.append(field);
    }
    document.body.append(dialog);const status=dialog.querySelector('[role="status"]'),title=dialog.querySelector('h2');
    let returnFocus=null,returnScroll=null,returnRoute=null,returnIdentity=null;
    const view=document.defaultView;
    const route=()=>JSON.stringify(App.parseRoute?.()||view.location?.hash||null);
    const controller=createController(App.store,storage,state=>{
      for(const [name,value] of stylePlan(state)){if(value)document.documentElement.style.setProperty(name,value);else document.documentElement.style.removeProperty(name);}
      document.documentElement.dataset.theme=state.theme;document.documentElement.dataset.colorsCustomized=String(state.customized);select.value=state.theme;
      title.textContent='Customize '+state.theme[0].toUpperCase()+state.theme.slice(1)+' colors';
      for(const part of ['main','accent']){controls[part].input.value=state[part];controls[part].output.textContent=state[part].toUpperCase();}
      for(const [button,part,color] of allButtons)button.setAttribute('aria-pressed',String(color===state[part]));
      status.textContent=state.colorSaved?state.message:'Colors work for this session. Browser storage could not save them.';
      if(state.panelOpen&&!dialog.open){
        returnFocus=document.activeElement;returnScroll={left:view.scrollX||0,top:view.scrollY||0,behavior:'instant'};returnRoute=route();returnIdentity=App.pageIdentity;
        dialog.showModal();controls.main.input.focus({preventScroll:true});view.scrollTo?.(returnScroll);
      }
      else if(!state.panelOpen&&dialog.open){
        const samePage=returnRoute===route()&&returnIdentity===App.pageIdentity;
        const scroll=samePage?returnScroll:{left:view.scrollX||0,top:view.scrollY||0,behavior:'instant'};
        dialog.close();if(samePage)(returnFocus?.isConnected?returnFocus:select).focus({preventScroll:true});
        if(scroll)view.scrollTo?.(scroll);returnFocus=null;returnScroll=null;returnRoute=null;returnIdentity=null;
      }
    });
    dialog.querySelector('#appearance-close').addEventListener('click',()=>controller.close());
    dialog.querySelector('#appearance-reset').addEventListener('click',()=>controller.resetColors());
    dialog.addEventListener('cancel',event=>{event.preventDefault();controller.close();});
    dialog.addEventListener('close',()=>{if(!dialog.open&&controller.snapshot().panelOpen)controller.close();});
    document.defaultView.addEventListener('roshan-customize-colors',()=>controller.open());
    select.addEventListener('change',()=>controller.selectTheme(select.value,false));
    controller.refresh();return controller;
  }
  return Object.freeze({PREFS_KEY,LEGACY_KEY,THEMES,createController,stylePlan,install});
});
