const { createPublicGet } = require('../../lib/public-request');
const { createCloudPlatform } = require('../../lib/cloud-platform');
const { createPublicPage } = require('../../lib/public-page');
Page(createPublicPage({
  request: createPublicGet(createCloudPlatform(wx), () => getApp().globalData.apiBaseUrl),
  today: () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
  stopRefresh: () => wx.stopPullDownRefresh(),
  scrollToBooking: () => wx.pageScrollTo({ selector: '#booking', duration: 250 }),
  bookingEnabled: () => getApp().globalData.localBookingEnabled === true,
  changeMode: () => !!(getApp().globalData.miniBookingState || {}).reschedule,
  resetChange: () => { const s = getApp().globalData.miniBookingState; if (s && (!s.pending || s.pending.phase === 'saved')) s.reschedule = null; },
  navigate(url, preview) {
    const data = getApp().globalData;
    const state = data.miniBookingState;
    if (state && state.pending && state.pending.kind === 'cancel' && state.pending.phase !== 'saved') url = '/pages/appointments/index';
    else if (state && state.pending && state.pending.phase === 'saved') state.pending = null;
    data.miniBookingPreview = url.startsWith('/pages/booking/index?') ? preview : null;
    if (url === '/pages/appointments/index') wx.switchTab({ url });
    else wx.navigateTo({ url });
  }
}));

