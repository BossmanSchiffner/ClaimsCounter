export const ROOMS = ['Kitchen','Living Room','Dining Room','Bedroom','Bathroom','Basement','Garage','Laundry','Office','Storage','Other'];
export const STATUSES = ['In Progress','Ready for Review','Completed'];
export const uuid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const xml = value => String(value ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[x]));
export const prettyDate = value => value ? new Date(value).toLocaleString('en-CA',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : 'Never';
export const filenameSafe = value => (String(value||'Claim').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,55)||'Claim');
export const isPositiveInt = v => Number.isInteger(Number(v)) && Number(v)>=1 && Number(v)<=99999;
export const itemIssues = (item, photoCount) => {
 const reasons=[];
 if(!String(item.description||'').trim())reasons.push('Missing description');
 if(!isPositiveInt(item.quantity))reasons.push('Invalid quantity');
 if(!photoCount)reasons.push('No photos');
 if(item.needsReview)reasons.push('Flagged for review');
 return reasons;
};
export const summary = (items, photos) => {
 const counts={};for(const p of photos)counts[p.itemId]=(counts[p.itemId]||0)+1;
 const issues=items.map(i=>({item:i,reasons:itemIssues(i,counts[i.id]||0)})).filter(o=>o.reasons.length);
 return {entries:items.length, units:items.reduce((t,i)=>t+Number(i.quantity||0),0), photos:photos.length, rooms:new Set(items.map(i=>i.room)).size,flagged:items.filter(i=>i.needsReview).length,missingPhotos:items.filter(i=>!counts[i.id]).length,issues};
};
export const defaultDraft = (claim,source) => ({claimId:claim.id,description:source?.description||'',quantity:source?.quantity||1,room:source?.room||claim.lastRoom||'Kitchen',needsReview:source?.needsReview||false,noPhoto:source?.noPhoto||false,photos:[],removedIds:[],isDuplicate:!!source});
export const extension = (mime,filename='') => {
 const type=String(mime).toLowerCase();if(type.includes('png'))return 'png';if(type.includes('heic'))return 'heic';if(type.includes('heif'))return 'heif';if(type.includes('webp'))return 'webp';if(type.includes('gif'))return 'gif';const ext=filename.toLowerCase().split('.').pop();return ['jpg','jpeg','png','heic','heif','webp','gif'].includes(ext)?ext:'jpg';
};
export const fileFor = (item,photo,n) => `photos/item_${String(item.itemNumber||0).padStart(5,'0')}_${item.id.slice(0,8)}/photo_${String(n+1).padStart(3,'0')}_${photo.id.slice(0,8)}.${extension(photo.mime,photo.name)}`;
export function validateDraft(d){if(!String(d.description||'').trim())throw new Error('Enter an item description first.');if(!isPositiveInt(d.quantity))throw new Error('Quantity must be a whole number from 1 to 99,999.');if(!d.photos.length&&!d.noPhoto)throw new Error('Attach at least one photo, or select “No photo available”.')}
