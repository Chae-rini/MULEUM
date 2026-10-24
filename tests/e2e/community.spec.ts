import {test,expect,type Page} from '@playwright/test';
async function menu(page:Page,label:string){const narrow=(page.viewportSize()?.width??1440)<=690;if(narrow)await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();const link=page.getByRole('navigation',{name:narrow?'모바일 메뉴':'메인 메뉴',exact:true}).getByRole('link',{name:label,exact:true});const href=await link.getAttribute('href');await link.click();await expect(page).toHaveURL(new RegExp(`${href}$`));}
test('rendered text has AA contrast on public, student, teacher and administrator screens',async({page})=>{
 for(const path of ['/','/app','/app/teacher','/app/parent','/app/accounts','/app/profile','/app/journal','/app/lesson','/app/videos','/app/questions','/app/goals','/guide/app','/login',`/invite/${'a'.repeat(43)}`]){
  await page.goto(path);await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;}));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const failures=await page.evaluate(()=>{
   const rgb=(value:string)=>value.match(/[\d.]+/g)!.map(Number);
   const lum=(values:number[])=>values.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   const errors:string[]=[];
   for(const el of document.querySelectorAll<HTMLElement>('body *')){
    if((!Array.from(el.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim())&&!['INPUT','TEXTAREA','SELECT'].includes(el.tagName))||el.closest('[aria-hidden="true"],:disabled')||['SCRIPT','STYLE','OPTION'].includes(el.tagName)||el.classList.contains('skip-link'))continue;
    const box=el.getBoundingClientRect();const style=getComputedStyle(el);if(!box.width||!box.height||style.visibility==='hidden')continue;
    let node:HTMLElement|null=el;let bg=[255,255,255];while(node){const c=rgb(getComputedStyle(node).backgroundColor);if(c.length===3||c[3]===1){bg=c;break;}node=node.parentElement;}
    const foreground=lum(rgb(style.color));const background=lum(bg);const ratio=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
    const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseFloat(style.fontWeight)>=700);
    if(ratio<(large?3:4.5))errors.push(`${el.tagName}.${el.className}: ${ratio.toFixed(2)} ${(el.textContent??'').slice(0,35)}`);
   }return errors;
  });expect(failures,`${path} text contrast`).toEqual([]);
 }
});
test('profile optional gender is private and persists only in the demo session',async({page},info)=>{
 await page.goto('/app/profile');await expect(page.getByLabel('성별 선택')).toHaveValue('');
 await expect(page.getByRole('heading',{name:'나의 프로필',exact:true})).toBeVisible();
 await page.getByLabel('성별 선택').selectOption('other');await expect(page.getByLabel('나의 직접 표현 · 선택')).toBeVisible();
 await page.getByRole('button',{name:'가상 프로필 저장'}).click();await expect(page.getByRole('status')).toContainText('저장했어요');
 await page.getByLabel('나의 직접 표현 · 선택').fill('PRIVATE_GENDER_UI');await page.getByRole('button',{name:'가상 프로필 저장'}).click();
 await menu(page,'복습 자료실');await menu(page,'나의 프로필');await expect(page.getByLabel('나의 직접 표현 · 선택')).toHaveValue('PRIVATE_GENDER_UI');
 await page.getByLabel('성별 선택').selectOption('prefer_not_to_say');await expect(page.getByLabel('나의 직접 표현 · 선택')).toHaveCount(0);await page.getByRole('button',{name:'가상 프로필 저장'}).click();
 expect(await page.evaluate(()=>Object.values(localStorage).join(''))).not.toContain('PRIVATE_GENDER_UI');
 await page.screenshot({path:`artifacts/${info.project.name}-profile.png`,fullPage:true});
 await page.getByLabel('화면 역할 미리보기').selectOption('administrator');expect(await page.locator('body').innerHTML()).not.toContain('PRIVATE_GENDER_UI');
 await page.goto('/');expect(await page.locator('body').innerHTML()).not.toContain('PRIVATE_GENDER_UI');
});
test('private video assignment, invitation confirmation and external revocation are separate',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app/videos');await expect(page.getByRole('heading',{name:'가상 복습 · 질문에서 개념으로'})).toBeVisible();await expect(page.getByRole('heading',{name:'가상 학생 B 전용 복습'})).toHaveCount(0);
 await expect(page.getByText('student-b@example.invalid',{exact:false})).toHaveCount(0);
 await page.getByLabel('화면 역할 미리보기').selectOption('teacher');await menu(page,'복습 자료실');await expect(page.getByRole('button',{name:'최종 승인',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Studio 초대 완료 기록'})).toHaveCount(0);
 await page.getByLabel('화면 역할 미리보기').selectOption('administrator');await menu(page,'복습 자료실');
 const card=page.locator('section.card').filter({has:page.getByRole('heading',{name:'가상 복습 · 질문에서 개념으로',exact:true})});
 await card.getByRole('button',{name:'Studio 초대 완료 기록'}).click();await expect(card.getByText('student-a@example.invalid · 초대 완료 확인')).toBeVisible();
 await card.getByRole('button',{name:'배정 종료 · 회수 요청'}).click();await expect(card.getByText('student-a@example.invalid · YouTube 회수 대기')).toBeVisible();
 await page.getByLabel('화면 역할 미리보기').selectOption('student');await menu(page,'복습 자료실');await expect(page.getByRole('heading',{name:'가상 복습 · 질문에서 개념으로'})).toHaveCount(0);
 await page.getByLabel('화면 역할 미리보기').selectOption('administrator');await menu(page,'복습 자료실');await card.getByRole('button',{name:'Studio 회수 완료 기록'}).click();await expect(card.getByText('student-a@example.invalid · YouTube 회수 완료 확인')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`artifacts/${info.project.name}-videos.png`,fullPage:true});expect(errors).toEqual([]);
});
test('teacher draft requires administrator approval and mismatches remain hidden',async({page})=>{
 await page.goto('/app/teacher');await menu(page,'복습 자료실');
 for(const [label,value] of [['YouTube Video ID','DEMO0000003'],['영상 제목','가상 신규 영상'],['과목','수학'],['단원','함수'],['수강 대상','가상 학생 A']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'가상 영상 등록',exact:true}).click();const card=page.locator('section.card').filter({has:page.getByRole('heading',{name:'가상 신규 영상',exact:true})});await card.getByRole('button',{name:'검토 요청',exact:true}).click();
 await page.getByLabel('화면 역할 미리보기').selectOption('administrator');await menu(page,'복습 자료실');await card.getByRole('button',{name:'최종 승인',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('공식 채널');
 await card.getByLabel('YouTube에서 확인한 상태').selectOption('private');await card.getByRole('checkbox').check();await card.getByRole('button',{name:'수동 확인 기록'}).click();await card.getByRole('button',{name:'최종 승인',exact:true}).click();await card.getByRole('button',{name:'학생에게 배정'}).click();
 await page.getByLabel('화면 역할 미리보기').selectOption('student');await menu(page,'복습 자료실');await expect(page.getByRole('heading',{name:'가상 신규 영상'})).toBeVisible();
 await page.getByLabel('화면 역할 미리보기').selectOption('administrator');await menu(page,'복습 자료실');await card.getByLabel('YouTube에서 확인한 상태').selectOption('public');await card.getByRole('button',{name:'수동 확인 기록'}).click();
 await page.getByLabel('화면 역할 미리보기').selectOption('student');await menu(page,'복습 자료실');await expect(page.getByRole('heading',{name:'가상 신규 영상'})).toHaveCount(0);
});
test('guardian approval and graduation flow update the related demo screens',async({page})=>{
 await page.goto('/app/accounts');const link=page.locator('.assignment-row').filter({hasText:'가상 학부모 ↔ 가상 학생 B'});await link.getByRole('button',{name:'관계 확인 후 승인 · 시연'}).click();
 await page.getByLabel('화면 역할 미리보기').selectOption('parent');await menu(page,'회원과 연결');await expect(page.getByRole('heading',{name:'가상 학생 B',exact:true})).toBeVisible();await expect(page.getByLabel('생년월일 · 필수')).toHaveCount(0);
 await page.getByLabel('화면 역할 미리보기').selectOption('administrator');await menu(page,'회원과 연결');await page.getByRole('button',{name:'담당 배정 종료',exact:true}).click();await expect(page.getByRole('button',{name:'담당 배정 종료',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'배정·변경 승인',exact:true}).click();await expect(page.getByRole('button',{name:'담당 배정 종료',exact:true})).toHaveCount(1);const account=page.locator('.assignment-row').filter({has:page.getByRole('heading',{name:'가상 학생 A',exact:true})});await account.getByRole('button',{name:'과외 종료 · 졸업 전환'}).click();await expect(account).toContainText('alumni');
 await menu(page,'복습 자료실');await expect(page.getByText('student-a@example.invalid · YouTube 회수 대기')).toBeVisible();
});
