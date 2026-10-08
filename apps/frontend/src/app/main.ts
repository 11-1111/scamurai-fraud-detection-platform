import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { registerDI } from "./di";
import "../style.css";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

const app = createApp(App);

registerDI(app);
app.use(router);

app.mount("#app");
