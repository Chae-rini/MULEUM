import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync(new URL("../app/theme.css",import.meta.url),"utf8");
const tokens=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)].map(m=>[m[1],m[2]]));
function luminance(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}
test("all normal text theme pairs meet WCAG AA 4.5:1",()=>{
 for(const fg of ["dark-ink","text-secondary","forest","error-ink"])for(const bg of ["ivory","surface","sand"])assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}: ${contrast(tokens[fg],tokens[bg])}`);
 assert.ok(contrast(tokens.ivory,tokens.forest)>=4.5);
});
test("brand palette is exact; sage and clay are not normal text tokens",()=>{
 assert.equal(tokens.ivory,"#FAF7F2");assert.equal(tokens.forest,"#2F4A3E");assert.equal(tokens.sage,"#809B87");assert.equal(tokens.sand,"#E8DED2");assert.equal(tokens.clay,"#B9775A");assert.equal(tokens["dark-ink"],"#3B3530");
 assert.doesNotMatch(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/#[0-9a-f]{3,8}\b/i);
});
