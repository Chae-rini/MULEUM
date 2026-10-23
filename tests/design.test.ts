import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync(new URL("../app/theme.css",import.meta.url),"utf8");
const tokens=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)].map(m=>[m[1],m[2]]));
function luminance(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}
test("normal text and interaction theme pairs meet WCAG AA contrast",()=>{
 for(const fg of ["text-primary","text-muted-accessible","accent-ink","growth-ink"])for(const bg of ["background","surface","surface-muted","surface-blue","surface-paper"])assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}: ${contrast(tokens[fg],tokens[bg])}`);
 for(const bg of ["brand-action","action-hover","action-active"])assert.ok(contrast(tokens["primary-foreground"],tokens[bg])>=4.5,`button ${bg}`);
 for(const bg of ["brand-primary","brand-primary-light"])assert.ok(contrast(tokens["text-primary"],tokens[bg])>=4.5,`brand ${bg}`);
 for(const state of ["success","warning","error"])assert.ok(contrast(tokens[`${state}-ink`],tokens[`${state}-surface`])>=4.5,`${state} message`);
 for(const bg of ["background","surface","surface-muted","surface-blue","surface-paper"]){assert.ok(contrast(tokens["focus-ring"],tokens[bg])>=3);assert.ok(contrast(tokens["control-border"],tokens[bg])>=3);}
});
test("soft blue library palette is exact and Tailwind aliases share CSS tokens",()=>{
 const expected={"brand-primary":"#78AFFE","brand-primary-light":"#C5DCFC","brand-action":"#3567B7",background:"#F8FBFF",surface:"#FFFFFF","surface-blue":"#EAF3FF","surface-muted":"#F1F3F7","surface-paper":"#FBF9F5","text-primary":"#29374C","text-secondary":"#4F5D73","border-default":"#E2E8F0"};
 for(const [name,value] of Object.entries(expected))assert.equal(tokens[name],value);
 assert.match(css,/@theme inline/);assert.match(css,/--color-brand-action: var\(--brand-action\)/);
 assert.doesNotMatch(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/#[0-9a-f]{3,8}\b/i);
});
