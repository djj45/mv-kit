/* Version-bound human review, scalable navigation and advisory historical notes. */
(function(G){
'use strict';
const states=['pending','pass','changes'],clone=v=>JSON.parse(JSON.stringify(v));
function checkShotIds(shots){
  const ids=new Set();
  for(const s of shots)if(Object.hasOwn(s,'id')){
    if(typeof s.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s.id)||ids.has(s.id))throw Error('镜头 ID 格式错误或重复。');
    ids.add(s.id);
  }
}
function issueClock(c){
  if(!c||!Number.isInteger(c.frames)||c.frames<=0||!Number.isFinite(c.fps)||c.fps<=0||!Number.isFinite(c.origin))throw Error('时间标注缺少有效帧时钟。');
  return c;
}
function checkIssueRows(items,c){
  if(!Array.isArray(items)||items.length>1000)throw Error('每份记录最多保存 1000 条时间标注。');
  const seen=new Set();
  for(const i of items){
    if(!i||typeof i.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(i.id)||seen.has(i.id))throw Error('时间标注 ID 无效或重复。');seen.add(i.id);
    if(!['point','range'].includes(i.kind)||!['open','fixed','verified'].includes(i.status)||!Number.isInteger(i.startFrame)||!Number.isInteger(i.endFrame)||i.startFrame<0||i.endFrame<=i.startFrame||i.endFrame>c.frames||(i.kind==='point'&&i.endFrame!==i.startFrame+1))throw Error('时间标注帧范围或状态无效。');
    if(typeof i.note!=='string'||!i.note.trim()||i.note.length>2000||typeof i.resolution!=='string'||i.resolution.length>2000||(i.status!=='open'&&!i.resolution.trim()))throw Error('请填写问题说明；已修改和已复核项还需处理说明。');
    if(!(i.shotIndex===null||(Number.isInteger(i.shotIndex)&&i.shotIndex>=0))||!(i.shotId===null||(typeof i.shotId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(i.shotId))))throw Error('时间标注镜头身份无效。');
  }
}
function issueOwner(c,frame){let owner=null;const at=c.origin+(frame+.5)/c.fps;for(const s of c.shots)if(s.start<=at&&at<s.end)owner=s;return owner;}
function affectedShots(c,i){return c.shots.filter(s=>{const first=Math.max(0,Math.ceil((s.start-c.origin)*c.fps-.5)),last=Math.min(c.frames,Math.ceil((s.end-c.origin)*c.fps-.5));return first<last&&first<i.endFrame&&last>i.startFrame;}).map(s=>s.index);}
function validateTimedIssues(value){
  const refs=value.references||[],ids=value.shots.map(s=>s.index);
  if((value.issues!==undefined||refs.some(r=>r.issues!==undefined))&&value.version!==2)throw Error('时间标注需要第 2 版审片记录。');
  for(const ref of refs)if(ref.issues!==undefined){checkIssueRows(ref.issues,issueClock(ref.issueClock));for(const i of ref.issues)if(!(i.currentIndex===null||(Number.isInteger(i.currentIndex)&&ids.includes(i.currentIndex))))throw Error('历史问题关联了未知镜头。');}
  if(value.issues===undefined)return;
  const c=issueClock(value.snapshot);checkIssueRows(value.issues,c);
  for(const i of value.issues){
    const owner=issueOwner(c,i.startFrame);
    if(i.shotIndex!==(owner?.index??null)||i.shotId!==(owner?.id??null))throw Error('时间标注镜头与所在帧不符。');
    if(i.status!=='verified'&&(value.overall.status==='pass'||value.shots.some(s=>s.status==='pass'&&affectedShots(c,i).includes(s.index))))throw Error('仍有未复核问题，相关镜头及整片不能标为通过。');
  }
}
function reopenForIssue(state,i){
  if(i.status==='verified')return;
  const affected=affectedShots(state.snapshot,i);for(const row of state.shots)if(affected.includes(row.index))row.status='changes';
  if(state.overall.status==='pass')state.overall.status='pending';
}
function addTimedIssue(state,id,kind,startFrame,endFrame,note){
  const next=clone(state),c=issueClock(next.snapshot),owner=issueOwner(c,startFrame);
  const issue={id,kind,startFrame,endFrame,note,status:'open',resolution:'',shotIndex:owner?.index??null,shotId:owner?.id??null};
  next.version=2;next.issues=[...(next.issues||[]),issue];reopenForIssue(next,issue);
  return validate(next,next.binding,next.shots.map(s=>s.index));
}
function updateTimedIssue(state,id,patch){
  const next=clone(state),issue=next.issues?.find(i=>i.id===id);if(!issue)throw Error('时间标注不存在。');
  const previous=clone(issue);for(const k of ['note','resolution','status'])if(Object.hasOwn(patch,k))issue[k]=patch[k];
  if(issue.note!==previous.note)issue.status='open';
  else if(previous.status==='verified'&&issue.resolution!==previous.resolution)issue.status=issue.resolution.trim()?'fixed':'open';
  else if(issue.status==='verified'&&!['fixed','verified'].includes(previous.status))throw Error('先填写处理说明并保存为已修改，再人工复核。');
  reopenForIssue(next,issue);return validate(next,next.binding,next.shots.map(s=>s.index));
}
function fresh(binding,ids,snapshot){
  const value={schema:'mv-kit-review',version:1,binding,reviewer:'',updatedAt:new Date().toISOString(),
    overall:{status:'pending',note:''},shots:ids.map(index=>({index,status:'pending',note:''}))};
  if(snapshot)value.snapshot=clone(snapshot);
  return value;
}
function validate(value,binding,ids){
  if(!value||value.schema!=='mv-kit-review'||![1,2].includes(value.version))throw Error('无法识别的审片记录格式。');
  if(value.binding!==binding)throw Error('版本不符，请用“比较历史记录”查看变化并迁入参考；当前记录未被覆盖。');
  const text=(v,n)=>typeof v==='string'&&v.length<=n,integer=v=>Number.isInteger(v)&&v>=0;
  if(!text(value.binding,200)||!text(value.reviewer,200)||!text(value.updatedAt,100))throw Error('审片人或版本格式不正确。');
  if(!Array.isArray(value.shots)||value.shots.length!==ids.length||value.shots.some(r=>!r||!integer(r.index))||
     value.shots.map(r=>r.index).sort((a,b)=>a-b).join(',')!==[...ids].sort((a,b)=>a-b).join(','))throw Error('镜头列表与当前版本不符。');
  for(const row of [value.overall,...value.shots])if(!row||!states.includes(row.status)||!text(row.note,2000))throw Error('审片状态或备注格式不正确。');
  if(value.overall.status==='pass'&&value.shots.some(r=>r.status!=='pass'))throw Error('请先逐镜复核，再将整体标为通过。');
  if(value.snapshot){
    const s=value.snapshot;
    if(s.version!==1||s.binding!==binding||!Array.isArray(s.shots)||!Array.isArray(s.tracks)||!Array.isArray(s.cues)||
       !['title','picture','mix'].every(k=>text(s[k],2000))||s.shots.length!==ids.length||
       s.shots.some(r=>!r||!integer(r.index)||!['name','scene','picture'].every(k=>text(r[k],2000))||!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.start>=r.end)||
       s.shots.map(r=>r.index).sort((a,b)=>a-b).join(',')!==[...ids].sort((a,b)=>a-b).join(',')||
       s.tracks.some(r=>!r||!['id','role','content'].every(k=>text(r[k],2000)))||
       s.cues.some(r=>!r||!text(r.text,100000)||!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.start>=r.end))throw Error('版本差异信息格式不正确。');
    checkShotIds(s.shots);
  }
  if(value.references!==undefined){
    if(!Array.isArray(value.references)||value.references.length>50)throw Error('历史参考最多保存 50 个版本。');
    for(const ref of value.references){
      if(!ref||!text(ref.binding,200)||!text(ref.reviewer,200)||!text(ref.updatedAt,100)||!text(ref.overallNote,2000)||!Array.isArray(ref.shots)||
        ref.shots.some(r=>!r||!integer(r.oldIndex)||(r.currentIndex!==null&&!ids.includes(r.currentIndex))||!text(r.name,2000)||!text(r.note,2000)))throw Error('历史参考格式不正确。');
    }
  }
  validateTimedIssues(value);return clone(value);
}
function readHistory(value){
  if(!value||!Array.isArray(value.shots))throw Error('无法识别的历史记录。');
  const ids=value.shots.map(r=>r&&r.index);
  if(new Set(ids).size!==ids.length)throw Error('历史记录含重复镜头。');
  return validate(value,value.binding,ids);
}
function matches(oldShots,newShots){
  const key=s=>JSON.stringify([s.name,s.scene]),groups=list=>{const map=new Map();for(const s of list){const k=key(s);map.set(k,[...(map.get(k)||[]),s]);}return map;};
  const before=groups(oldShots),after=groups(newShots),mapping=new Map(),ambiguous=new Set();
  checkShotIds(oldShots);checkShotIds(newShots);
  const byId=new Map(newShots.filter(s=>s.id!==undefined).map(s=>[s.id,s])),used=new Set();
  for(const old of oldShots)if(old.id!==undefined&&byId.has(old.id)){
    const target=byId.get(old.id);mapping.set(old.index,target.index);used.add(target.index);
  }
  for(const old of oldShots){
    if(mapping.has(old.index))continue;
    const a=before.get(key(old)),b=after.get(key(old))||[];
    // Never override two explicitly different identities with a name match.
    const candidates=b.filter(s=>!used.has(s.index)&&(old.id===undefined||s.id===undefined));
    if(a.length===1&&b.length===1&&candidates.length===1){mapping.set(old.index,b[0].index);used.add(b[0].index);}
    else if(candidates.length)ambiguous.add(old.index);
  }return {mapping,ambiguous};
}
function compare(oldValue,current){
  const old=readHistory(oldValue),before=old.snapshot;
  if(!before)return {legacy:true,mapping:new Map(),ambiguous:new Set(),shots:[],tracks:[],cues:[],removed:[]};
  const {mapping,ambiguous}=matches(before.shots,current.shots),reverse=new Map([...mapping].map(([a,b])=>[b,a]));
  const shots=current.shots.map(s=>{const previous=before.shots.find(o=>o.index===reverse.get(s.index));
    if(!previous){const duplicate=before.shots.some(o=>ambiguous.has(o.index)&&o.name===s.name&&o.scene===s.scene);return {index:s.index,name:s.name,status:duplicate?'ambiguous':'added',changes:[]};}
    const changes=[];if(previous.picture!==s.picture)changes.push('画面');if(previous.start!==s.start||previous.end!==s.end)changes.push('时间范围');
    if(previous.name!==s.name)changes.push('名称');if(previous.scene!==s.scene)changes.push('场景');
    return {index:s.index,name:s.name,status:changes.length?'changed':'same',changes};});
  const removed=before.shots.filter(s=>!mapping.has(s.index)).map(s=>({name:s.name,index:s.index,status:ambiguous.has(s.index)?'ambiguous':'removed'}));
  const tracks=[];for(const id of new Set([...before.tracks,...current.tracks].map(t=>t.id))){
    const a=before.tracks.filter(t=>t.id===id),b=current.tracks.filter(t=>t.id===id);
    const status=!a.length?'added':!b.length?'removed':a.length!==1||b.length!==1?'ambiguous':a[0].content!==b[0].content||a[0].role!==b[0].role?'changed':'same';
    tracks.push({id,status});
  }
  const cues=[],remaining=[...current.cues];
  for(const cue of before.cues){const i=remaining.findIndex(c=>c.start===cue.start&&c.end===cue.end&&c.text===cue.text);if(i>=0)remaining.splice(i,1);else cues.push({...cue,status:'removed'});}
  cues.push(...remaining.map(c=>({...c,status:'added'})));
  return {legacy:false,mapping,ambiguous,shots,removed,tracks,cues,pictureChanged:before.picture!==current.picture,mixChanged:before.mix!==current.mix};
}
function migrate(state,oldValue,current){
  const old=readHistory(oldValue),diff=compare(old,current),next=clone(state);
  if(old.binding===state.binding)throw Error('这是当前版本，请使用普通导入。');
  next.snapshot=clone(current);next.overall.status='pending';next.shots.forEach(r=>{r.status='pending';});
  const direct={binding:old.binding,reviewer:old.reviewer,updatedAt:old.updatedAt,overallNote:old.overall.note,
    shots:old.shots.filter(r=>r.note).map(r=>({oldIndex:r.index,currentIndex:r.index,
      name:old.snapshot?.shots.find(s=>s.index===r.index)?.name||`旧镜头 ${r.index+1}`,note:r.note}))};
  if(old.issues?.length){direct.issueClock={origin:old.snapshot.origin,fps:old.snapshot.fps,frames:old.snapshot.frames};direct.issues=old.issues.map(i=>({...clone(i),currentIndex:i.shotIndex}));}
  const incoming=[...(old.references||[]),direct].filter(ref=>ref.overallNote||ref.shots.length||ref.issues?.length);
  const refs=new Map((next.references||[]).map(ref=>[ref.binding,ref]));
  for(const ref of incoming){const copy={...clone(ref),shots:ref.shots.map(r=>({...r,currentIndex:diff.mapping.get(r.currentIndex)??null}))};if(copy.issues)copy.issues=copy.issues.map(i=>({...i,currentIndex:diff.mapping.get(i.currentIndex)??null}));refs.set(ref.binding,copy);}
  next.references=[...refs.values()];next.updatedAt=new Date().toISOString();
  if(next.references.some(r=>r.issues!==undefined))next.version=2;
  return validate(next,state.binding,state.shots.map(r=>r.index));
}
function filtered(shots,state,query,status){
  const needle=query.trim().toLocaleLowerCase(),byIndex=new Map(state.shots.map(r=>[r.index,r]));
  return shots.filter(s=>{const row=byIndex.get(s.index);return (status==='all'||row.status===status)&&
    `${s.name} ${s.scene} ${row.note}`.toLocaleLowerCase().includes(needle);});
}
function nextPending(shots,state,after){
  const pending=new Set(state.shots.filter(r=>r.status==='pending').map(r=>r.index)),position=shots.findIndex(s=>s.index===after);
  for(let offset=1;offset<=shots.length;offset++){const s=shots[(position+offset+shots.length)%shots.length];if(pending.has(s.index))return s.index;}return null;
}
function activeShot(shots,songTime){let found=null;for(const s of shots)if(s.from<=songTime&&songTime<s.to)found=s.index;return found;}
function differenceNavigation(diff,before,current){
  const targets=[],changed=new Set(),origin=current.origin,duration=current.duration;
  if(diff.legacy)return {targets,changedShots:[]};
  const located=(id,kind,start,end,index=null)=>{
    if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(duration)||start>=duration||end<=0||end<=start)return;
    const at=Math.max(0,start);
    if(index===null)for(const s of current.shots)if(s.start<=origin+at&&origin+at<s.end)index=s.index;
    targets.push({id,kind,at,index});
  };
  for(const row of diff.shots.filter(s=>s.status!=='same')){
    changed.add(row.index);
    const s=current.shots.find(s=>s.index===row.index);
    if(s)located('shot:'+row.index,'shot',s.start-origin,s.end-origin,row.index);
  }
  diff.cues.forEach((cue,i)=>{
    // Captions are output-relative. Removed captions need the old song origin,
    // never assume two pilots start at the same time.
    const offset=cue.status==='removed'?(Number.isFinite(before?.origin)?before.origin-origin:NaN):0;
    const start=cue.start+offset,end=cue.end+offset;
    located('cue:'+i,'cue',start,end);
    if(Number.isFinite(start)&&Number.isFinite(end)&&start<duration&&end>0)
      for(const s of current.shots)if(s.start<origin+Math.min(duration,end)&&s.end>origin+Math.max(0,start))changed.add(s.index);
  });
  targets.sort((a,b)=>a.at-b.at);return {targets,changedShots:[...changed]};
}
function nextDifference(targets,selected,direction){
  if(!targets.length)return null;
  const i=targets.findIndex(t=>t.id===selected);
  return targets[i<0?(direction<0?targets.length-1:0):(i+direction+targets.length)%targets.length];
}
function backupOf(state,operation){
  if(!['import','migrate','restore','issue-remove'].includes(operation))throw Error('无法识别的草稿备份操作。');
  return {operation,createdAt:new Date().toISOString(),record:validate(state,state.binding,state.shots.map(s=>s.index))};
}
function validBackup(value,binding,ids){
  if(!value||!['import','migrate','restore','issue-remove'].includes(value.operation)||typeof value.createdAt!=='string'||value.createdAt.length>100)throw Error('草稿备份格式不正确。');
  return {...value,record:validate(value.record,binding,ids)};
}
function replaceDraft(state,candidate,operation){
  return {current:validate(candidate,state.binding,state.shots.map(s=>s.index)),backup:backupOf(state,operation)};
}
function restoreDraft(state,backup){
  return replaceDraft(state,validBackup(backup,state.binding,state.shots.map(s=>s.index)).record,'restore');
}
function restoreEditor(editor,current){
  const empty={issueEdits:[],composer:{note:'',startFrame:null,endFrame:null}},warnings=[];
  if(editor===undefined)return empty;
  if(!editor||editor.binding!==current.binding||!Array.isArray(editor.issues)||editor.issues.length>1000)return {...empty,warning:'问题编辑草稿无效或版本不符，正式记录已保留。'};
  const byId=new Map((current.issues||[]).map(i=>[i.id,i])),seen=new Set();
  const fields=['id','kind','startFrame','endFrame','shotIndex','shotId','note','resolution','status'];
  for(const entry of editor.issues){
    const issue=byId.get(entry?.id),patch=entry?.patch;
    if(!issue||seen.has(entry.id)||!entry.base||fields.some(k=>entry.base[k]!==issue[k])||!patch||
      !['note','resolution'].every(k=>typeof patch[k]==='string'&&patch[k].length<=2000)||!['open','fixed','verified'].includes(patch.status)){
      warnings.push('部分问题编辑已失效，未覆盖正式记录。');continue;
    }
    seen.add(entry.id);
    if(['note','resolution','status'].some(k=>patch[k]!==issue[k]))empty.issueEdits.push({id:entry.id,base:clone(issue),patch:{note:patch.note,resolution:patch.resolution,status:patch.status}});
  }
  const c=editor.composer,frames=current.snapshot?.frames;
  if(c&&typeof c.note==='string'&&c.note.length<=2000&&
      (c.startFrame===null||(Number.isInteger(c.startFrame)&&c.startFrame>=0&&c.startFrame<frames))&&
      (c.endFrame===null||(Number.isInteger(c.endFrame)&&c.endFrame>0&&c.endFrame<=frames)))empty.composer={note:c.note,startFrame:c.startFrame,endFrame:c.endFrame};
  else warnings.push('新问题草稿无效，未恢复其时间范围。');
  return {...empty,...(warnings.length?{warning:[...new Set(warnings)].join(' ')}:{})};
}
function readDraft(value,binding,ids){
  // Upgrade legacy local records. Portable exports remain plain review JSON.
  if(value?.schema==='mv-kit-review')return {current:validate(value,binding,ids),backup:null};
  if(!value||value.schema!=='mv-kit-review-draft'||![1,2].includes(value.version))throw Error('本地草稿格式不正确。');
  const current=validate(value.current,binding,ids);
  let backup=null,warning='';try{backup=value.backup===null?null:validBackup(value.backup,binding,ids);}catch(e){warning='备份不可用，当前草稿已保留。';}
  const editor=restoreEditor(value.version===2?value.editor:undefined,current);
  return {current,backup,...editor,...((warning||editor.warning)?{warning:[warning,editor.warning].filter(Boolean).join(' ')}:{})};
}
function filteredIssues(state,query='',status='all',shotIndex=undefined){
  const needle=query.trim().toLocaleLowerCase();
  return (state.issues||[]).filter(i=>{
    if(status!=='all'&&i.status!==status)return false;
    const involved=affectedShots(state.snapshot,i);
    if(shotIndex!==undefined&&(shotIndex===null||!involved.includes(shotIndex)))return false;
    const names=state.snapshot.shots.filter(s=>involved.includes(s.index)).map(s=>`${s.name} ${s.scene} ${s.id||''}`).join(' ');
    return `${i.id} ${i.note} ${i.resolution} ${names}`.toLocaleLowerCase().includes(needle);
  });
}
function nextIssue(state,status,afterId){
  const sorted=[...(state.issues||[])].sort((a,b)=>a.startFrame-b.startFrame),start=sorted.findIndex(i=>i.id===afterId);
  for(let n=1;n<=sorted.length;n++){const issue=sorted[(start+n+sorted.length)%sorted.length];if(issue.status===status)return issue;}
  return null;
}
G.ReviewNotes={fresh,validate,compare,migrate,filtered,nextPending,activeShot,differenceNavigation,nextDifference,replaceDraft,restoreDraft,readDraft,addTimedIssue,updateTimedIssue,affectedShots,restoreEditor,filteredIssues,nextIssue};
if(typeof module!=='undefined')module.exports=G.ReviewNotes;
if(typeof document==='undefined')return;
const data=JSON.parse(document.getElementById('review-data').textContent),$=id=>document.getElementById(id),video=$('video');
const shots=data.shots.map((s,index)=>({...s,index})).filter(s=>s.from<data.origin+data.duration&&s.to>data.origin);
const ids=shots.map(s=>s.index),key='mv-kit-review:'+data.reviewBinding,labels={pending:'待复核',pass:'人工通过',changes:'需修改'};
let state=fresh(data.reviewBinding,ids,data.comparison),backup=null,page=0,live=null,lastPicked=null,history=null,storeAvailable=true;
let navigation={targets:[],changedShots:[]},selectedDifference=null,comparisonKnown=false;
let issueStart=null,issueEnd=null,issuePage=0,selectedIssue=null,issueScope=undefined,saveTimer=null,dirty=false;
const issueEdits=new Map(),issueLabels={open:'待处理',fixed:'已修改',verified:'已复核'};
const pageSize=20;
function message(text){$('reviewMessage').textContent=text+(storeAvailable?'':' 本地保存不可用，刷新前请导出当前记录及备份。');}
try{
  const saved=localStorage.getItem(key);
  if(saved){
    const loaded=readDraft(JSON.parse(saved),data.reviewBinding,ids);
    state=validate({...loaded.current,snapshot:clone(data.comparison)},data.reviewBinding,ids);backup=loaded.backup;
    // Check editor ranges again against this page's authoritative frame clock.
    const recovered=restoreEditor({binding:state.binding,issues:loaded.issueEdits||[],composer:loaded.composer||{note:'',startFrame:null,endFrame:null}},state);
    for(const e of recovered.issueEdits)issueEdits.set(e.id,{base:e.base,patch:e.patch});
    $('issueNote').value=recovered.composer.note;issueStart=recovered.composer.startFrame;issueEnd=recovered.composer.endFrame;
    if(loaded.warning||recovered.warning)message([loaded.warning,recovered.warning].filter(Boolean).join(' '));
    else if(issueEdits.size)message(`已恢复 ${issueEdits.size} 条尚未提交的问题编辑；正式状态未改变。`);
  }
  state.snapshot=clone(data.comparison);
}catch(e){storeAvailable=false;message('本地草稿不可用。');}
function visible(){return filtered(shots,state,$('shotSearch').value,$('shotFilter').value).filter(s=>!$('changedOnly').checked||navigation.changedShots.includes(s.index));}
function progress(){
  const counts={pending:0,pass:0,changes:0};state.shots.forEach(r=>counts[r.status]++);
  $('reviewProgress').textContent=`已复核 ${counts.pass+counts.changes}/${shots.length} · 通过 ${counts.pass} · 需修改 ${counts.changes} · 待复核 ${counts.pending}`;
  $('nextPending').disabled=!counts.pending;
  $('humanStatus').textContent=labels[state.overall.status];$('humanStatus').className='badge '+({pending:'warn',pass:'pass',changes:'fail'}[state.overall.status]);
}
function editorStatus(){
  const composer=$('issueNote').value||issueStart!==null||issueEnd!==null;
  $('issueDraftStatus').textContent=`尚未提交 ${issueEdits.size} 条问题编辑${composer?'，另有新问题草稿':''} · ${!storeAvailable?'本地保存失败，刷新前请保存条目并导出':dirty?'等待写入本地草稿':'已保存在本地草稿'}。正式问题状态不会自动改变。`;
}
function persistNow(){
  if(saveTimer!==null){clearTimeout(saveTimer);saveTimer=null;}
  if(!dirty)return;
  const editor={binding:state.binding,issues:[...issueEdits].map(([id,e])=>({id,base:e.base,patch:e.patch})),composer:{note:$('issueNote').value,startFrame:issueStart,endFrame:issueEnd}};
  // One atomic write includes formal state, backup and unsubmitted editor buffers.
  try{localStorage.setItem(key,JSON.stringify({schema:'mv-kit-review-draft',version:2,current:state,backup,editor}));storeAvailable=true;dirty=false;}
  catch(e){storeAvailable=false;message('当前草稿、备份和未提交编辑仅保存在本次页面内。');}
  $('storageNote').textContent=storeAvailable?'草稿、未提交编辑和一份操作前备份保存在此浏览器。正式交付请导出审片 JSON。':'浏览器未保存最新内容；请先保存问题处理，再导出当前记录及备份，刷新会丢失尚未落盘的编辑。';
  editorStatus();
}
function queueSave(){dirty=true;if(saveTimer===null)saveTimer=setTimeout(persistNow,250);editorStatus();}
function save(touch=true,delayed=false){
  if(touch)state.updatedAt=new Date().toISOString();
  dirty=true;if(delayed)queueSave();else persistNow();progress();
}
window.addEventListener('pagehide',persistNow);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistNow();});
document.addEventListener('focusout',e=>{if(e.target.closest?.('#reviewPanel')){persistNow();queueMicrotask(()=>updateLive());}});
function recoveryControls(){
  $('undoReview').disabled=$('exportBackup').disabled=!backup;
  $('undoReview').textContent=backup?.operation==='restore'?'恢复撤销前草稿':backup?.operation==='issue-remove'?'撤销移除问题':'撤销上次导入／迁移';
  $('backupInfo').textContent=backup?`已备份${{import:'导入',migrate:'迁移',restore:'恢复','issue-remove':'移除问题'}[backup.operation]}前草稿 · ${backup.createdAt}。恢复会替换当前草稿，并保留恢复前的状态。`:'尚无操作前备份。导入、迁移或移除问题成功前会自动备份；只保留最近一份。';
}
function requireSavedIssues(){if(issueEdits.size)throw Error('请先保存或放弃问题条目中尚未提交的编辑。');}
function applyDraft(next){requireSavedIssues();const current=validate({...next.current,snapshot:clone(data.comparison)},data.reviewBinding,ids);state=current;backup=next.backup;save(false);refresh();}
function select(value,change){const node=document.createElement('select');for(const status of states){const o=document.createElement('option');o.value=status;o.textContent=labels[status];node.append(o);}node.value=value;node.onchange=()=>change(node.value);return node;}
function referenceText(ref,row){return `历史参考 · ${ref.reviewer||'未署名'} · ${ref.binding.slice(0,12)}\n${row?row.note:ref.overallNote}`;}
function showReferences(){
  $('reviewReferences').replaceChildren();
  for(const ref of state.references||[]){
    if(ref.overallNote){const p=document.createElement('p');p.className='history-note';p.textContent=referenceText(ref);$('reviewReferences').append(p);}
    for(const row of ref.shots.filter(r=>r.currentIndex===null)){const p=document.createElement('p');p.className='history-note';p.textContent=`未匹配 · ${row.name}\n${referenceText(ref,row)}`;$('reviewReferences').append(p);}
    for(const i of ref.issues||[]){const p=document.createElement('p');p.className='history-note';p.textContent=`历史问题（仅供参考） · ${ref.reviewer||'未署名'} · ${ref.binding.slice(0,12)} · ${i.currentIndex===null?'未匹配':`关联当前镜头 ${i.currentIndex+1}`}\n旧版 ${(i.startFrame/ref.issueClock.fps).toFixed(3)}–${(i.endFrame/ref.issueClock.fps).toFixed(3)}s · ${issueLabels[i.status]}\n${i.note}\n处理说明：${i.resolution||'未填写'}`;$('reviewReferences').append(p);}
  }
}
function markLive(){for(const box of $('shotReviews').children)box.classList.toggle('is-playing',Number(box.dataset.index)===live);}
function cards(){
  const list=visible(),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.max(0,Math.min(page,pages-1));
  $('reviewPage').textContent=`${list.length} 个匹配镜头 · ${page+1}/${pages} 页`;$('previousReviewPage').disabled=page===0;$('nextReviewPage').disabled=page===pages-1;
  $('shotReviews').replaceChildren();
  if(!list.length){const p=document.createElement('p');p.textContent='没有符合筛选条件的镜头。';$('shotReviews').append(p);}
  const byIndex=new Map(state.shots.map(r=>[r.index,r]));
  for(const shot of list.slice(page*pageSize,(page+1)*pageSize)){
    const row=byIndex.get(shot.index),box=document.createElement('div');box.className='shot-review';box.dataset.index=String(shot.index);
    const title=document.createElement('button');title.type='button';title.textContent=`${shot.index+1}. ${shot.name||shot.scene}`;title.onclick=()=>choose(shot.index,true,true);
    const status=select(row.status,v=>{try{const next=clone(state);next.shots.find(s=>s.index===row.index).status=v;if(v!=='pass'&&next.overall.status==='pass')next.overall.status='pending';state=validate(next,data.reviewBinding,ids);save();$('overallStatus').value=state.overall.status;cards();}catch(e){status.value=row.status;message(e.message);}});
    status.setAttribute('aria-label',`镜头 ${shot.index+1} 审片状态`);status.dataset.shot=String(shot.index);
    const note=document.createElement('textarea');note.maxLength=2000;note.rows=2;note.value=row.note;note.placeholder='修改意见或复核说明';note.setAttribute('aria-label',`镜头 ${shot.index+1} 备注`);note.dataset.shot=String(shot.index);note.oninput=()=>{state.shots.find(s=>s.index===row.index).note=note.value;save(true,true);};
    box.append(title,status,note);
    for(const ref of state.references||[])for(const old of ref.shots.filter(r=>r.currentIndex===shot.index)){const p=document.createElement('p');p.className='history-note';p.textContent=referenceText(ref,old);box.append(p);}
    $('shotReviews').append(box);
  }markLive();progress();
}
function refresh(){
  $('reviewer').value=state.reviewer;$('overallNote').value=state.overall.note;$('overallStatus').value=state.overall.status;showReferences();cards();recoveryControls();issueCards();
}
function frameNow(){return Math.min(data.comparison.frames-1,Math.max(0,Math.floor(video.currentTime*data.fps+1e-7)));}
function issueRangeLabel(){
  $('issueRange').textContent=issueStart===null?'尚未标记区间。终点包含当前帧。':`起点 ${(issueStart/data.fps).toFixed(3)}s · ${issueEnd===null?'终点未标记':`终点 ${(issueEnd/data.fps).toFixed(3)}s（不含该帧）`}`;
  $('addRangeIssue').disabled=issueStart===null||issueEnd===null||issueEnd<=issueStart;
}
function recordIssue(kind){
  try{const start=kind==='point'?frameNow():issueStart,end=kind==='point'?start+1:issueEnd;
    state=addTimedIssue(state,'issue-'+crypto.randomUUID(),kind,start,end,$('issueNote').value);
    $('issueNote').value='';issueStart=issueEnd=null;issueRangeLabel();$('issueFilter').value='all';$('issueSearch').value='';$('currentShotIssues').checked=false;issuePage=Math.floor((state.issues.length-1)/20);selectedIssue=state.issues.at(-1).id;save();refresh();message('已记录问题；相关镜头需修改，处理完成后仍须人工复核。');
  }catch(e){message(e.message);}
}
function issueList(){return filteredIssues(state,$('issueSearch').value,$('issueFilter').value,$('currentShotIssues').checked?live:undefined);}
function issueScopeStatus(){
  $('issueScopeNote').textContent=!$('currentShotIssues').checked?'搜索正式问题、处理说明、问题 ID 和涉及镜头。':issueScope!==live?'当前镜头已变化，编辑结束后更新问题列表。':live===null?'当前是镜头间隙，没有可筛选的镜头。':`正在筛选镜头 ${live+1} 涉及的问题（含跨镜头区间）。`;
}
function focusIssue(issue){
  if(!issue)return;selectedIssue=issue.id;$('issueSearch').value='';$('issueFilter').value='all';$('currentShotIssues').checked=false;
  issuePage=Math.floor((state.issues||[]).findIndex(i=>i.id===issue.id)/20);
  if(issue.shotIndex!==null)choose(issue.shotIndex,false);
  video.pause();video.currentTime=issue.startFrame/data.fps;issueCards();
  const box=[...$('timedIssues').children].find(e=>e.dataset.issue===issue.id);
  if(box){box.scrollIntoView({block:'nearest'});box.querySelector('textarea').focus({preventScroll:true});}
  message(`已定位${issueLabels[issue.status]}问题${issue.shotIndex===null?'（起点位于镜头间隙）':''}；终点 ${(issue.endFrame/data.fps).toFixed(3)}s。未提交编辑保持原样。`);
}
function issueCards(){
  const items=state.issues||[],counts={open:0,fixed:0,verified:0};items.forEach(i=>counts[i.status]++);
  $('issueProgress').textContent=`问题 ${items.length} 条 · 待处理 ${counts.open} · 已修改 ${counts.fixed} · 已复核 ${counts.verified}`;
  $('nextOpenIssue').disabled=counts.open===0;$('nextFixedIssue').disabled=counts.fixed===0;
  const list=issueList(),pages=Math.max(1,Math.ceil(list.length/20));issuePage=Math.max(0,Math.min(issuePage,pages-1));issueScope=live;issueScopeStatus();
  $('issuePage').textContent=`${list.length} 条匹配 · ${issuePage+1}/${pages} 页`;$('previousIssuePage').disabled=issuePage===0;$('nextIssuePage').disabled=issuePage===pages-1;
  $('timedIssues').replaceChildren();
  if(!list.length){const empty=document.createElement('p');empty.className='note';empty.textContent='没有符合条件的问题。';$('timedIssues').append(empty);}
  for(const i of list.slice(issuePage*20,(issuePage+1)*20)){
    const box=document.createElement('div');box.className='timed-issue';box.dataset.issue=i.id;box.classList.toggle('is-selected',i.id===selectedIssue);
    const button=document.createElement('button');button.type='button';button.dataset.issueSeek=i.id;
    button.textContent=`${i.kind==='point'?'当前帧':'区间'} ${(i.startFrame/data.fps).toFixed(3)}–${(i.endFrame/data.fps).toFixed(3)}s · ${i.shotIndex===null?'镜头间隙':`镜头 ${i.shotIndex+1}`} · ${issueLabels[i.status]}`;
    button.onclick=()=>focusIssue(i);
    const draft=issueEdits.get(i.id)?.patch||i;
    const badge=document.createElement('p');badge.className='note';badge.textContent=issueEdits.has(i.id)?'有未提交编辑；正式状态仍为'+issueLabels[i.status]:'正式状态：'+issueLabels[i.status];
    const note=document.createElement('textarea');note.rows=2;note.maxLength=2000;note.value=draft.note;note.dataset.issueNote=i.id;note.setAttribute('aria-label','问题说明');
    const resolution=document.createElement('textarea');resolution.rows=2;resolution.maxLength=2000;resolution.value=draft.resolution;resolution.placeholder='填写修改内容或处理理由';resolution.dataset.issueResolution=i.id;resolution.setAttribute('aria-label','处理说明');
    const status=document.createElement('select');status.dataset.issueStatus=i.id;status.setAttribute('aria-label','问题处理状态');for(const k of Object.keys(issueLabels)){const o=document.createElement('option');o.value=k;o.textContent=issueLabels[k];status.append(o);}status.value=draft.status;
    const remember=()=>{const patch={note:note.value,resolution:resolution.value,status:status.value};if(Object.keys(patch).every(k=>patch[k]===i[k]))issueEdits.delete(i.id);else issueEdits.set(i.id,{base:clone(i),patch});badge.textContent=issueEdits.has(i.id)?'有未提交编辑；正式状态仍为'+issueLabels[i.status]:'正式状态：'+issueLabels[i.status];queueSave();};note.oninput=resolution.oninput=status.onchange=remember;
    const saveButton=document.createElement('button');saveButton.type='button';saveButton.textContent='保存问题处理';saveButton.dataset.issueSave=i.id;
    saveButton.onclick=()=>{try{state=updateTimedIssue(state,i.id,{note:note.value,resolution:resolution.value,status:status.value});issueEdits.delete(i.id);save();refresh();message('问题处理已保存；已修改不等于已复核，已复核也不会自动批准镜头。');}catch(e){message(e.message);}};
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='放弃未提交编辑';cancel.onclick=()=>{issueEdits.delete(i.id);save(false);issueCards();};
    const remove=document.createElement('button');remove.type='button';remove.textContent='移除问题';remove.dataset.issueRemove=i.id;
    remove.onclick=()=>{try{requireSavedIssues();const next=clone(state);next.issues=next.issues.filter(r=>r.id!==i.id);applyDraft(replaceDraft(state,next,'issue-remove'));message('问题已移除，操作前草稿已备份；镜头结论未自动改为通过。');}catch(e){message(e.message);}};
    const toolbar=document.createElement('div');toolbar.className='toolbar';toolbar.append(status,saveButton,cancel,remove);box.append(button,badge,note,resolution,toolbar);$('timedIssues').append(box);
  }
  editorStatus();
}
$('issueNote').oninput=queueSave;
$('discardNewIssue').onclick=()=>{$('issueNote').value='';issueStart=issueEnd=null;issueRangeLabel();save(false);};
$('markIssueStart').onclick=()=>{issueStart=frameNow();issueRangeLabel();queueSave();};
$('markIssueEnd').onclick=()=>{issueEnd=frameNow()+1;issueRangeLabel();queueSave();};
$('addPointIssue').onclick=()=>recordIssue('point');$('addRangeIssue').onclick=()=>recordIssue('range');
$('issueFilter').onchange=$('issueSearch').oninput=$('currentShotIssues').onchange=()=>{issuePage=0;issueCards();};
$('nextOpenIssue').onclick=()=>focusIssue(nextIssue(state,'open',selectedIssue));
$('nextFixedIssue').onclick=()=>focusIssue(nextIssue(state,'fixed',selectedIssue));
$('previousIssuePage').onclick=()=>{issuePage--;issueCards();};$('nextIssuePage').onclick=()=>{issuePage++;issueCards();};
issueRangeLabel();
function choose(index,seek,keepChanges=false){
  if(index===null)return;const shot=shots.find(s=>s.index===index);if(!shot)return;
  $('shotSearch').value='';$('shotFilter').value='all';if(!keepChanges||!navigation.changedShots.includes(index))$('changedOnly').checked=false;
  page=Math.floor(visible().findIndex(s=>s.index===index)/pageSize);lastPicked=index;
  if(seek){video.pause();video.currentTime=Math.min(Math.max(0,shot.from-data.origin),Math.max(0,data.duration-1/data.fps));}
  cards();const box=$('shotReviews').querySelector(`[data-index="${index}"]`);if(box)box.scrollIntoView({block:'nearest'});
}
function updateLive(force=false){
  const current=activeShot(shots,data.origin+video.currentTime);
  if(current!==live){live=current;lastPicked=current;const shot=shots.find(s=>s.index===live);$('playingShot').textContent=shot?`当前镜头：${shot.index+1}. ${shot.name||shot.scene}`:'当前处于镜头间隙';$('locateReview').disabled=current===null;markLive();}
  const editing=document.activeElement?.closest('#reviewPanel')&&document.activeElement.matches('textarea,select,input[type="text"],input[type="search"],input:not([type])');
  if(live!==null&&$('followReview').checked&&(force||!video.paused)&&!editing){const pos=visible().findIndex(s=>s.index===live);if(pos>=0&&Math.floor(pos/pageSize)!==page){page=Math.floor(pos/pageSize);cards();}}
  if($('currentShotIssues').checked&&issueScope!==live){if(!editing){issuePage=0;issueCards();}else issueScopeStatus();}
}
$('shotSearch').oninput=$('shotFilter').onchange=()=>{page=0;cards();};
$('changedOnly').onchange=()=>{page=0;cards();};
$('previousReviewPage').onclick=()=>{page--;cards();};$('nextReviewPage').onclick=()=>{page++;cards();};
$('nextPending').onclick=()=>{const index=nextPending(shots,state,lastPicked??live);choose(index,true);};
$('locateReview').onclick=()=>choose(live,false);$('followReview').onchange=()=>updateLive(true);
video.addEventListener('timeupdate',()=>updateLive());video.addEventListener('seeked',()=>updateLive(true));video.addEventListener('loadedmetadata',()=>updateLive(true));
if(video.requestVideoFrameCallback){const tick=()=>{updateLive();video.requestVideoFrameCallback(tick);};video.requestVideoFrameCallback(tick);}
$('reviewer').oninput=()=>{state.reviewer=$('reviewer').value;save(true,true);};$('overallNote').oninput=()=>{state.overall.note=$('overallNote').value;save(true,true);};
$('overallStatus').onchange=()=>{const candidate=clone(state);candidate.overall.status=$('overallStatus').value;try{state=validate(candidate,data.reviewBinding,ids);save();message('整体结论已更新；自动 QA 结果保留。');}catch(e){$('overallStatus').value=state.overall.status;message(e.message);}};
function downloadRecord(record,prefix){const value=validate(record,data.reviewBinding,ids),blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=prefix+data.reviewBinding.slice(0,12)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('exportReview').onclick=()=>{try{requireSavedIssues();downloadRecord(state,'review-record-');message('审片记录已导出。');}catch(e){message(e.message);}};
$('exportBackup').onclick=()=>{try{downloadRecord(validBackup(backup,data.reviewBinding,ids).record,'review-backup-');message('操作前备份已导出，可用普通导入恢复到同版本页面。');}catch(e){message(e.message);}};
$('undoReview').onclick=()=>{try{applyDraft(restoreDraft(state,backup));message('已恢复备份草稿；恢复前的状态已保留，可再次恢复或导出。');}catch(e){message(e.message);}};
async function fileValue(input){const file=input.files[0];if(!file)return null;if(file.size>10_000_000)throw Error('审片记录过大。');return JSON.parse(await file.text());}
$('importReview').onchange=async()=>{try{const value=await fileValue($('importReview'));if(!value)return;applyDraft(replaceDraft(state,value,'import'));message('已导入当前版本的审片记录，操作前草稿已备份，可撤销。');}catch(e){message(e.message);}finally{$('importReview').value='';}};
const diffLabels={same:'未变化',changed:'变化',added:'新增',removed:'移除',ambiguous:'匹配不唯一'};
function differenceControls(){
  $('changedOnly').disabled=!comparisonKnown;
  $('previousDifference').disabled=$('nextDifference').disabled=!navigation.targets.length;
  const i=navigation.targets.findIndex(t=>t.id===selectedDifference);
  $('differencePosition').textContent=!comparisonKnown?'先比较一个带差异摘要的历史版本。':i<0?`${navigation.targets.length} 处可定位变化 · ${navigation.changedShots.length} 个涉及镜头`:`变化 ${i+1}/${navigation.targets.length} · ${navigation.targets[i].label}`;
  for(const button of $('versionDiff').querySelectorAll('[data-difference]')){
    const selected=button.dataset.difference===selectedDifference;button.classList.toggle('is-selected',selected);button.setAttribute('aria-current',String(selected));
  }
}
function goDifference(target){
  if(!target)return;selectedDifference=target.id;
  if(target.index!==null)choose(target.index,false,true);
  video.pause();video.currentTime=target.at;differenceControls();
  if(target.index===null)message('变化已定位到当前镜头间隙，没有对应的逐镜备注。');
}
$('previousDifference').onclick=()=>goDifference(nextDifference(navigation.targets,selectedDifference,-1));
$('nextDifference').onclick=()=>goDifference(nextDifference(navigation.targets,selectedDifference,1));
function showDiff(diff,old){
  $('versionDiff').replaceChildren();const add=text=>{const p=document.createElement('p');p.textContent=text;$('versionDiff').append(p);};
  navigation=differenceNavigation(diff,old.snapshot,data.comparison);selectedDifference=null;comparisonKnown=!diff.legacy;
  const linked=(id,text)=>{const target=navigation.targets.find(t=>t.id===id);if(!target){add(text+'（当前范围内无可确认位置）');return;}
    target.label=text;const button=document.createElement('button');button.type='button';button.dataset.difference=id;button.textContent=text;button.onclick=()=>goDifference(target);$('versionDiff').append(button);};
  add(`历史版本 ${old.binding.slice(0,12)} · ${old.reviewer||'未署名'}`);
  if(diff.legacy){add('旧记录没有差异指纹，无法确认镜头、音轨和字幕变化。备注将作为未匹配参考保留，不按序号迁入。');differenceControls();return;}
  add(`整段画面${diff.pictureChanged?'有变化':'未变化'}；最终混音${diff.mixChanged?'有变化':'未变化'}。`);
  for(const row of diff.shots.filter(r=>r.status!=='same'))linked('shot:'+row.index,`镜头 ${row.index+1} ${row.name}：${diffLabels[row.status]}${row.changes.length?'（'+row.changes.join('、')+'）':''}`);
  for(const row of diff.removed)add(`历史镜头 ${row.name}：${diffLabels[row.status]}（无唯一对应的当前镜头，不自动定位）`);
  if(diff.shots.every(r=>r.status==='same')&&!diff.removed.length)add('镜头画面和时间范围未变化。');
  for(const row of diff.tracks.filter(r=>r.status!=='same'))add(`音轨 ${row.id}：${diffLabels[row.status]}（整轨差异，未定位到具体时间）`);
  if(diff.tracks.every(r=>r.status==='same'))add('各音轨未变化。');
  diff.cues.forEach((cue,i)=>linked('cue:'+i,`字幕 ${diffLabels[cue.status]} · ${cue.start.toFixed(3)}–${cue.end.toFixed(3)}s${cue.status==='removed'?'（旧版时间，定位到当前歌曲位置）':''}：${cue.text}`));
  if(!diff.cues.length)add('字幕未变化。');
  if(!diff.pictureChanged&&!diff.mixChanged&&!diff.cues.length&&diff.shots.every(r=>r.status==='same')&&diff.tracks.every(r=>r.status==='same')&&old.binding!==state.binding)add('完整版本仍不同，可能涉及回执或其他依赖；不能沿用旧通过结论。');
  differenceControls();
}
$('compareReview').onchange=async()=>{history=null;navigation={targets:[],changedShots:[]};comparisonKnown=false;selectedDifference=null;$('changedOnly').checked=false;$('migrateReview').disabled=true;$('versionDiff').replaceChildren();differenceControls();page=0;cards();try{const value=await fileValue($('compareReview'));if(!value)return;history=readHistory(value);showDiff(compare(history,data.comparison),history);$('migrateReview').disabled=history.binding===state.binding;message('已比较历史版本，可定位变化。迁入只添加参考，并将所有结论重置为待复核。');}catch(e){history=null;message(e.message);}finally{$('compareReview').value='';}};
$('migrateReview').onclick=()=>{try{applyDraft(replaceDraft(state,migrate(state,history,data.comparison),'migrate'));$('migrateReview').disabled=true;message('历史备注已迁入参考；当前备注保留，全部结论已重置为待复核。操作前草稿已备份，可撤销。');}catch(e){message(e.message);}};
refresh();updateLive();differenceControls();if(storeAvailable)$('storageNote').textContent='正式草稿、未提交编辑和一份操作前备份保存在此浏览器。交付请导出正式审片 JSON。';
})(typeof globalThis!=='undefined'?globalThis:this);
