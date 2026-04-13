import PocketBase from"pocketbase";
const PB_URL=import.meta.env.VITE_PB_URL||"https://api.financascasa.online";
export const pb=new PocketBase(PB_URL);

// ─── ACCOUNTS ───
export async function getAccount(email){try{return await pb.collection("outdoor_accounts").getFirstListItem(`email="${email}"`)}catch{return null}}
export async function getAllAccounts(){try{return await pb.collection("outdoor_accounts").getFullList()}catch{return[]}}
export async function saveAccount(acc){
  const existing=await pb.collection("outdoor_accounts").getFirstListItem(`email="${acc.email}"`).catch(()=>null);
  if(existing)return pb.collection("outdoor_accounts").update(existing.id,acc);
  return pb.collection("outdoor_accounts").create(acc);
}
export async function deleteAccount(email){try{const r=await pb.collection("outdoor_accounts").getFirstListItem(`email="${email}"`);await pb.collection("outdoor_accounts").delete(r.id)}catch{}}

// ─── SIGNUP REQUESTS ───
export async function getSignupRequests(){try{return await pb.collection("outdoor_signup_requests").getFullList()}catch{return[]}}
export async function addSignupRequest(req){
  const existing=await pb.collection("outdoor_signup_requests").getFirstListItem(`email="${req.email}"`).catch(()=>null);
  if(existing)return;
  await pb.collection("outdoor_signup_requests").create(req);
}
export async function deleteSignupRequest(email){try{const r=await pb.collection("outdoor_signup_requests").getFirstListItem(`email="${email}"`);await pb.collection("outdoor_signup_requests").delete(r.id)}catch{}}

// ─── PONTOS ───
export async function getPontos(ownerEmail){try{return await pb.collection("outdoor_pontos").getFullList({filter:`ownerEmail="${ownerEmail}"`})}catch{return[]}}
export async function savePonto(p){
  if(p.id)return pb.collection("outdoor_pontos").update(p.id,p);
  const c=await pb.collection("outdoor_pontos").create(p);p.id=c.id;return c;
}
export async function deletePonto(id){try{await pb.collection("outdoor_pontos").delete(id)}catch{}}

// ─── CONTRATOS ───
export async function getContratos(ownerEmail){try{return await pb.collection("outdoor_contratos").getFullList({filter:`ownerEmail="${ownerEmail}"`})}catch{return[]}}
export async function getContratosByPonto(pontoId){try{return await pb.collection("outdoor_contratos").getFullList({filter:`pontoId="${pontoId}"`})}catch{return[]}}
export async function saveContrato(c){
  if(c.id)return pb.collection("outdoor_contratos").update(c.id,c);
  const r=await pb.collection("outdoor_contratos").create(c);c.id=r.id;return r;
}
export async function deleteContrato(id){try{await pb.collection("outdoor_contratos").delete(id)}catch{}}

// ─── PAGAMENTOS ───
export async function getPagamentos(ownerEmail){try{return await pb.collection("outdoor_pagamentos").getFullList({filter:`ownerEmail="${ownerEmail}"`})}catch{return[]}}
export async function getPagamentosByContrato(contratoId){try{return await pb.collection("outdoor_pagamentos").getFullList({filter:`contratoId="${contratoId}"`})}catch{return[]}}
export async function savePagamento(p){
  if(p.id)return pb.collection("outdoor_pagamentos").update(p.id,p);
  const c=await pb.collection("outdoor_pagamentos").create(p);p.id=c.id;return c;
}
export async function deletePagamento(id){try{await pb.collection("outdoor_pagamentos").delete(id)}catch{}}

// ─── BACKUP ───
export async function exportAllData(ownerEmail){
  const pontos=await getPontos(ownerEmail);
  const contratos=await getContratos(ownerEmail);
  const pagamentos=await getPagamentos(ownerEmail);
  return{appName:"OutdoorControle",version:1,exportDate:new Date().toISOString(),ownerEmail,pontos,contratos,pagamentos};
}
export async function importAllData(data){
  const pontoIdMap={},contratoIdMap={};
  for(const p of data.pontos||[]){const oldId=p.id;p.id=null;const c=await savePonto(p);if(oldId)pontoIdMap[oldId]=c.id;}
  for(const c of data.contratos||[]){
    if(c.pontoId&&pontoIdMap[c.pontoId])c.pontoId=pontoIdMap[c.pontoId];
    const oldId=c.id;c.id=null;const cr=await saveContrato(c);if(oldId)contratoIdMap[oldId]=cr.id;
  }
  for(const p of data.pagamentos||[]){
    if(p.contratoId&&contratoIdMap[p.contratoId])p.contratoId=contratoIdMap[p.contratoId];
    p.id=null;await savePagamento(p);
  }
}

// ─── CASCADE DELETE ───
export async function deleteContratoCascade(contratoId){
  const pagamentos=await getPagamentosByContrato(contratoId);
  for(const p of pagamentos)await deletePagamento(p.id);
  await deleteContrato(contratoId);
}
export async function deletePontoCascade(pontoId){
  const contratos=await getContratosByPonto(pontoId);
  for(const c of contratos)await deleteContratoCascade(c.id);
  await deletePonto(pontoId);
}
export async function deleteUserCascade(email){
  try{
    const pontos=await getPontos(email);
    for(const p of pontos)await deletePontoCascade(p.id);
    await deleteAccount(email);
  }catch{}
}

// ─── INIT ADMIN ───
export async function initAdmin(){
  // Admin account is created once via API — no credentials compiled into the bundle
}
