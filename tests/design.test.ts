import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync(new URL("../app/theme.css",import.meta.url),"utf8");
const tokens=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)].map(m=>[m[1],m[2]]));
function luminance(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}
test("normal text and interaction theme pairs meet WCAG AA contrast",()=>{
 for(const fg of ["text-primary","text-strong","text-muted-accessible","accent-ink","growth-ink"])for(const bg of ["background","surface","surface-muted","surface-blue","surface-paper"])assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}: ${contrast(tokens[fg],tokens[bg])}`);
 for(const bg of ["brand-action","action-hover","action-active"])assert.ok(contrast(tokens["primary-foreground"],tokens[bg])>=4.5,`button ${bg}`);
 for(const bg of ["brand-primary","brand-primary-light"])assert.ok(contrast(tokens["text-primary"],tokens[bg])>=4.5,`brand ${bg}`);
 for(const state of ["success","warning","error"])assert.ok(contrast(tokens[`${state}-ink`],tokens[`${state}-surface`])>=4.5,`${state} message`);
 for(const bg of ["background","surface","surface-muted","surface-blue","surface-paper"]){assert.ok(contrast(tokens["focus-ring"],tokens[bg])>=3);assert.ok(contrast(tokens["control-border"],tokens[bg])>=3);}
});
test("home v2 palette is exact and Tailwind aliases share CSS tokens",()=>{
 const expected={"brand-primary":"#7FB3DD","brand-primary-light":"#A9CDEB","brand-action":"#14284B",background:"#FFFFFF",surface:"#FFFFFF","surface-blue":"#E6F1FA","surface-muted":"#F3F6F9","surface-paper":"#F7F3EC","text-primary":"#1E2A3A","text-secondary":"#5B6778","text-strong":"#14284B","border-default":"#D8E2EC"};
 for(const [name,value] of Object.entries(expected))assert.equal(tokens[name],value);
 assert.match(css,/@theme inline/);assert.match(css,/--color-brand-action: var\(--brand-action\)/);
 assert.doesNotMatch(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/#[0-9a-f]{3,8}\b/i);
});
function luminanceRgb(rgb:number[]){return rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);}
const rgbOf=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
test("day sky tokens keep text contrast and the home stylesheet holds no colour values",()=>{
 for(const fg of ["text-strong","text-primary","text-secondary"])for(const bg of ["sky-top","cloud-shade"])assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}: ${contrast(tokens[fg],tokens[bg])}`);
 assert.ok(contrast(tokens["accent-ink"],tokens["sky-top"])>=3,"large accent title on sky");
 const home=readFileSync(new URL("../components/public-home.module.css",import.meta.url),"utf8");
 assert.doesNotMatch(home,/#[0-9a-f]{3,8}\b/i);assert.doesNotMatch(home,/\brgba?\(|\bhsla?\(/i);
});
test("hero text passes even if the photo under the sky overlay is pure black",()=>{
 const home=readFileSync(new URL("../components/public-home.module.css",import.meta.url),"utf8");
 const scrim=Number(home.match(/--hero-scrim:\s*(\d+)%/)?.[1])/100;
 assert.ok(scrim>0&&scrim<=1,"hero scrim strength is declared");
 // Overlay colour at `scrim` opacity composited over black is the darkest possible backdrop for dark text.
 const backdrop=luminanceRgb(rgbOf(tokens["sky-top"]).map(c=>c*scrim));
 const ratio=(fg:string)=>(backdrop+.05)/(luminanceRgb(rgbOf(tokens[fg]))+.05);
 for(const fg of ["text-strong","text-primary"])assert.ok(ratio(fg)>=4.5,`${fg} over worst-case hero: ${ratio(fg)}`);
 assert.ok(ratio("accent-ink")>=3,`large accent title over worst-case hero: ${ratio("accent-ink")}`);
});
