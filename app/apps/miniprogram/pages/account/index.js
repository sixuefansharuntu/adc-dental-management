const { createAccountPage } = require('../../lib/account-page');
const { createCloudPlatform } = require('../../lib/cloud-platform');
const { createPublicGet } = require('../../lib/public-request');
const { createPatientApi, requestId } = require('../../lib/patient-api');
const { createReceiptStore } = require('../../lib/receipt-store');

const app = getApp();
const baseUrl = () => app.globalData.apiBaseUrl;
const platform = createCloudPlatform(wx);
if (!app.globalData.miniReceiptStore) app.globalData.miniReceiptStore = createReceiptStore(wx, baseUrl);
if (!app.globalData.miniBookingApi) app.globalData.miniBookingApi = createPatientApi(platform, baseUrl, { journal: app.globalData.miniReceiptStore });
const read = createPublicGet(platform, baseUrl);
Page(createAccountPage({
  api: app.globalData.miniBookingApi,
  catalogue: () => read('/catalogue'),
  newRequestId: () => requestId(wx),
}));
