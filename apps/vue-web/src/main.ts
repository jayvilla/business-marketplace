import { createApp } from 'vue';
import App from './app/App.vue';
import { createAppRouter } from './app/router';
import './styles/tokens.css';
import './styles/base.css';

/**
 * Composition root. `createApp` returns an instance that is not mounted yet,
 * so the router can be installed before the first render. `app.use(router)`
 * makes `RouterLink`, `RouterView`, and `useRouter()` available.
 *
 * The mount target is the empty element in `index.html`. Vue fills that
 * element. It does not replace the element itself.
 */
const app = createApp(App);
app.use(createAppRouter());
app.mount('#root');
