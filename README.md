# Barraca KITOLAS — Sistema de Gestão de Stock

## 🔥 Passo 1 — Criar projecto Firebase

1. Aceda a https://console.firebase.google.com
2. Clique em **"Add project"**
3. Nome: `kitolas-stock`
4. Desactive Google Analytics (não é necessário)
5. Clique **"Create project"**

## 🔐 Passo 2 — Activar Authentication

1. No menu lateral → **Authentication → Get started**
2. Clique **"Email/Password"** → **Enable** → Save
3. Vá a **Users → Add user**
4. Crie a sua conta de admin: email + palavra-passe

## 🗄️ Passo 3 — Criar Firestore

1. No menu lateral → **Firestore Database → Create database**
2. Seleccione **"Start in production mode"**
3. Escolha localização: `eur3 (europe-west)` ou `nam5`
4. Clique **"Enable"**

## 👤 Passo 4 — Criar o seu utilizador admin no Firestore

1. Vá a **Firestore → Start collection** → ID: `users`
2. Document ID: **cole o UID do seu utilizador** (Authentication → Users → copie o User UID)
3. Adicione os campos:
   - `email` (string): o seu email
   - `nome` (string): o seu nome
   - `role` (string): `admin`

## 🔒 Passo 5 — Aplicar regras de segurança

1. No Firestore → aba **"Rules"**
2. Apague tudo e cole o conteúdo do ficheiro `firestore.rules`
3. Clique **"Publish"**

## ⚙️ Passo 6 — Obter credenciais

1. No Firebase Console → ⚙️ **Project settings**
2. Em "Your apps" → clique **"</> Web"**
3. Dê o nome `kitolas-web` → clique **"Register app"**
4. Copie o objecto `firebaseConfig`

## 📝 Passo 7 — Configurar o projecto

Abra o ficheiro `src/firebase.js` e substitua:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",           // ← cole aqui
  authDomain: "SEU_PROJECT_ID...", // ← cole aqui
  projectId: "SEU_PROJECT_ID",     // ← cole aqui
  storageBucket: "SEU_...",        // ← cole aqui
  messagingSenderId: "SEU_...",    // ← cole aqui
  appId: "SEU_APP_ID"              // ← cole aqui
}
```

## 🐙 Passo 8 — GitHub + Vercel

1. Crie repositório no GitHub: `kitolas-stock`
2. Faça upload de todos os ficheiros (via github.dev)
3. Aceda a https://vercel.com → **"Add New Project"**
4. Importe o repositório
5. Framework: **Vite**
6. Clique **"Deploy"**

## 👥 Adicionar trabalhadores

1. Firebase → Authentication → Add user (crie email + senha)
2. Copie o UID do utilizador criado
3. Firestore → users → **New document** → ID = UID copiado
4. Campos: `email`, `nome`, `role: "worker"`
5. Na app, vá a **Utilizadores** para gerir roles

## 📁 Colecções Firestore criadas automaticamente

| Colecção | Descrição |
|----------|-----------|
| `users` | Utilizadores e roles |
| `produtos` | Stock de produtos |
| `vendas` | Registo de vendas |
| `despesas` | Registo de despesas |
