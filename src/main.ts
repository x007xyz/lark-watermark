import { createApp } from 'vue'
import ArcoVue from '@arco-design/web-vue';
import App from './App.vue';
import '@arco-design/web-vue/dist/arco.css';
import { i18n } from "./locales/i18n";

const app = createApp(App);
app.use(ArcoVue);
app.use(i18n);
app.mount('#app');