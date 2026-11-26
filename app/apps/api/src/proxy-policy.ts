import {isIP} from 'node:net';
import {BadRequestException} from '@nestjs/common';
import type {Request} from 'express';
export function canonicalIp(value:string):string {
 const kind=isIP(value);if(kind===4)return value;if(kind!==6)throw Error('客户端地址无效。');
 let ip:string;try{ip=new URL('http://['+value+']/').hostname.slice(1,-1);}catch{throw Error('客户端地址无效。');}
 const mapped=/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(ip);
 if(mapped){const a=parseInt(mapped[1]!,16),b=parseInt(mapped[2]!,16);return [a>>8,a&255,b>>8,b&255].join('.');}return ip;
}
export function proxyPolicy(env:NodeJS.ProcessEnv=process.env){
 const raw=env.ADC_TRUSTED_PROXY_IP;
 if(!raw)return {trust:()=>false,validate:(_req:Request)=>{}};
 if(env.NODE_ENV!=='production'||raw!==raw.trim()||!isIP(raw)||['0.0.0.0','::'].includes(canonicalIp(raw)))throw Error('代理仅允许生产模式下一个明确IP地址。');
 const trusted=canonicalIp(raw),origin=env.ADMIN_ORIGIN;
 if(!origin||!origin.startsWith('https://')||new URL(origin).origin!==origin)throw Error('代理须配置明确的HTTPS源。');
 const host=new URL(origin).host;
 const trust=(address:string,hop=0)=>{try{return hop===0&&canonicalIp(address)===trusted;}catch{return false;}};
 const validate=(req:Request)=>{
  if(!trust(req.socket.remoteAddress||''))return;
  const ip=req.headers['x-forwarded-for'];
  try{if(typeof ip!=='string'||ip!==ip.trim())throw Error();canonicalIp(ip);}catch{throw new BadRequestException('受信代理必须提供单一有效客户端地址。');}
  if(req.headers['x-forwarded-proto']!=='https'||req.headers['x-forwarded-host']!==host||req.headers.forwarded!==undefined)throw new BadRequestException('受信代理的来源信息不符。');
 };
 return {trust,validate};
}
