// Browser QA for the packaged release; requires Playwright and installed Chrome.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.argv[2], output=process.argv[3];
const project=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/project.json'),'utf8'));
if(!base||!output)throw new Error('Usage: node check_site.cjs BASE_URL OUTPUT_DIR');
fs.mkdirSync(output,{recursive:true});

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  const errors=[],records=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  async function settle(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function squarePlots(){
    await settle();
    const checks=await page.locator('.score-plot').evaluateAll(plots=>plots.map(svg=>{
      const rect=svg.getBoundingClientRect(),frame=svg.querySelector('.score-frame').getBoundingClientRect();
      return {viewport:[rect.width,rect.height],frame:[frame.width,frame.height],viewBox:svg.getAttribute('viewBox')};
    }));
    if(checks.length!==2||checks.some(r=>Math.abs(r.viewport[0]-r.viewport[1])>.1||Math.abs(r.frame[0]-r.frame[1])>.1))throw new Error('PCA plot is stretched');
    return checks;
  }
  async function pixels(){
    await settle();
    return page.locator('canvas.surface').evaluateAll(items=>items.map(c=>{
      const gl=c.getContext('webgl2'),w=c.width,h=c.height,p=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);
      let n=0,x0=w,y0=h,x1=0,y1=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        if(Math.abs(p[i]-242)+Math.abs(p[i+1]-246)+Math.abs(p[i+2]-247)>24){
          n++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
        }
      }
      return {width:w,height:h,fraction:n/(w*h),bounds:[x0,y0,x1,y1]};
    }));
  }
  async function step(value){
    await page.locator('#slider0').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
    await settle();
  }
  try{
    const response=await page.request.get(new URL('release.json',base).href);
    if(!response.ok())throw new Error('Missing release manifest');
    const release=await response.json();
    if(release.release!=='current-models-2026-10-14'||release.score_download)throw new Error('Wrong public release');
    await page.goto(base,{waitUntil:'networkidle'});
    await page.waitForURL(new URL('cuboid/viewer/',base).href);
    for(const [key,count] of Object.entries({cuboid:296,hominoids:136,mandible:93,humeri:77})){
      await page.setViewportSize({width:1500,height:1000});
      await page.goto(new URL(key+'/viewer/',base).href,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.body.dataset.loaded==='current',{timeout:60000});
      if(await page.locator('a[download], a[href*="scores.csv"]').count())throw new Error('Score download remains');
      if((await page.request.get(new URL(key+'/traversals/scores.csv',base).href)).status()!==404)throw new Error('Score CSV is accessible');
      if(await page.locator('#scores12 .score-point').count()!==count)throw new Error('Unexpected score count');
      const desktopPlots=await squarePlots();
      if(await page.locator('#project-title').innerText()!==project.title)throw new Error('Missing project identity');
      const paragraphs=await page.locator('#project .project-section p').allTextContents();
      if(JSON.stringify(paragraphs)!==JSON.stringify(project.sections.flatMap(s=>s.paragraphs)))throw new Error('Shared project copy drift');
      if(await page.locator('#project .publication-status').innerText()!==project.status)throw new Error('Publication status drift');
      let genus=null;
      if(['cuboid','hominoids'].includes(key)){
        const metadata=await (await page.request.get(new URL(key+'/traversals/data.json',base).href)).json();
        const genera=new Set(metadata.scores.map(r=>r.genus));
        if(await page.locator('#genus-legend li').count()!==genera.size)throw new Error('Incomplete genus legend');
        const painted=await page.locator('#scores12 .score-point').evaluateAll(points=>points.every(p=>p.dataset.genus&&p.style.fill));
        if(!painted)throw new Error('Missing genus colors');
        await page.locator('#genus-select').selectOption('Hylobates');
        const expected=metadata.scores.filter(r=>r.genus==='Hylobates').length;
        if(await page.locator('#scores12 .score-point.emphasized').count()!==expected)throw new Error('Genus emphasis incorrect');
        const focus=page.locator('#scores12 .score-point.emphasized').first();await focus.focus();
        if(!(await page.locator('#score-tooltip').innerText()).includes('Genus: Hylobates'))throw new Error('Keyboard genus tooltip missing');
        await page.keyboard.press('Escape');
        if(await page.locator('#score-tooltip').isVisible())throw new Error('Tooltip Escape failed');
        await page.locator('#genus-select').selectOption('');
        await page.locator('#scores').screenshot({path:path.join(output,key+'_genus.png')});
        genus={categories:genera.size,emphasisSpecimens:expected,keyboardTooltip:true};
      }else if(await page.locator('#genus-select').count())throw new Error('Unexpected mouse genus annotation');
      await page.locator('#sync-sliders').check();
      const frames=[];
      for(const value of [0,20,40]){
        await step(value);const p=await pixels();
        if(p.some(c=>c.fraction<.01||c.bounds[0]<2||c.bounds[1]<2||c.bounds[2]>=c.width-2||c.bounds[3]>=c.height-2))throw new Error(`Blank/clipped ${key} ${value}`);
        frames.push({step:value,canvases:p});
      }
      await step(20);await page.locator('#sync-sliders').uncheck();
      const before=await page.locator('#canvas0').evaluate(c=>c.toDataURL());
      await step(40);
      const after=await page.locator('#canvas0').evaluate(c=>c.toDataURL());
      if(before===after||await page.locator('#slider1').inputValue()!=='20')throw new Error('Independent decode movement failed');
      await page.locator('#zero-all').click();await page.locator('#play0').click();
      await page.waitForFunction(()=>Number(document.querySelector('#canvas0').dataset.step)>=25);
      await page.locator('#play0').click();
      await page.locator('#color').selectOption('neutral');await settle();
      await page.locator('#wire').check();await settle();await page.locator('#wire').uncheck();
      await page.locator('#color').selectOption('signed');await page.locator('#defects').check();await settle();await page.locator('#defects').uncheck();
      await page.locator('#zero-all').click();await step(30);await page.locator('#fit').click();await settle();
      await page.screenshot({path:path.join(output,key+'_desktop.png'),fullPage:true});
      const heading=await page.locator('header').innerText();
      const links=await page.locator('nav[aria-label="Datasets"] a').evaluateAll(a=>a.map(x=>x.href));
      if(links.length!==4||links.some(x=>!x.startsWith(base)))throw new Error('Project-prefix navigation broken');
      for(const href of links)if(!(await page.request.get(href)).ok())throw new Error('Dataset link failed');
      await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.body.dataset.loaded==='current',{timeout:60000});
      await page.locator('#fit').click();await step(40);
      const mobile=await pixels();
      const mobilePlots=await squarePlots();
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)||mobile.some(c=>c.fraction<.01))throw new Error('Mobile layout failed');
      if(['cuboid','hominoids'].includes(key)){
        await page.locator('#genus-select').selectOption('Pan');
        await page.locator('#scores12 .score-point.emphasized').first().click();
        if(!(await page.locator('#score-tooltip').innerText()).includes('Genus: Pan'))throw new Error('Mobile genus tooltip missing');
        await page.locator('#genus-select').selectOption('');
      }
      await page.screenshot({path:path.join(output,key+'_mobile.png'),fullPage:true});
      records.push({dataset:key,heading,scoreCount:count,frames,mobile,desktopPlots,mobilePlots,genus,sharedCopy:true,animation:true,scoreDownload:false});
      console.log(key,'passed');
    }
    fs.writeFileSync(path.join(output,'browser_checks.json'),JSON.stringify({status:errors.length?'failed':'passed',base,release:release.release,records,errors},null,2));
    if(errors.length)throw new Error(errors.join('\n'));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
