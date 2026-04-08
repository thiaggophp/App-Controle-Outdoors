export function generatePassword(len=8){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr=new Uint8Array(len);crypto.getRandomValues(arr);
  return Array.from(arr).map(b=>chars[b%chars.length]).join("");
}
export async function sendPasswordEmail(toName,toEmail,tempPassword){
  const res=await fetch("https://mail.financascasa.online/send-password",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({to_name:toName,to_email:toEmail,temp_password:tempPassword,app_name:"OutdoorControle"})});
  if(!res.ok)throw new Error("Falha ao enviar e-mail: "+res.status);
  return true;
}
