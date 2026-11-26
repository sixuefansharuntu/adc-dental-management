import{BadRequestException,ConflictException}from'@nestjs/common';import{fixed,decimal}from'./clinical-domain';
const MAX=999999999999999999n;
export function qty(value:unknown,positive=false){const n=fixed(value);if(positive&&n<=0n)throw new BadRequestException('实际数量须大于零。');return n;}
export function deltaQty(value:string){return value.startsWith('-')?-qty(value.slice(1)):qty(value);}
export function signed(n:bigint){if(n>MAX||n< -MAX)throw new ConflictException('数量或差异超出可保存范围，请复核来源。');return(n<0n?'-':'')+decimal(n<0n?-n:n,4);}
export function balance(value:bigint){if(value<0n)throw new ConflictException('库存不足，不能形成负库存。');return signed(value);}
export function countDifference(q0:bigint,m:bigint,c:bigint,a:bigint){return{comparable:q0+m,difference:c-q0-m,delta:c-q0-m-a};}
export function stockWarnings(total:bigint,expires:string|null,today:string,threshold:bigint|null,through:string|null){return{lowQuantity:threshold!==null&&total<threshold,expiryState:!through?'not_selected':!expires?'missing':expires<today?'expired':expires<=through?'near':'outside_range'};}
