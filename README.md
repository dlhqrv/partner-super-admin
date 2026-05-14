# Super admin (EddyConnect)

Internal panel that talks to the **same** `p-Back` API as the partner app.

## Dev

1. Start API: `cd p-Back && npm run dev` (port **4000**).
2. Apply DB migration `p-Back/sql/FIX_admin_panel.sql` and run `cd p-Back && npm run seed:admin` (set `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `p-Back/.env`).
3. `npm install && npm run dev` — Vite serves on **http://localhost:5174** and proxies `/admin` to **p-Back** (default `http://127.0.0.1:4000`).

**If you see `ECONNREFUSED` or “Cannot reach the API”:** start the API in another terminal (`cd p-Back && npm run dev`). Optional: copy `super-admin/.env.example` to `super-admin/.env` and set `VITE_API_PROXY_TARGET` if your API is not on port 4000.

Production: set `VITE_API_URL` to your API origin (no proxy); ensure `CORS_ORIGIN` on the server lists the admin UI origin.

## Routes

| Path | Guard | Purpose |
| --- | --- | --- |
| `/` | — | Redirects to `/dashboard` if signed in, else `/login` |
| `/login` | guest only | Sign-in form (signed-in users are sent to `/dashboard`) |
| `/dashboard` | auth required | VS Code–style shell: left sidebar + overview |
| `*` | — | Redirects to `/` |

Sign out lives in the **sidebar footer** and opens a **confirm** dialog before calling `/admin/auth/logout` and returning to `/login`.

On **desktop**, use the **chevron** in the sidebar header to **collapse** the bar to a narrow icon rail (52px); state is saved in `localStorage` (`eddyconnect.admin.sidebarCollapsed`). On **mobile**, the menu button still opens the full-width drawer; the chevron in the drawer header closes it.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
