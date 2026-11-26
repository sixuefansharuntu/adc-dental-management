const {createPatientApi}=require('../../lib/patient-api');
const {createCloudPlatform}=require('../../lib/cloud-platform');
const {createReceiptStore}=require('../../lib/receipt-store');
const {createRecoveryPage}=require('../../lib/recovery-page');
const app=getApp();
if(!app.globalData.miniReceiptStore)app.globalData.miniReceiptStore=createReceiptStore(wx,()=>app.globalData.apiBaseUrl);
if(!app.globalData.miniBookingApi)app.globalData.miniBookingApi=createPatientApi(createCloudPlatform(wx),()=>app.globalData.apiBaseUrl,{journal:app.globalData.miniReceiptStore});
Page(createRecoveryPage({api:app.globalData.miniBookingApi,journal:app.globalData.miniReceiptStore,enabled:()=>app.globalData.localBookingEnabled===true,onRetired:r=>{const s=app.globalData.miniBookingState;if(s&&s.pending&&s.pending.subjectId===r.subjectId&&s.pending.body.requestId===r.requestId&&s.pending.kind===r.kind){s.pending=null;if(r.kind==='reschedule')s.reschedule=null;}}}));
