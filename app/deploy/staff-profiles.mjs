// Catalog v1: explicit initial account ceilings; never applied to existing accounts.
const fields=(resource,names)=>names.map(field=>({resource,field,action:'maintain'}));
const health=['patient.directory.read','patient.health.read','patient.health.manage'];
export const staffProfiles={
 frontdesk:{name:'前台',functions:['appointment.read','appointment.manage','schedule.manage','patient.identity','patient.create','visit.read','visit.manage','bill.read','receipt.create','patient.profile.read','patient.profile.manage',...health,'business.daily.read'],fields:[...fields('appointment',['arrangement','contact']),...fields('schedule',['arrangement']),...fields('visit',['arrived_at','started_at','ended_at','left_at','arrangement']),...fields('receipt',['payment']),...fields('patient',['identity','source','contact','health','tags'])]},
 doctor:{name:'医生',functions:['clinical.read','clinical.write','bill.read','bill.manage',...health],fields:[...fields('clinical',['body','treatments']),...fields('bill',['lines']),...fields('patient',['health','tags'])]},
 nurse:{name:'护士',functions:['clinical.read','bill.read','bill.manage',...health],fields:[...fields('bill',['lines']),...fields('patient',['health','tags'])]},
 clinic_manager:{name:'诊所管理人员',functions:['clinic.read','clinic.manage','dentist.read','dentist.manage','dentist.qualification.read','dentist.qualification.manage','followup.plan.read','followup.plan.manage'],fields:[...fields('clinic',['identity','booking_rule']),...fields('dentist',['profile','skills','public','practice','qualification']),...fields('followup_plan',['config'])]}
};
for(const p of Object.values(staffProfiles)){p.functions.sort();p.fields.sort((a,b)=>(a.resource+':'+a.field).localeCompare(b.resource+':'+b.field,'en'));Object.freeze(p.functions);p.fields.forEach(Object.freeze);Object.freeze(p.fields);Object.freeze(p);}Object.freeze(staffProfiles);
