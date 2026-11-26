import {BadRequestException} from '@nestjs/common';
export function fixed(value:unknown,scale=4,positive=false):bigint {
 if(typeof value!=='string'||!new RegExp(`^(0|[1-9][0-9]{0,${17-scale}})(\\.[0-9]{1,${scale}})?$`).test(value))throw new BadRequestException('数量或金额须为规定精度的非负十进制文本。');
 const [a,b='']=value.split('.');const n=BigInt(a!)*10n**BigInt(scale)+BigInt(b.padEnd(scale,'0'));if(positive&&n<=0n)throw new BadRequestException('计费数量须大于零。');return n;
}
export function decimal(n:bigint,scale:number){const b=10n**BigInt(scale);return `${n/b}.${String(n%b).padStart(scale,'0')}`;}
export function lineCents(quantity:string,unitPrice:string){return (fixed(quantity,4,true)*fixed(unitPrice)+500000n)/1000000n;}
export function totalAmount(lines:{quantity:string;unitPrice:string}[]){const n=lines.reduce((a,l)=>a+lineCents(l.quantity,l.unitPrice),0n);if(n>999999999999999999n)throw new BadRequestException('账单总额超出可保存范围。');return decimal(n,2);}
export function quarterStart(s:string){const d=new Date(Date.parse(s)+8*3600000);return `${d.getUTCFullYear()}-${String(Math.floor(d.getUTCMonth()/3)*3+1).padStart(2,'0')}-01T00:00:00+08:00`;}
