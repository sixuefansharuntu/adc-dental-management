import { createApp } from 'vue';
import App from './BookingApp.vue';
import Probe from './App.vue';
import './style.css';
import './readability.css';
import './booking.css';
import './booking-fixes.css';
import './frontdesk.css';
import './clinical.css';
import './care.css';
createApp(new URLSearchParams(location.search).get('view')==='probe'?Probe:App).mount('#app');

import './followup.css';
import './inventory.css';

import './sales.css';

import './quarter.css';
import './web-responsive.css';
import './patient-web.css';
