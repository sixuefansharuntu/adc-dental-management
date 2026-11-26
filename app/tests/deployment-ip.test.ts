import test from 'node:test';
import assert from 'node:assert/strict';
import {deployConfig} from '../deploy/runtime.mjs';
import {proxyPolicy} from '../apps/api/src/proxy-policy';
import {readFile} from 'node:fs/promises';

const valid={NODE_ENV:'production',ADC_LOCAL_IDENTITY_ENABLED:'false',ADC_MINIPROGRAM_LOCAL_ENABLED:'false',PUBLIC_HOST:'101.33.215.169',ADMIN_ORIGIN:'https://101.33.215.169',PGHOST:'postgres',PGPORT:'5432',PGDATABASE:'adc_course_demo',PGUSER:'adc_runtime',PGPASSWORD_FILE:'/run/secrets/db_runtime_password',ADC_TRUSTED_PROXY_IP:'172.30.44.2',ADC_COURSE_DEMO_ENABLED:'true',ADC_DEPLOYMENT_PURPOSE:'teacher-demo',ADC_COURSE_DEMO_MANIFEST_FILE:'/run/secrets/course_demo_manifest'};
const secret=async()=> 'x'.repeat(48);
test('课程IP HTTPS可用于运行和显式初始化，仍使用独立数据库及文件secret',async()=>{
 assert.equal((await deployConfig(valid,'runtime',secret)).user,'adc_runtime');
 assert.equal((await deployConfig({...valid,PGUSER:'postgres',PGPASSWORD_FILE:'/run/secrets/db_owner_password'},'migration',secret)).database,'adc_course_demo');
});
test('普通生产不能借课程IP入口放开，课程入口拒绝HTTP或错源',async()=>{
 await assert.rejects(deployConfig({...valid,PUBLIC_HOST:'adc.school.test\n',ADMIN_ORIGIN:'https://adc.school.test\n'},'runtime',secret));
 for(const patch of [{ADC_COURSE_DEMO_ENABLED:'false',ADC_DEPLOYMENT_PURPOSE:'standard',PGDATABASE:'adc_server'},{ADC_DEPLOYMENT_PURPOSE:'standard'},{ADMIN_ORIGIN:'http://101.33.215.169'},{ADMIN_ORIGIN:'https://101.33.215.169:443'},{ADMIN_ORIGIN:'https://101.33.215.170'},{PGDATABASE:'adc_dev'},{PGUSER:'postgres'},{ADC_LOCAL_IDENTITY_ENABLED:'true'}])await assert.rejects(deployConfig({...valid,...patch},'runtime',secret));
});
test('课程地址拒绝内网保留地址、非规范IP、IPv6和注入字符',async()=>{
 for(const host of ['0.0.0.0','10.0.0.1','127.0.0.1','100.64.1.1','169.254.1.1','172.16.0.1','192.168.1.1','192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','101.033.215.169','1696716713','[::1]','101.33.215.169:443','101.33.215.169/path','101.33.215.169\n','${PUBLIC_HOST}','example.com'])await assert.rejects(deployConfig({...valid,PUBLIC_HOST:host,ADMIN_ORIGIN:'https://'+host},'runtime',secret),host);
});
test('IP HTTPS代理仍核对单一原客户端、准确Host和HTTPS，不信伪造或链式头',()=>{
 const p=proxyPolicy(valid),req=(headers:any)=>({socket:{remoteAddress:'172.30.44.2'},headers}as any),headers={'x-forwarded-for':'8.8.8.8','x-forwarded-proto':'https','x-forwarded-host':'101.33.215.169'};
 p.validate(req(headers));
 for(const patch of [{'x-forwarded-host':'101.33.215.170'},{'x-forwarded-host':'101.33.215.169:443'},{'x-forwarded-proto':'http'},{'x-forwarded-for':'8.8.8.8, 1.1.1.1'},{forwarded:'for=8.8.8.8'}])assert.throws(()=>p.validate(req({...headers,...patch})));
});
test('API和网页固定地址分离，避免API先启动占用可信网页代理地址',async()=>{
 for(const file of ['compose.teacher.json','compose.production.json']){
  const j=JSON.parse(await readFile(new URL('../deploy/'+file,import.meta.url),'utf8'));
  assert.equal(j.services.api.networks.frontend.ipv4_address,'172.30.44.3');
  assert.equal(j.services.web.networks.frontend.ipv4_address,j.services.api.environment.ADC_TRUSTED_PROXY_IP);
  assert.notEqual(j.services.api.networks.frontend.ipv4_address,j.services.web.networks.frontend.ipv4_address);
 }
});
