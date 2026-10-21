import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
const fail=()=>{throw Object.assign(Error('Randevu taslağı geçersiz veya süresi dolmuş. Yeniden hazırlayın.'),{statusCode:409})};
export function signAssistantDraft(payload,secret,now=Date.now()){
 if(!secret||secret.length<32)throw Object.assign(Error('Asistan onay anahtarı yapılandırılmadı.'),{statusCode:503});
 const data=Buffer.from(JSON.stringify({...payload,draftId:randomUUID(),expiresAt:now+10*60*1000})).toString('base64url');
 return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');
}
export function verifyAssistantDraft(token,secret,uid,now=Date.now()){
 if(!secret||secret.length<32)throw Object.assign(Error('Asistan yapılandırılmadı.'),{statusCode:503});
 if(typeof token!=='string'||token.length>6000)fail();const [data,sig,...extra]=token.split('.');if(!data||!sig||extra.length)fail();
 const expected=createHmac('sha256',secret).update(data).digest(),received=Buffer.from(sig,'base64url');if(expected.length!==received.length||!timingSafeEqual(expected,received))fail();
 let result;try{result=JSON.parse(Buffer.from(data,'base64url').toString('utf8'))}catch{fail()}
 if(result.uid!==uid||!Number.isFinite(result.expiresAt)||result.expiresAt<=now||!/^[-a-f0-9]{36}$/.test(result.draftId||''))fail();return result;
}
export async function reserveAssistantQuota(db,uid,now=Date.now()){
 for(const [key,period,limit] of [[createHmac('sha256','assistant-quota').update(uid).digest('hex'),3600000,20],['project',86400000,200]]){
  const ref=db.ref('assistant_limits/'+key);
  await ref.transaction(current=>current||{start:now,count:0});
  const result=await ref.transaction(current=>{const value=current&&now-current.start<period?current:{start:now,count:0};if(value.count>=limit)return;return{start:value.start,count:value.count+1}});
  if(!result.committed)throw Object.assign(Error('Asistan kullanım sınırına ulaşıldı. Normal randevu ekranından devam edebilirsiniz.'),{statusCode:429});
 }
}
