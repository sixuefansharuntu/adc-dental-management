import test from'node:test';import assert from'node:assert/strict';import{resolve}from'node:path';
import{backupId,assetName,ownedChild,quoteIdentifier,literal,localBackupEnvironment,backupManifest,canonicalSchemaSql}from'../scripts/backup-domain.mjs';
const id='backup-20261028T010000000Z-1234abcd',hash='a'.repeat(64),manifest=()=>({format:'adc-local-backup-v1',stage:'complete',id,server:{major:17,encoding:'UTF8',localeProvider:'c',collate:'C',ctype:'C'},dump:{size:10,sha256:hash},schemaSha256:hash,tables:{'adc.patient':{rows:2,sha256:hash}},assets:[{key:'sample.bin',size:2,sha256:hash}],migrations:[{name:'022_patient_management.sql',sha256:hash}]});
test('备份ID只接受固定本机格式，拒绝绝对路径与穿越',()=>{assert.equal(backupId(id),id);for(const x of['../'+id,'C:/outside',id+'/manifest.json','adc_restore_test_123',id+';drop',''])assert.throws(()=>backupId(x));});
test('附件存储名为独立文件，拒绝斜杠/反斜杠/父级/盘符',()=>{assert.equal(assetName('abcd-1234.bin'),'abcd-1234.bin');for(const x of['../x','..','x/y','x\\y','C:x','x..y','/x',''])assert.throws(()=>assetName(x));});
test('恢复辅助目录只能是指定父目录内子路径',()=>{const base=resolve('owned');assert.equal(ownedChild(base,'child'),resolve(base,'child'));for(const name of['..','../outside',base])assert.throws(()=>ownedChild(base,name));});
test('数据库名称与本机连接严格校验，不能接受外部主机',()=>{localBackupEnvironment({PGHOST:'127.0.0.1',PGPORT:'54329',PGDATABASE:'adc_demo'});for(const e of[{PGHOST:'example.com',PGPORT:54329,PGDATABASE:'adc_demo'},{PGHOST:'127.0.0.1',PGPORT:0,PGDATABASE:'adc_demo'},{PGHOST:'127.0.0.1',PGPORT:54329,PGDATABASE:'x;drop'}])assert.throws(()=>localBackupEnvironment(e));});
test('数据库标识和语言参数分别按SQL标识符与文字转义',()=>{assert.equal(quoteIdentifier('a"b'),'"a""b"');assert.equal(literal("a'b"),"'a''b'");});
test('完整清单须版本、结构、表、迁移及附件全部可核对',()=>{const m=manifest();assert.equal(backupManifest(m,id),m);for(const change of[{stage:'pending'},{id:id.replace('abcd','ffff')},{format:'other'},{schemaSha256:'bad'},{dump:{size:0,sha256:hash}}])assert.throws(()=>backupManifest({...m,...change},id));});
test('清单拒损坏表行数/摘要及特殊注入表名',()=>{for(const tables of[{}, {'adc.patient':{rows:-1,sha256:hash}},{'adc.patient':{rows:1.5,sha256:hash}},{'adc.patient':{rows:1,sha256:'x'}},{'adc.patient;drop':{rows:1,sha256:hash}}])assert.throws(()=>backupManifest({...manifest(),tables},id));});
test('附件完整清单拒重复、超安全整数、假摘要和越界文件名',()=>{const m=manifest();for(const assets of[[m.assets[0],m.assets[0]],[{key:'x',size:Number.MAX_SAFE_INTEGER+1,sha256:hash}],[{key:'x',size:2,sha256:'bad'}],[{key:'../x',size:2,sha256:hash}]])assert.throws(()=>backupManifest({...m,assets},id));});
test('仅接受已验证PG17 UTF8本机语言环境，拒伪称跨版本恢复',()=>{for(const server of[{...manifest().server,major:18},{...manifest().server,encoding:'LATIN1'},{...manifest().server,localeProvider:'i'}])assert.throws(()=>backupManifest({...manifest(),server},id));});
test('迁移清单路径和摘要不可缺失，空附件目录合法',()=>{const m=manifest();assert.ok(backupManifest({...m,assets:[]},id));for(const migrations of[[{name:'../022.sql',sha256:hash}],[{name:'022_patient_management.sql',sha256:'bad'}]])assert.throws(()=>backupManifest({...m,migrations},id));});
test('PG常量varchar数组整体转text与逐项转text的恢复表示等价',()=>{
 const a="CHECK (state::text = ANY (ARRAY['active'::character varying, 'can''t'::character varying]::text[]))",b="CHECK (state::text = ANY (ARRAY['active'::character varying::text, 'can''t'::character varying::text]))";
 assert.equal(canonicalSchemaSql(a),canonicalSchemaSql(b));
 const c="WHERE ((state)::text = ANY ((ARRAY['active'::character varying, 'arrived'::character varying])::text[]))",d="WHERE ((state)::text = ANY (ARRAY[('active'::character varying)::text, ('arrived'::character varying)::text]))";assert.equal(canonicalSchemaSql(c),canonicalSchemaSql(d));
});
test('规范化不抹掉不同状态值、运算符、类型或计算成员',()=>{
 const a="CHECK (state::text = ANY (ARRAY['active'::character varying]::text[]))";for(const b of[a.replace('active','cancelled'),a.replace('= ANY','<> ALL'),a.replace('::text[]','::varchar[]'),a.replace("'active'::character varying",'danger()')])assert.notEqual(canonicalSchemaSql(a),canonicalSchemaSql(b));
 assert.notEqual(canonicalSchemaSql("CHECK (x > 0)"),canonicalSchemaSql("CHECK (x >= 0)"));assert.notEqual(canonicalSchemaSql("CHECK(x='a b')"),canonicalSchemaSql("CHECK(x='ab')"));
});
