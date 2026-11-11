const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {mkdirSync} = require('node:fs');
const {pathToFileURL} = require('node:url');
(async () => {
 mkdirSync('motion-qa', {recursive: true});
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') errors.push(m.text())});
 await page.context().setOffline(true);
 await page.goto(pathToFileURL('app/src/main/assets/index.html').href);
 await page.locator('nav button[data-tab=model]').click();
 await page.locator('#motionPhase').getByText('عرض ثلاثي الأبعاد تجريبي').waitFor({timeout:10000});
 const canvas=page.locator('canvas#motionCanvas');
 await page.locator('#modelToggle').click();
 await page.locator('#modelSpeed').click();
 assert.match(await page.locator('#modelSpeed').innerText(), /0.5/);
 await page.locator('#modelSpeed').click();
 const states = new Set();
 for(const name of ['squat','wall','bridge']){
   await page.selectOption('#modelMove',name);
   for(const angle of ['front','side','three']){
     await page.locator('[data-view='+angle+']').click();
     const screenshot=await canvas.screenshot({path:'motion-qa/'+name+'-'+angle+'.png'});
     assert(screenshot.length>10000);
     states.add(screenshot.toString('base64'));
   }
   await page.locator('#modelToggle').click();
   await page.waitForTimeout(1350);
   await page.locator('#modelToggle').click();
   const moved = await canvas.screenshot({path:'motion-qa/'+name+'-in-motion.png'});
   assert(!states.has(moved.toString('base64')), name + ' should move during playback');
   await page.locator('#modelRestart').click();
 }
 assert.equal(states.size,9);
 assert.deepEqual(errors,[]);
 console.log('Offline WebGL loaded, 9 distinct exercise/view frames, playback controls and 3 in-motion frames');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
