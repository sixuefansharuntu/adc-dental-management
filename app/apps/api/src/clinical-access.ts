import{ForbiddenException}from'@nestjs/common';import type{PoolClient}from'pg';import type{AuthService,StaffActor}from'./auth.service';
export async function clinicalAccess(c:PoolClient,auth:AuthService,a:StaffActor,clinic:string){
 const can=async(fn:string,resource?:string,fields:string[]=[])=>{try{await auth.assertAccess(c,a,fn,clinic,resource,fields);return true;}catch(e){if(e instanceof ForbiddenException)return false;throw e;}};
 const clinicalRead=await can('clinical.read'),billRead=await can('bill.read'),settlement=billRead&&await can('receipt.create'),priceRead=await can('price.manage');
 return{clinicalRead,billRead,settlement,collect:settlement&&await can('receipt.create','receipt',['payment']),priceRead,
  clinicalWrite:clinicalRead&&await can('clinical.write','clinical',['body','treatments']),
  billManage:billRead&&await can('bill.manage','bill',['lines']),priceManage:priceRead&&await can('price.manage','price',['amount'])};
}
export function clinicalObjectAccess(scope:Awaited<ReturnType<typeof clinicalAccess>>,participant:boolean,doctor:boolean){
 const canClinical=scope.clinicalRead&&participant,canBill=scope.billRead&&(scope.settlement||canClinical);
 return{canClinical,canBill,canWrite:canClinical&&doctor&&scope.clinicalWrite,canManageBill:canBill&&participant&&scope.billManage,canCollect:canBill&&scope.collect};
}
