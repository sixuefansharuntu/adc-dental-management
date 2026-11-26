const {createReceiptStore}=require('../../lib/receipt-store');
const { createPatientApi, requestId } = require('../../lib/patient-api');
const { createCloudPlatform } = require('../../lib/cloud-platform');
const { createBookingPage } = require('../../lib/booking-page');
const app = getApp();
if(!app.globalData.miniReceiptStore)app.globalData.miniReceiptStore=createReceiptStore(wx,()=>app.globalData.apiBaseUrl);
if (!app.globalData.miniBookingApi) app.globalData.miniBookingApi = createPatientApi(createCloudPlatform(wx), () => app.globalData.apiBaseUrl, {journal:app.globalData.miniReceiptStore});
if (!app.globalData.miniBookingState) app.globalData.miniBookingState = { pending: null };
Page(createBookingPage({ api: app.globalData.miniBookingApi, state: app.globalData.miniBookingState,
  enabled: () => app.globalData.localBookingEnabled === true, newRequestId: () => requestId(wx),
  takePreview() {
    const preview = app.globalData.miniBookingPreview;
    app.globalData.miniBookingPreview = null;
    return preview;
  } }));
