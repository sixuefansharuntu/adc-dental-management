const {createReceiptStore}=require('../../lib/receipt-store');
const {createPatientApi,requestId}=require('../../lib/patient-api');
const {createCloudPlatform}=require('../../lib/cloud-platform');
const {createAppointmentsPage}=require('../../lib/appointments-page');
const app=getApp();
if(!app.globalData.miniReceiptStore)app.globalData.miniReceiptStore=createReceiptStore(wx,()=>app.globalData.apiBaseUrl);
if(!app.globalData.miniBookingApi)app.globalData.miniBookingApi=createPatientApi(createCloudPlatform(wx),()=>app.globalData.apiBaseUrl,{journal:app.globalData.miniReceiptStore});
if(!app.globalData.miniBookingState)app.globalData.miniBookingState={pending:null};
Page(createAppointmentsPage({
 api:app.globalData.miniBookingApi,
 state:app.globalData.miniBookingState,
 enabled:()=>app.globalData.localBookingEnabled===true,
 newRequestId:()=>requestId(wx),
 navigate(url){
  if(url==='/pages/index/index')wx.switchTab({url});
  else wx.navigateTo({url});
 },
 revealCancel:()=>wx.pageScrollTo({selector:'#cancel-appointment',duration:180}),
}));
