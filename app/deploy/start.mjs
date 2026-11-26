import {deployConfig,deploymentReady} from './runtime.mjs';
try{
 const options=await deployConfig(process.env);
 if(process.env.ADC_FILE_ROOT!=='/data/private-files')throw Error('私有附件目录必须使用专属持久卷。');
 await deploymentReady(options,process.env.ADC_FILE_ROOT);
 process.env.PGPASSWORD=options.password;
 await import('../apps/api/dist/main.js');
}catch{console.error('部署启动预检失败：请检查域名、secret、数据库迁移、运行角色和私有文件卷。');process.exitCode=1;}
