import assert from'node:assert/strict';import test from'node:test';import{identitySearchQuery,patientClinicRelation}from'../apps/api/src/frontdesk-identity-domain';
const clinicId='11111111-1111-4111-8111-111111111111';
test('身份检索默认两个目录和20项，线索去空白',()=>{assert.deepEqual(identitySearchQuery({clinicId,q:'  患者  '}),{clinicId,query:'患者',kind:'all',limit:20,cursor:null});});
test('身份检索严格限制线索与未知键',()=>{for(const q of['','a','a\nb','x'.repeat(101),['患者','其他']])assert.throws(()=>identitySearchQuery({clinicId,q}));assert.throws(()=>identitySearchQuery({clinicId,q:'患者',other:'x'}));});
test('两身份目录续页必须明确类别',()=>{assert.throws(()=>identitySearchQuery({clinicId,q:'患者',cursor:'x'}));assert.equal(identitySearchQuery({clinicId,q:'患者',kind:'patients',cursor:'x'}).kind,'patients');assert.throws(()=>identitySearchQuery({clinicId,q:'患者',kind:'clinical'}));});
test('身份检索不允许非法页数或多值条件',()=>{for(const limit of['0','51','1e1',['1','2']])assert.throws(()=>identitySearchQuery({clinicId,q:'患者',limit}));assert.equal(identitySearchQuery({clinicId,q:'患者',limit:'50'}).limit,50);});
test('选档边界使用建档/预约/就诊关联和参数化诊所集合',()=>{const sql=patientClinicRelation();for(const word of['created_clinic_id','adc.visit','adc.appointment','ANY($2::uuid[])'])assert.ok(sql.includes(word));assert.equal(sql.includes('patient_booking_subject'),false);});
