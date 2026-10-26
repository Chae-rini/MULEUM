import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync(new URL("../app/theme.css",import.meta.url),"utf8");
// Light tokens sit before the dark block; dark values override them by name (8-digit hex = translucent).
const [lightCss,darkCss=""]=css.split("@media (prefers-color-scheme: dark)");
const parseTokens=(block:string)=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?);/g)].map(m=>[m[1],m[2]]));
const tokens=parseTokens(lightCss);
const darkTokens={...tokens,...parseTokens(darkCss)};
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
 for(const fg of ["text-strong","text-primary","text-secondary"])for(const bg of ["sky-top"])assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}: ${contrast(tokens[fg],tokens[bg])}`);
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
// Dark theme: every text colour is checked against every dark surface, translucent cards over both gradient ends.
const blend=(top:string,bottom:string)=>{const a=top.length===9?parseInt(top.slice(7,9),16)/255:1;return rgbOf(top).map((c,i)=>c*a+rgbOf(bottom)[i]*(1-a));};
const ratioRgb=(fg:number[],bg:number[])=>{const v=[luminanceRgb(fg),luminanceRgb(bg)].sort((x,y)=>y-x);return (v[0]+.05)/(v[1]+.05);};
test("dark theme text, controls and messages keep WCAG AA contrast on every night surface",()=>{
 assert.ok(darkCss.includes("color-scheme: dark"),"dark block declares color-scheme");
 const glow=[...darkCss.matchAll(/--page-glow:[^;]*/g)][0][0].match(/#[0-9A-Fa-f]{6}/g)!;
 assert.equal(glow.length,2,"page gradient has two ends");
 const d=darkTokens as Record<string,string>;
 const surfaces:Record<string,number[]>={"page top":rgbOf(glow[0]),"page bottom":rgbOf(glow[1]),"card over page top":blend(d.surface,glow[0]),"card over page bottom":blend(d.surface,glow[1])};
 for(const name of ["surface-blue","surface-muted","surface-paper","band","sky-top","sky-low","disabled-surface"])surfaces[name]=rgbOf(d[name]);
 for(const fg of ["text-strong","text-primary","text-secondary","text-muted-accessible","accent-ink","growth-ink","lamp"])
  for(const [bg,rgb] of Object.entries(surfaces))assert.ok(ratioRgb(rgbOf(d[fg]),rgb)>=4.5,`dark ${fg} on ${bg}: ${ratioRgb(rgbOf(d[fg]),rgb)}`);
 for(const fg of ["focus-ring","control-border"])for(const [bg,rgb] of Object.entries(surfaces))assert.ok(ratioRgb(rgbOf(d[fg]),rgb)>=3,`dark ${fg} on ${bg}`);
 for(const fg of ["on-band","on-navy","lamp","brand-primary-light"])assert.ok(contrast(d[fg],d.band)>=4.5,`dark ${fg} on band: ${contrast(d[fg],d.band)}`);
 for(const bg of ["brand-action","action-hover","action-active"])assert.ok(contrast(d["primary-foreground"],d[bg])>=4.5,`dark button ${bg}`);
 for(const state of ["success","warning","error"])assert.ok(contrast(d[`${state}-ink`],d[`${state}-surface`])>=4.5,`dark ${state} message`);
 assert.ok(contrast(d["text-strong"],d.chip)>=4.5,"dark done mark on chip");
 assert.equal(tokens.surface,"#FFFFFF","light surface stays opaque white");
});
test("night hero text passes even if the photo under the night overlay is pure white",()=>{
 const home=readFileSync(new URL("../components/public-home.module.css",import.meta.url),"utf8");
 const night=home.split("@media (prefers-color-scheme: dark)")[1]??"";
 const scrim=Number(night.match(/--hero-scrim:\s*(\d+)%/)?.[1])/100;
 assert.ok(scrim>0&&scrim<=1,"night hero scrim strength is declared");
 const d=darkTokens as Record<string,string>;
 // Night overlay at `scrim` opacity over white is the brightest possible backdrop for light text.
 const backdrop=rgbOf(d["sky-top"]).map(c=>c*scrim+255*(1-scrim));
 for(const fg of ["text-strong","text-primary","accent-ink"])assert.ok(ratioRgb(rgbOf(d[fg]),backdrop)>=4.5,`dark ${fg} over worst-case hero: ${ratioRgb(rgbOf(d[fg]),backdrop)}`);
});
// Role tokens often point at other tokens (var(--x)); resolve them per theme before measuring.
const declarations=(block:string)=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const lightDecl=declarations(lightCss);const darkDecl={...lightDecl,...declarations(darkCss)};
function resolveHex(decl:Record<string,string>,name:string,depth=0):string{const v=decl[name];const ref=v?.match(/^var\(--([\w-]+)\)$/);return ref&&depth<8?resolveHex(decl,ref[1],depth+1):v;}
test("band text stays readable on light sky bands by day and night bands after dark",()=>{
 for(const [scheme,decl] of [["light",lightDecl],["dark",darkDecl]] as const)for(const fg of ["on-band","on-band-muted","band-eyebrow","band-label","band-heading"]){
  const f=resolveHex(decl,fg),b=resolveHex(decl,"band");
  assert.match(f,/^#[0-9A-Fa-f]{6}$/,`${scheme} ${fg} resolves to a colour`);
  assert.ok(contrast(f,b)>=4.5,`${scheme} ${fg} on band: ${contrast(f,b)}`);
 }
 for(const fg of ["text-primary","text-secondary","accent-ink"])assert.ok(contrast(tokens[fg],resolveHex(lightDecl,"page"))>=4.5,`${fg} on the white-sky page`);
});
