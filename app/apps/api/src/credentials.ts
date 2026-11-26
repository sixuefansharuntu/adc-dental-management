import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {BadRequestException} from '@nestjs/common';
const derive=promisify(scrypt);
export function newPatientPassword(value:unknown){if(typeof value!=='string'||value.length<8||value.length>128||/[\u0000-\u001f]/.test(value)||!/[a-z]/i.test(value)||!/[0-9]/.test(value))throw new BadRequestException('密码须为8—128位，包含字母和数字。');return value;}
export async function credentialHash(password:string){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${(await derive(password,salt,64) as Buffer).toString('hex')}`;}
export async function credentialMatches(password:string,stored:string){const[kind,salt,digest]=stored.split(':');if(kind!=='scrypt'||!salt||!digest||!/^[a-f0-9]{128}$/.test(digest))return false;return timingSafeEqual(await derive(password,salt,64) as Buffer,Buffer.from(digest,'hex'));}
