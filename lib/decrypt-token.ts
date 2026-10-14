export async function decryptTursoToken(config:Record<string,string>):Promise<string>{
  if(config.TURSO_AUTH_TOKEN)return config.TURSO_AUTH_TOKEN;
  if(!config.TURSO_AUTH_TOKEN_ENCRYPTED||!config.TURSO_TOKEN_WRAP_KEY)throw Error('Database configuration missing');
  if(!/^[a-f0-9]{64}$/i.test(config.TURSO_TOKEN_WRAP_KEY))throw Error('Invalid secret configuration');
  const payload=JSON.parse(config.TURSO_AUTH_TOKEN_ENCRYPTED);
  const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const bytes=Uint8Array.from(config.TURSO_TOKEN_WRAP_KEY.match(/../g)!,s=>parseInt(s,16));
  const key=await crypto.subtle.importKey('raw',bytes.buffer,{name:'AES-GCM'},false,['decrypt']);
  const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(payload.nonce)},key,decode(payload.data));
  return new TextDecoder().decode(plaintext);
}
