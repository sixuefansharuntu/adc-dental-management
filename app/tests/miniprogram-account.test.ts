import test from 'node:test';
import assert from 'node:assert/strict';
import { miniprogramPage, simulateMiniCloud } from './helpers/miniprogram-page';

function setup(mode: string, api?: unknown) {
 const { cloud, calls } = simulateMiniCloud();
 const wx = { cloud, getRandomValues({ success }: any) { success({ randomValues: new Uint8Array(16).fill(7).buffer }); } };
 const page = miniprogramPage(wx, undefined, { page: 'account', globalData: { miniBookingApi: api } });
 page.onLoad({ mode });
 return { page, calls };
}

test('小程序按课程注册开关展示表单，断线后只重试同一个注册请求', async () => {
 const { page, calls } = setup('register');
 const showing = page.onShow();
 calls[0].reply({ patientRegistrationEnabled: true });
 await showing;
 assert.equal(page.data.allowed, true);
 page.setData({ loginName: 'sample_user', name: '合成患者', contact: '13800000021', password: 'Demo1234', confirmation: 'Demo1234' });
 await page.submit();
 assert.equal(calls.length, 1);
 page.consent({ detail: { value: ['yes'] } });
 const submitting = page.submit();
 await new Promise(resolve => setImmediate(resolve));
 assert.equal(calls[1].options.path, '/register');
 assert.equal(calls[1].options.token, '');
 calls[1].fail();
 await submitting;
 assert.equal(page.data.unknown, true);
 assert.equal(page.data.password, '');
 const retry = page.submit();
 assert.deepEqual(calls[2].options, calls[1].options);
 calls[2].reply({ registered: true, loginName: 'sample_user', repeated: true }, 201);
 await retry;
 assert.match(page.data.notice, /注册成功/);
});

test('小程序改密先核实本人，确认不一致时不提交，成功后提示重新登录', async () => {
 const submissions: unknown[] = [];
 const { page, calls } = setup('password', { session: async () => ({ subjectId: 'patient' }), changePassword: async (body: unknown) => submissions.push(body) });
 const showing = page.onShow();
 calls[0].reply({ experience: 'teacher-demo' });
 await showing;
 page.setData({ oldPassword: 'Before12', password: 'After123', confirmation: 'Wrong123' });
 await page.submit();
 assert.equal(submissions.length, 0);
 page.setData({ confirmation: 'After123' });
 await page.submit();
 assert.deepEqual(submissions, [{ oldPassword: 'Before12', newPassword: 'After123' }]);
 assert.match(page.data.notice, /重新登录/);
 assert.equal(page.data.oldPassword, '');
});

test('注册规则实时逐项更新，修正密码后再次核对确认，提交仅提示不合规字段', async () => {
 const {page,calls}=setup('register');
 const showing=page.onShow();calls[0].reply({patientRegistrationEnabled:true});await showing;
 const input=(field:string,value:string)=>page.input({currentTarget:{dataset:{field}},detail:{value}});
 assert.equal(page.data.rules.length,3);assert.equal(page.data.showRuleStatus,false);
 input('password','Abc');assert.deepEqual(page.data.rules.map((rule:any)=>rule.met),[false,true,false]);
 input('password','Abcd1234!');assert.ok(page.data.rules.every((rule:any)=>rule.met));
 input('confirmation','Abcd1234!');assert.match(page.data.confirmationStatus,/密码一致/);
 input('password','Abcd1235!');assert.match(page.data.confirmationStatus,/不一致/);
 await page.submit();assert.deepEqual(Object.keys(page.data.fieldErrors),['loginName','confirmation','name','contact','syntheticOnly']);
 assert.equal(page.data.focusField,'loginName');assert.equal(calls.length,1);
});
