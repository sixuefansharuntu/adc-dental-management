import test from 'node:test';import assert from 'node:assert/strict';import {readFile}from'node:fs/promises';
import {deployConfig} from '../deploy/runtime.mjs';
import {provisionRuntime} from '../deploy/migrate.mjs';
const valid={NODE_ENV:'production',ADC_LOCAL_IDENTITY_ENABLED:'false',ADC_MINIPROGRAM_LOCAL_ENABLED:'false',PUBLIC_HOST:'adc.school.test',ADMIN_ORIGIN:'https://adc.school.test',PGHOST:'postgres',PGPORT:'5432',PGDATABASE:'adc_server',PGUSER:'adc_runtime',PGPASSWORD_FILE:'/run/secrets/db_runtime_password',ADC_TRUSTED_PROXY_IP:'172.30.44.2'};
const secret=async()=> 'x'.repeat(48);
test('已有高权限或角色继承不能被采纳为运行账号',async()=>{
 for(const role of [{rolsuper:true,rolcanlogin:true},{rolcreatedb:true,rolcanlogin:true},{rolcreaterole:true,rolcanlogin:true},{rolcanlogin:false},{rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolcanlogin:true}]){
  const queries:string[]=[];const client={query:async(sql:string)=>{queries.push(sql);return {rows:queries.length===1?[role]:[{member:1}]};}};
  await assert.rejects(provisionRuntime(client,'x'.repeat(48)));assert.equal(queries.some(q=>q.startsWith('GRANT')||q.startsWith('CREATE')),false);
 }
});
test('服务器运行仅采用非管理员岗位与文件口令',async()=>{const c=await deployConfig(valid,'runtime',secret);assert.equal(c.user,'adc_runtime');assert.equal(c.database,'adc_server');assert.equal(c.password,'x'.repeat(48));});
test('服务器配置拒本机开发库及部署身份绕过',async()=>{for(const patch of [{PGHOST:'127.0.0.1'},{PGDATABASE:'adc_dev'},{NODE_ENV:'development'},{ADC_LOCAL_IDENTITY_ENABLED:'true'},{ADC_MINIPROGRAM_LOCAL_ENABLED:'true'},{PGUSER:'postgres'},{PGPASSWORD:'x'.repeat(48)}])await assert.rejects(deployConfig({...valid,...patch},'runtime',secret));});
test('部署拒HTTP、错源、占位域名、异常文件路径及坏密钥',async()=>{for(const patch of [{ADMIN_ORIGIN:'http://adc.school.test'},{ADMIN_ORIGIN:'https://other.school.test'},{PUBLIC_HOST:'adc.example.com',ADMIN_ORIGIN:'https://adc.example.com'},{PUBLIC_HOST:'bad/name'},{PGPASSWORD_FILE:'.env'}])await assert.rejects(deployConfig({...valid,...patch},'runtime',secret));await assert.rejects(deployConfig(valid,'runtime',async()=> 'short'));await assert.rejects(deployConfig(valid,'runtime',async()=>{throw Error('private');}),/无法读取/);});
test('迁移岗位与运行岗位使用不同secret入口',async()=>{const c=await deployConfig({...valid,PGUSER:'postgres',PGPASSWORD_FILE:'/run/secrets/db_owner_password'},'migration',secret);assert.equal(c.user,'postgres');await assert.rejects(deployConfig(valid,'migration',secret));});
test('服务编排不发布数据库和API，密钥不交给网页，迁移需显式运行',async()=>{const j=JSON.parse(await readFile(new URL('../deploy/compose.production.json',import.meta.url),'utf8'));assert.equal(j.services.postgres.ports,undefined);assert.equal(j.services.api.ports,undefined);assert.equal(j.services.web.secrets,undefined);assert.deepEqual(j.services.migrate.profiles,['tools']);assert.equal(j.networks.database.internal,true);assert.equal(j.services.web.depends_on.api.condition,'service_healthy');assert.ok(j.services.api.volumes.includes('private_files:/data/private-files'));});
