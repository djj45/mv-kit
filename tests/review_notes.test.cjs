const test=require('node:test'),assert=require('node:assert/strict');
const {fresh,validate}=require('../tools/review-notes.js');
test('fresh records stay pending',()=>{const v=fresh('v1',[2,4]);assert.equal(v.overall.status,'pending');assert.deepEqual(v.shots.map(r=>r.index),[2,4]);});
test('approved records round trip without shared mutable state',()=>{const v=fresh('v1',[0]);v.shots[0].status='pass';v.overall.status='pass';v.shots[0].note='<script>literal</script>';const copy=validate(JSON.parse(JSON.stringify(v)),'v1',[0]);copy.shots[0].note='edit';assert.equal(v.shots[0].note,'<script>literal</script>');});
test('version mismatch never imports approval',()=>{const v=fresh('old',[0]);assert.throws(()=>validate(v,'new',[0]),/版本不符/);assert.equal(v.binding,'old');});
test('missing duplicated or foreign shots are rejected',()=>{for(const indices of [[0],[0,0],[0,3]]){const v=fresh('v1',indices);assert.throws(()=>validate(v,'v1',[0,1]));}});
test('overall approval requires every shot',()=>{const v=fresh('v1',[0]);v.overall.status='pass';assert.throws(()=>validate(v,'v1',[0]),/逐镜/);});
test('malformed and oversized notes are rejected',()=>{for(const v of [null,[],{}, {...fresh('v1',[0]),overall:{status:'pass',note:'a'.repeat(2001)}}])assert.throws(()=>validate(v,'v1',[0]));});
const {compare,migrate,filtered,nextPending,activeShot}=require('../tools/review-notes.js');
function snapshot(binding,shots){return {version:1,binding,title:'test',picture:'all',mix:'mix',origin:0,duration:4,
 shots:shots||[{index:0,name:'A',scene:'a',start:0,end:2,picture:'a'},{index:1,name:'B',scene:'b',start:2,end:4,picture:'b'}],
 tracks:[{id:'voice',role:'voice',content:'voice-v1'}],cues:[{start:1,end:2,text:'old'}]};}
function history(){const s=snapshot('old'),v=fresh('old',[0,1],s);v.reviewer='Old reviewer';v.overall={status:'pass',note:'old overall'};v.shots.forEach(r=>{r.status='pass';r.note='note '+r.index;});return v;}
test('unique shot matching survives reorder and reports picture/time changes',()=>{const old=history(),s=snapshot('new',[{...old.snapshot.shots[1],index:0,start:0,end:2},{...old.snapshot.shots[0],index:1,start:2,end:4,picture:'changed'}]);const diff=compare(old,s);assert.equal(diff.mapping.get(0),1);assert.equal(diff.mapping.get(1),0);assert.deepEqual(diff.shots[1].changes,['画面','时间范围']);});
test('audio and caption changes are independent of picture',()=>{const old=history(),s=snapshot('new');s.tracks[0].content='voice-v2';s.mix='mix-v2';s.cues[0].text='new';const d=compare(old,s);assert.equal(d.pictureChanged,false);assert.equal(d.mixChanged,true);assert.equal(d.tracks[0].status,'changed');assert.deepEqual(d.cues.map(c=>c.status),['removed','added']);assert.ok(d.shots.every(s=>s.status==='same'));});
test('migration preserves current notes and reviewer but resets every verdict',()=>{const old=history(),s=snapshot('new'),v=fresh('new',[0,1],s);v.reviewer='Current';v.overall={status:'pass',note:'keep overall'};v.shots.forEach(r=>{r.status='pass';r.note='current note';});const migrated=migrate(v,old,s);assert.equal(migrated.reviewer,'Current');assert.equal(migrated.overall.note,'keep overall');assert.equal(migrated.overall.status,'pending');assert.ok(migrated.shots.every(r=>r.status==='pending'&&r.note==='current note'));assert.equal(migrated.references[0].shots[1].currentIndex,1);assert.equal(v.overall.status,'pass');});
test('duplicate shot names are never mapped by index',()=>{const old=history();old.snapshot.shots[1]={...old.snapshot.shots[1],name:'A',scene:'a'};const s=snapshot('new',old.snapshot.shots.map(r=>({...r}))),v=fresh('new',[0,1],s);const result=migrate(v,old,s);assert.ok(result.references[0].shots.every(r=>r.currentIndex===null));assert.equal(compare(old,s).ambiguous.size,2);});
test('removed and legacy notes stay as unmatched reference',()=>{const old=history(),s=snapshot('new',[{index:3,name:'C',scene:'c',start:0,end:4,picture:'c'}]);assert.ok(migrate(fresh('new',[3],s),old,s).references[0].shots.every(r=>r.currentIndex===null));delete old.snapshot;assert.equal(compare(old,s).legacy,true);assert.ok(migrate(fresh('new',[3],s),old,s).references[0].shots.every(r=>r.currentIndex===null));});
test('repeated migration is idempotent and inherited references remap safely',()=>{const old=history(),s=snapshot('middle'),mid=migrate(fresh('middle',[0,1],s),old,s);assert.equal(migrate(mid,old,s).references.length,1);const next=snapshot('next',[{...s.shots[1],index:0},{...s.shots[0],index:1}]),v=migrate(fresh('next',[0,1],next),mid,next);assert.equal(v.references[0].shots.find(r=>r.oldIndex===0).currentIndex,1);assert.equal(v.overall.status,'pending');});
test('search, status filter and pending wrap support large lists',()=>{const shots=Array.from({length:120},(_,i)=>({index:i,name:'shot-'+i,scene:'scene',from:i,to:i+1})),v=fresh('v',shots.map(s=>s.index));v.shots[119].note='find me';v.shots[119].status='changes';assert.equal(filtered(shots,v,'find me','changes')[0].index,119);assert.equal(filtered(shots,v,'find me','pass').length,0);v.shots[0].status='pass';assert.equal(nextPending(shots,v,118),1);assert.equal(activeShot(shots,119.5),119);assert.equal(activeShot(shots,120),null);});
test('incoming overlap owns live selection, gaps have no shot',()=>{const shots=[{index:0,from:0,to:2},{index:1,from:1,to:3},{index:2,from:4,to:5}];assert.equal(activeShot(shots,1.5),1);assert.equal(activeShot(shots,3.5),null);});
test('malformed snapshots and foreign reference targets cannot be imported',()=>{const v=history();v.snapshot.shots[1].index=0;assert.throws(()=>validate(v,'old',[0,1]));const s=history();s.references=[{binding:'source',reviewer:'r',updatedAt:'now',overallNote:'',shots:[{oldIndex:0,currentIndex:99,name:'bad',note:'bad'}]}];assert.throws(()=>validate(s,'old',[0,1]));});

test('stable IDs keep references attached across rename, scene replacement and reorder',()=>{
 const old=history();old.snapshot.shots.forEach((s,i)=>s.id='shot-'+i);
 const s=snapshot('new',old.snapshot.shots.toReversed().map((r,i)=>({...r,index:i,name:'Renamed '+i,scene:'new-scene'})));
 const d=compare(old,s);assert.equal(d.mapping.get(0),1);assert.equal(d.mapping.get(1),0);
 assert.deepEqual(d.shots[0].changes,['名称','场景']);
 const v=migrate(fresh('new',[0,1],s),old,s);
 assert.equal(v.references[0].shots.find(r=>r.oldIndex===0).currentIndex,1);
 assert.ok(v.shots.every(r=>r.status==='pending'));
});
test('unique IDs disambiguate duplicate display names',()=>{
 const old=history();old.snapshot.shots.forEach((s,i)=>{s.id='shot-'+i;s.name='Repeated';s.scene='same';});
 const s=snapshot('new',old.snapshot.shots.toReversed().map((r,i)=>({...r,index:i})));
 const d=compare(old,s);assert.equal(d.mapping.get(0),1);assert.equal(d.mapping.get(1),0);assert.equal(d.ambiguous.size,0);
});
test('different explicit IDs never fall back to the same name for a replacement or split',()=>{
 const old=history();old.snapshot.shots[0].id='original';
 const s=snapshot('new');s.shots[0].id='replacement';
 assert.equal(compare(old,s).mapping.has(0),false);
 assert.equal(migrate(fresh('new',[0,1],s),old,s).references[0].shots[0].currentIndex,null);
 s.shots.push({...s.shots[0],id:'split-part',index:2});
 assert.equal(compare(old,s).mapping.has(0),false);
});
test('legacy matching works when only one version has IDs and never steals an ID match',()=>{
 const old=history(),s=snapshot('new');s.shots[0].id='introduced';
 assert.equal(compare(old,s).mapping.get(0),0);
 old.snapshot.shots[0].id='introduced';delete s.shots[0].id;
 assert.equal(compare(old,s).mapping.get(0),0);
 s.shots[1].id='introduced';
 const d=compare(old,s);assert.equal(d.mapping.get(0),1);assert.equal(d.mapping.has(1),false);
});
test('invalid and duplicate IDs are rejected in imported and current snapshots',()=>{
 for(const id of [null,12,'','with space','a'.repeat(129),'end\n']){
  const old=history();old.snapshot.shots[0].id=id;assert.throws(()=>validate(old,'old',[0,1]),/ID/);
 }
 const old=history();old.snapshot.shots.forEach(s=>s.id='same');assert.throws(()=>compare(old,snapshot('new')),/ID/);
 const current=snapshot('new');current.shots.forEach(s=>s.id='same');assert.throws(()=>compare(history(),current),/ID/);
});

const {differenceNavigation,nextDifference,replaceDraft,restoreDraft,readDraft}=require('../tools/review-notes.js');
test('difference navigation seeks current shots and remaps removed captions between pilot origins',()=>{
 const old=history();old.snapshot.origin=10;old.snapshot.duration=4;old.snapshot.cues=[{start:2.5,end:3,text:'removed'}];
 const current=snapshot('new',[{index:0,name:'A',scene:'a',start:12,end:13,picture:'changed'},{index:1,name:'B',scene:'b',start:13,end:14,picture:'b'}]);
 current.origin=12;current.duration=2;current.cues=[{start:1.2,end:1.8,text:'added'}];
 const diff=compare(old,current),nav=differenceNavigation(diff,old.snapshot,current);
 assert.equal(nav.targets.find(t=>t.id==='shot:0').at,0);
 assert.equal(nav.targets.find(t=>t.id==='cue:0').at,.5);
 assert.equal(nav.targets.find(t=>t.id==='cue:0').index,0);
 assert.equal(nav.targets.find(t=>t.id==='cue:1').at,1.2);
 assert.deepEqual(new Set(nav.changedShots),new Set([0,1]));
 assert.ok(nav.targets.every((t,i)=>!i||nav.targets[i-1].at<=t.at));
});
test('caption differences mark all overlapping shots and retain gaps without inventing an owner',()=>{
 const current=snapshot('new',[{index:0,name:'A',scene:'a',start:10,end:11.5,picture:'a'},{index:1,name:'B',scene:'b',start:11,end:12,picture:'b'}]);current.origin=10;current.duration=4;
 const diff={legacy:false,shots:[],cues:[{status:'added',start:1.2,end:1.8,text:'overlap'},{status:'added',start:2.5,end:3,text:'gap'}]};
 const nav=differenceNavigation(diff,null,current);
 assert.deepEqual(nav.changedShots,[0,1]);assert.equal(nav.targets[0].index,1);assert.equal(nav.targets[1].index,null);
});
test('unknown origins, removed shots and out-of-range captions cannot seek arbitrary frames',()=>{
 const current=snapshot('new');current.origin=10;current.duration=2;
 const diff={legacy:false,shots:[],removed:[{index:5}],cues:[{status:'removed',start:0,end:1},{status:'added',start:2,end:3},{status:'added',start:-2,end:-1}]};
 assert.deepEqual(differenceNavigation(diff,{},current),{targets:[],changedShots:[]});
 assert.deepEqual(differenceNavigation({...diff,legacy:true},{origin:10},current),{targets:[],changedShots:[]});
});
test('difference previous and next wrap and preserve separate changes at the same time',()=>{
 const ts=[{id:'a',at:0},{id:'b',at:0},{id:'c',at:1}];
 assert.equal(nextDifference(ts,null,1).id,'a');assert.equal(nextDifference(ts,null,-1).id,'c');
 assert.equal(nextDifference(ts,'a',1).id,'b');assert.equal(nextDifference(ts,'c',1).id,'a');assert.equal(nextDifference(ts,'a',-1).id,'c');assert.equal(nextDifference([],null,1),null);
});
test('operation backups survive local envelope reload and undo retains later edits for recovery',()=>{
 const before=history(),incoming=history();incoming.shots[0].note='imported';
 const replaced=replaceDraft(before,incoming,'import');assert.equal(replaced.backup.record.shots[0].note,'note 0');
 incoming.shots[0].note='external mutation';assert.equal(replaced.current.shots[0].note,'imported');
 const saved=readDraft(JSON.parse(JSON.stringify({schema:'mv-kit-review-draft',version:1,...replaced})),'old',[0,1]);
 saved.current.shots[1].note='edit after import';
 const undo=restoreDraft(saved.current,saved.backup);assert.equal(undo.current.shots[0].note,'note 0');
 assert.equal(undo.backup.record.shots[1].note,'edit after import');
 const restored=restoreDraft(undo.current,undo.backup);assert.equal(restored.current.shots[0].note,'imported');assert.equal(restored.current.shots[1].note,'edit after import');
 assert.equal(Object.hasOwn(restored.current,'backup'),false);
});
test('failed import or cross-version recovery never mutates the current draft or imports approval',()=>{
 const current=fresh('new',[0,1],snapshot('new')),before=JSON.stringify(current),old=history();
 assert.throws(()=>replaceDraft(current,old,'import'),/版本不符/);
 assert.throws(()=>restoreDraft(current,{operation:'import',createdAt:'now',record:old}),/版本不符/);
 assert.equal(JSON.stringify(current),before);
 const invalid=JSON.parse(before);invalid.overall.status='pass';assert.throws(()=>replaceDraft(current,invalid,'import'),/逐镜/);
});
test('migration undo only restores a same-version draft and keeps migrated references recoverable',()=>{
 const old=history(),s=snapshot('new'),current=fresh('new',[0,1],s);current.shots[0].note='current';
 const next=replaceDraft(current,migrate(current,old,s),'migrate'),undo=restoreDraft(next.current,next.backup);
 assert.equal(undo.current.binding,'new');assert.equal(undo.current.overall.status,'pending');assert.equal(undo.current.shots[0].note,'current');assert.equal(undo.current.references,undefined);
 assert.equal(undo.backup.record.references[0].binding,'old');
});
test('legacy local drafts upgrade and corrupt backups do not discard a valid current draft',()=>{
 const value=history(),loaded=readDraft(value,'old',[0,1]);assert.deepEqual(loaded.current,value);assert.equal(loaded.backup,null);
 const envelope={schema:'mv-kit-review-draft',version:1,current:value,backup:{operation:'import',createdAt:'now',record:fresh('other',[0,1])}};
 const recovered=readDraft(envelope,'old',[0,1]);assert.deepEqual(recovered.current,value);assert.equal(recovered.backup,null);assert.ok(recovered.warning);
 assert.throws(()=>readDraft(envelope,'wrong',[0,1]),/版本不符/);
});

const {addTimedIssue,updateTimedIssue,affectedShots}=require('../tools/review-notes.js');
function issueState(){const s=snapshot('current',[{index:0,id:'first',name:'A',scene:'a',start:10,end:11,picture:'a'},{index:1,id:'second',name:'B',scene:'b',start:11,end:12,picture:'b'}]);Object.assign(s,{origin:10,duration:2,fps:24,frames:48});const v=fresh('current',[0,1],s);v.shots.forEach(r=>r.status='pass');v.overall.status='pass';return v;}
test('point issues use frame-centre ownership and revoke only affected approval',()=>{
 const before=issueState(),v=addTimedIssue(before,'p1','point',24,25,'Late landing');
 assert.equal(v.version,2);assert.equal(v.issues[0].shotIndex,1);assert.equal(v.issues[0].shotId,'second');
 assert.equal(v.shots[0].status,'pass');assert.equal(v.shots[1].status,'changes');assert.equal(v.overall.status,'pending');assert.equal(before.overall.status,'pass');
 const invalid=structuredClone(v);invalid.shots[1].status='pass';assert.throws(()=>validate(invalid,'current',[0,1]),/未复核/);
});
test('range issues block every affected shot including cross-cuts and overlaps',()=>{
 const v=addTimedIssue(issueState(),'range','range',20,30,'Audio masked');assert.ok(v.shots.every(s=>s.status==='changes'));
 const c=issueState().snapshot;c.shots[0].end=11.5;
 assert.deepEqual(affectedShots(c,{startFrame:24,endFrame:26}),[0,1]);
});
test('fixed needs a resolution, verified requires a separate review, and edits reopen issues',()=>{
 const open=addTimedIssue(issueState(),'p','point',0,1,'Problem');
 assert.throws(()=>updateTimedIssue(open,'p',{status:'fixed'}),/处理说明/);
 assert.throws(()=>updateTimedIssue(open,'p',{status:'verified',resolution:'Done'}),/再人工复核/);
 const fixed=updateTimedIssue(open,'p',{status:'fixed',resolution:'Shifted two frames'});
 const verified=updateTimedIssue(fixed,'p',{status:'verified'});assert.equal(verified.issues[0].status,'verified');assert.equal(verified.shots[0].status,'changes');
 verified.shots[0].status='pass';verified.overall.status='pass';validate(verified,'current',[0,1]);
 const edited=updateTimedIssue(verified,'p',{resolution:'Different correction'});assert.equal(edited.issues[0].status,'fixed');assert.equal(edited.overall.status,'pending');
 assert.equal(updateTimedIssue(verified,'p',{note:'Different problem'}).issues[0].status,'open');
});
test('gap issues remain unassigned but block overall approval',()=>{
 const base=issueState();base.snapshot.shots[0].end=10.5;base.snapshot.shots[1].start=11.5;
 const v=addTimedIssue(base,'gap','point',24,25,'Gap problem');assert.equal(v.issues[0].shotIndex,null);assert.equal(v.issues[0].shotId,null);assert.ok(v.shots.every(s=>s.status==='pass'));assert.equal(v.overall.status,'pending');
 const invalid=structuredClone(v);invalid.overall.status='pass';assert.throws(()=>validate(invalid,'current',[0,1]),/未复核/);
});
test('invalid bounds, identity, duplicate IDs and downgraded schemas cannot import issues',()=>{
 for(const [start,end,kind] of [[-1,1,'point'],[48,49,'point'],[1,1,'range'],[0,2,'point'],[.5,2,'range']])assert.throws(()=>addTimedIssue(issueState(),'p',kind,start,end,'Problem'));
 const v=addTimedIssue(issueState(),'p','point',0,1,'Problem');
 for(const edit of [v=>v.version=1,v=>v.issues.push({...v.issues[0]}),v=>v.issues[0].shotId='second',v=>v.issues[0].shotIndex=1,v=>v.issues[0].note='']){const bad=structuredClone(v);edit(bad);assert.throws(()=>validate(bad,'current',[0,1]));}
});
test('historical issues remain read-only references with original clock and remap across versions',()=>{
 let old=addTimedIssue(issueState(),'p','range',20,30,'Old issue');old=updateTimedIssue(old,'p',{status:'fixed',resolution:'Old fix'});old=updateTimedIssue(old,'p',{status:'verified'});
 const snap=structuredClone(old.snapshot);snap.binding='new';snap.shots.reverse().forEach((s,i)=>s.index=i);
 const current=fresh('new',[0,1],snap),v=migrate(current,old,snap);
 assert.equal(v.version,2);assert.equal(v.issues,undefined);assert.equal(v.references[0].issues[0].currentIndex,1);assert.equal(v.references[0].issues[0].status,'verified');assert.equal(v.references[0].issueClock.origin,10);assert.ok(v.shots.every(s=>s.status==='pending'));
 const removed=structuredClone(snap);removed.binding='removed';removed.shots.forEach(s=>s.id='replacement-'+s.index);
 const again=migrate(fresh('removed',[0,1],removed),v,removed);assert.equal(again.references[0].issues[0].currentIndex,null);
});
test('issue-removal backup restores timed notes without approving the shot',()=>{
 const before=addTimedIssue(issueState(),'p','point',0,1,'Problem'),after=structuredClone(before);after.issues=[];
 const changed=replaceDraft(before,after,'issue-remove'),restored=restoreDraft(changed.current,changed.backup);
 assert.equal(restored.current.issues.length,1);assert.equal(restored.current.shots[0].status,'changes');assert.equal(restored.current.overall.status,'pending');
});
test('sub-frame shots with no encoded frame are not affected by a spanning issue',()=>{
 const c=issueState().snapshot;c.shots.push({index:2,start:10.03,end:10.04,name:'tiny',scene:'tiny',picture:'none'});
 assert.deepEqual(affectedShots(c,{startFrame:0,endFrame:3}),[0]);
});

const {restoreEditor,filteredIssues,nextIssue}=require('../tools/review-notes.js');
function editorEnvelope(current,entries,composer={note:'',startFrame:null,endFrame:null}){return {schema:'mv-kit-review-draft',version:2,current,backup:null,editor:{binding:current.binding,issues:entries,composer}};}
test('unsubmitted issue buffers reload without applying status or changing formal timestamps',()=>{
 const current=addTimedIssue(issueState(),'p','point',0,1,'Formal note'),before=JSON.stringify(current);
 const entry={id:'p',base:structuredClone(current.issues[0]),patch:{note:'',resolution:'Draft treatment',status:'verified'}};
 const loaded=readDraft(JSON.parse(JSON.stringify(editorEnvelope(current,[entry]))),'current',[0,1]);
 assert.equal(loaded.issueEdits[0].patch.status,'verified');assert.equal(loaded.issueEdits[0].patch.note,'');
 assert.equal(loaded.current.issues[0].status,'open');assert.equal(loaded.current.issues[0].note,'Formal note');assert.equal(JSON.stringify(current),before);
 assert.throws(()=>updateTimedIssue(loaded.current,'p',{resolution:'Draft treatment',status:'verified'}),/再人工复核/);
});
test('editor recovery rejects foreign bindings, unknown issues and changed base records',()=>{
 const current=addTimedIssue(issueState(),'p','point',0,1,'Formal'),entry={id:'p',base:structuredClone(current.issues[0]),patch:{note:'Draft',resolution:'',status:'open'}};
 const foreign=editorEnvelope(current,[entry]);foreign.editor.binding='other';assert.equal(readDraft(foreign,'current',[0,1]).issueEdits.length,0);
 const changed=structuredClone(current);changed.issues[0].note='New formal';
 const recovered=readDraft(editorEnvelope(changed,[entry,{...entry,id:'gone'}]),'current',[0,1]);assert.equal(recovered.issueEdits.length,0);assert.ok(recovered.warning);assert.equal(recovered.current.issues[0].note,'New formal');
});
test('malformed editor rows do not discard valid drafts or formal records',()=>{
 let current=addTimedIssue(issueState(),'p','point',0,1,'First');current=addTimedIssue(current,'q','point',24,25,'Second');
 const entries=current.issues.map(i=>({id:i.id,base:structuredClone(i),patch:{note:'Draft '+i.id,resolution:'',status:'open'}}));entries[1].patch.status='arbitrary';
 const loaded=readDraft(editorEnvelope(current,entries),'current',[0,1]);assert.deepEqual(loaded.issueEdits.map(e=>e.id),['p']);assert.equal(loaded.current.issues.length,2);assert.ok(loaded.warning);
});
test('composer note and incomplete ranges recover without creating formal issues',()=>{
 const current=issueState(),composer={note:'Not submitted yet',startFrame:30,endFrame:20};
 const loaded=readDraft(editorEnvelope(current,[],composer),'current',[0,1]);assert.deepEqual(loaded.composer,composer);assert.equal(loaded.current.issues,undefined);
 const invalid=readDraft(editorEnvelope(current,[],{...composer,endFrame:49}),'current',[0,1]);assert.equal(invalid.composer.endFrame,null);assert.ok(invalid.warning);
 const legacy=readDraft({schema:'mv-kit-review-draft',version:1,current,backup:null},'current',[0,1]);assert.deepEqual(legacy.issueEdits,[]);
});
test('problem search covers formal treatment, ID and all involved shot names',()=>{
 let state=addTimedIssue(issueState(),'cross-issue','range',20,30,'Audio overlap');state=updateTimedIssue(state,'cross-issue',{resolution:'Reduce BGM',status:'fixed'});
 assert.equal(filteredIssues(state,'bgm','fixed').length,1);assert.equal(filteredIssues(state,'CROSS-ISSUE').length,1);
 assert.equal(filteredIssues(state,'second','all',1).length,1);assert.equal(filteredIssues(state,'','all',0).length,1);assert.equal(filteredIssues(state,'','open').length,0);
 assert.equal(filteredIssues(state,'','all',null).length,0);assert.equal(filteredIssues(state,'unknown').length,0);
});
test('global issue navigation follows time order, wraps and ignores the selected issue status',()=>{
 let state=addTimedIssue(issueState(),'late','point',30,31,'Late');state=addTimedIssue(state,'early','point',0,1,'Early');state=addTimedIssue(state,'middle','point',10,11,'Middle');
 state=updateTimedIssue(state,'middle',{status:'fixed',resolution:'Fixed'});
 assert.equal(nextIssue(state,'open',null).id,'early');assert.equal(nextIssue(state,'open','early').id,'late');assert.equal(nextIssue(state,'open','late').id,'early');
 assert.equal(nextIssue(state,'fixed','early').id,'middle');assert.equal(nextIssue(state,'open','middle').id,'late');assert.equal(nextIssue(state,'verified',null),null);
});
