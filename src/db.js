import {uuid,now,defaultDraft,STATUSES} from './core.js';
const NAME='FieldCountDatabase',VERSION=2;
let db;
const storeNames=['claims','items','photos','drafts','meta'];
function complete(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Storage transaction failed.'));tx.onerror=()=>{};});}
const result=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
function txFor(stores,mode='readonly'){if(!db)throw Error('Storage is not initialized.');return db.transaction(stores,mode);}
export async function openDB(){if(!('indexedDB'in globalThis))throw Error('IndexedDB is unavailable in this browser.');db=await new Promise((resolve,reject)=>{const req=indexedDB.open(NAME,VERSION);req.onupgradeneeded=()=>{const d=req.result;
 if(!d.objectStoreNames.contains('claims'))d.createObjectStore('claims',{keyPath:'id'});
 if(!d.objectStoreNames.contains('items')){const items=d.createObjectStore('items',{keyPath:'id'});items.createIndex('claimId','claimId');}
 if(!d.objectStoreNames.contains('drafts'))d.createObjectStore('drafts',{keyPath:'claimId'});
 if(!d.objectStoreNames.contains('photos')){const photos=d.createObjectStore('photos',{keyPath:'id'});photos.createIndex('claimId','claimId');photos.createIndex('itemId','itemId');}
 if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'key'});
 };req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Close other open FieldCount tabs and reload.'));});
 db.onversionchange=()=>db.close();await migrateLegacy();return db;
}
export function getOne(store,key){return result(txFor(store).objectStore(store).get(key));}
export function getAll(store){return result(txFor(store).objectStore(store).getAll());}
export function byIndex(store,index,key){return result(txFor(store).objectStore(store).index(index).getAll(key));}
export const claims=()=>getAll('claims');
export const itemsFor=async id=>(await byIndex('items','claimId',id)).sort((a,b)=>Number(a.itemNumber||0)-Number(b.itemNumber||0)||String(a.createdAt).localeCompare(String(b.createdAt)));
export const photosFor=async id=>(await byIndex('photos','claimId',id)).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
export const photoForItem=async id=>(await byIndex('photos','itemId',id)).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
export async function write(store,record){const tx=txFor(store,'readwrite'),done=complete(tx);tx.objectStore(store).put(record);await done;return record;}
export async function setMeta(key,value){await write('meta',{key,value});}
export async function touchClaim(claimId,patch={}){const c=await getOne('claims',claimId);if(!c)throw Error('Claim not found.');return write('claims',{...c,...patch,updatedAt:now()});}
export async function addClaim({title,reference}){const c={id:uuid(),title:String(title).trim(),reference:String(reference||'').trim(),status:'In Progress',lastRoom:'Kitchen',createdAt:now(),updatedAt:now(),nextItemNumber:1};await write('claims',c);return c;}
export async function getDraft(claim){const d=await getOne('drafts',claim.id);return d||defaultDraft(claim);}
export async function writeDraft(draft){await write('drafts',{...draft,claimId:draft.claimId});}
export async function clearDraft(claimId){const tx=txFor('drafts','readwrite'),done=complete(tx);tx.objectStore('drafts').delete(claimId);await done;}
export async function saveItemAtomic({claimId,draft,editingId=null}){const old=editingId?await getOne('items',editingId):null;if(editingId&&!old)throw Error('Original item no longer exists.');const c=await getOne('claims',claimId);if(!c)throw Error('Claim not found.');if(c.status==='Completed')throw Error('Reopen the completed claim before changing items.');const time=now();const id=old?.id||uuid();const latest=old?.photoIds||[];const incoming=draft.photos.map(p=>p.id);const deleted=latest.filter(p=>!incoming.includes(p));const number=old?.itemNumber||Math.max(1,Number(c.nextItemNumber)||1);
 const item={id,claimId,itemNumber:number,description:String(draft.description||'').trim(),quantity:Number(draft.quantity),room:draft.room,needsReview:!!draft.needsReview,noPhoto:!!draft.noPhoto,photoIds:incoming,createdAt:old?.createdAt||time,updatedAt:time};
 const tx=txFor(['claims','items','photos','drafts'],'readwrite'),done=complete(tx),photoStore=tx.objectStore('photos');
 for(const p of draft.photos){photoStore.put({id:p.id,itemId:id,claimId,blob:p.blob,thumb:p.thumb||null,mime:p.mime||p.blob?.type||'image/jpeg',name:p.name||'photo',createdAt:p.createdAt||time});}
 for(const pid of deleted)photoStore.delete(pid);
 tx.objectStore('items').put(item);
 tx.objectStore('claims').put({...c,updatedAt:time,lastRoom:draft.room,nextItemNumber:old?(Number(c.nextItemNumber)||number+1):number+1});
 if(!editingId)tx.objectStore('drafts').delete(claimId);
 await done;return item;
}
export async function deleteItemAtomic(item){const c=await getOne('claims',item.claimId);if(!c)throw Error('Claim not found.');if(c.status==='Completed')throw Error('Reopen the claim before deleting items.');const tx=txFor(['claims','items','photos'],'readwrite'),done=complete(tx);tx.objectStore('items').delete(item.id);for(const pid of item.photoIds||[])tx.objectStore('photos').delete(pid);tx.objectStore('claims').put({...c,updatedAt:now()});await done;}
export async function restoreAllAtomic(payload){const tx=txFor(storeNames,'readwrite'),done=complete(tx);for(const name of storeNames)tx.objectStore(name).clear();for(const c of payload.claims)tx.objectStore('claims').put(c);for(const i of payload.items)tx.objectStore('items').put(i);for(const p of payload.photos)tx.objectStore('photos').put(p);for(const d of payload.drafts||[])tx.objectStore('drafts').put(d);await done;}
async function migrateLegacy(){const older=await getAll('items'),oldDrafts=await getAll('drafts'),allClaims=await claims();const changes=older.filter(i=>i.photo||!i.photoIds||!i.itemNumber),dChanges=oldDrafts.filter(d=>d.photo||!Array.isArray(d.photos));const fixClaims=allClaims.some(c=>!c.nextItemNumber||!STATUSES.includes(c.status));if(!changes.length&&!dChanges.length&&!fixClaims)return;
 const sorted=[...older].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),next=new Map();for(const i of sorted){if(i.itemNumber)next.set(i.claimId,Math.max(next.get(i.claimId)||1,i.itemNumber+1));else {i.itemNumber=next.get(i.claimId)||1;next.set(i.claimId,i.itemNumber+1)}}
 const tx=txFor(['items','photos','drafts','claims'],'readwrite'),done=complete(tx),ps=tx.objectStore('photos');
 for(const i of sorted){const legacy=i.photo;const updated={...i,photoIds:Array.isArray(i.photoIds)?i.photoIds:[]};if(legacy){const id=uuid();ps.put({id,itemId:i.id,claimId:i.claimId,blob:legacy,thumb:i.thumb||null,mime:i.photoType||legacy.type||'image/jpeg',name:i.photoName||'legacy_photo',createdAt:i.createdAt||now()});updated.photoIds.push(id)}delete updated.photo;delete updated.thumb;delete updated.photoType;delete updated.photoName;if(legacy||!i.photoIds||!i.itemNumber)tx.objectStore('items').put(updated)}
 for(const d of dChanges){const photos=Array.isArray(d.photos)?d.photos:[];if(d.photo)photos.push({id:uuid(),blob:d.photo,thumb:d.thumb||null,mime:d.photoType||d.photo.type,name:d.photoName||'draft_photo',createdAt:now()});const clean={...d,photos,removedIds:[],needsReview:!!d.needsReview};delete clean.photo;delete clean.thumb;delete clean.photoType;delete clean.photoName;tx.objectStore('drafts').put(clean)}
 for(const c of allClaims)if(!c.nextItemNumber||!STATUSES.includes(c.status))tx.objectStore('claims').put({...c,nextItemNumber:Math.max(next.get(c.id)||1,c.nextItemNumber||1),status:STATUSES.includes(c.status)?c.status:'In Progress'});
 await done;
}
