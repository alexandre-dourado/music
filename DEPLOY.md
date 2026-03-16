# 🎵 Fantasma — Deploy Passo a Passo

---

## Estrutura final do projeto

```
fantasma/
├── public/                   → vai pro GitHub Pages
│   ├── index.html            → app completo (3 temas, PWA)
│   ├── offline.html
│   ├── manifest.json
│   ├── sw.js                 → service worker
│   └── icons/
│       ├── icon-192.png      ← você já criou ✓
│       └── icon-512.png      ← você já criou ✓
└── gas/                      → vai pro Apps Script
    ├── Code.gs
    └── AdminPanel.html
```

---

## PASSO 1 — Google Apps Script (backend)

### 1.1 Criar projeto
1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**
2. Nome: `Fantasma Backend`

### 1.2 Adicionar arquivos
| Arquivo GAS | Conteúdo |
|-------------|---------|
| `Code.gs` (já existe) | cole o conteúdo de `gas/Code.gs` |
| `AdminPanel.html` (+ → HTML) | cole o conteúdo de `gas/AdminPanel.html` |

### 1.3 Criar sheets
Selecione `setupSheets` no dropdown → ▶ **Executar**  
Autorize permissões quando solicitado.

### 1.4 Deploy como Web App
1. **Implantar** → **Nova implantação**
2. Tipo: `Aplicativo da Web`
3. Executar como: `Eu`
4. Acesso: `Qualquer pessoa`
5. **Implantar** → copie a URL

A URL terá formato:
```
https://script.google.com/macros/s/AKfycbX.../exec
```

---

## PASSO 2 — GitHub Pages (frontend PWA)

### 2.1 Criar repositório
```bash
git init
git add .
git commit -m "feat: fantasma pwa"
git branch -M main
git remote add origin https://github.com/SEU_USER/fantasma.git
git push -u origin main
```

### 2.2 Adicionar secret com a URL do GAS
GitHub → repositório → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Nome | Valor |
|------|-------|
| `GAS_URL` | sua URL do Apps Script (step 1.4) |

### 2.3 Ativar GitHub Pages
**Settings** → **Pages** → Source: **GitHub Actions** → Salvar

### 2.4 Deploy
```bash
git push origin main
# Aguarde ~60s → seu app estará em:
# https://SEU_USER.github.io/fantasma/
```

---

## PASSO 3 — Menu Admin na Planilha

### 3.1 Vincular o script à planilha
No Apps Script: **Projeto** → **Configurações do projeto** → verifique se está vinculado à planilha.  
Caso contrário: abra a planilha → **Extensões** → **Apps Script** → cole o `Code.gs` lá.

### 3.2 Adicionar o menu
Execute `onOpen()` uma vez no editor → recarregue a planilha.  
Aparecerá o menu **🎵 Fantasma** na barra da planilha.

### 3.3 Configurar IDs no painel admin
**🎵 Fantasma → Abrir Painel Admin → ⚙ Config**

| Campo | Onde encontrar |
|-------|---------------|
| Spreadsheet ID | URL da planilha: `/spreadsheets/d/[ID]/edit` |
| Pasta /audios  | URL da pasta: `/drive/folders/[ID]` |
| Pasta /letras  | URL da pasta: `/drive/folders/[ID]` |
| Pasta /capas   | URL da pasta: `/drive/folders/[ID]` |

---

## PASSO 4 — Adicionar músicas

### Método A — Scan automático (recomendado)
1. Faça upload do MP3 em `/audios` e do `.txt` em `/letras` com o **mesmo nome de arquivo**
2. Painel Admin → **📂 Import** → **Escanear agora**
3. As músicas aparecem como `Privado`
4. Edite cada uma e publique quando quiser

### Método B — Manual na planilha
Adicione uma linha na aba `musicas`:

| Campo | Valor |
|-------|-------|
| id | `001` (único) |
| titulo | Nome da música |
| audio_id | ID do arquivo MP3 no Drive |
| letra_id | ID do .txt |
| capa_id | ID da imagem (opcional) |
| notas_autor | Texto do artista |
| publicar | `TRUE` ou `FALSE` |
| ordem | número da posição |
| data_publicacao | `2025-03-10` |

### Compartilhar arquivos no Drive
Para cada arquivo: clique direito → **Compartilhar** → **Qualquer pessoa com o link** → Leitor

---

## PASSO 5 — Upload de capas pelo painel admin

1. Painel Admin → selecione uma música → **✏ Editar**
2. Na seção **Capa**: clique na zona de upload ou arraste uma imagem
3. O arquivo é salvo automaticamente na pasta `/capas` do Drive
4. O File ID é preenchido automaticamente no campo
5. Clique **Salvar**

---

## Atualizar o código

```bash
git add .
git commit -m "update"
git push origin main
# Deploy automático em ~60 segundos
```

Para o Apps Script: edite no editor → **Implantar** → **Gerenciar implantações** → nova versão.

---

## Instalar como PWA

**iOS Safari:** Compartilhar → "Adicionar à Tela de Início"  
**Android Chrome:** Menu ⋮ → "Instalar app" ou "Adicionar à tela inicial"

---

## Temas do app

| Botão | Nome | Estilo |
|-------|------|--------|
| 🎵 | **Crate Digger** | Âmbar vintage, grain, Playfair itálico |
| ◈ | **Dark** | Original lime elétrico, Syne |
| ☀ | **Light** | Clean minimalista, branco |

O tema é salvo por usuário via localStorage.

---

## Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `Espaço` | Play / Pause |

---

## Troubleshooting rápido

| Problema | Solução |
|----------|---------|
| App não carrega músicas | Verifique `GAS_URL` no secret do GitHub |
| Áudio não toca | Compartilhe o arquivo Drive como "Qualquer pessoa" |
| Scan não acha arquivos | Configure IDs das pastas no painel → ⚙ Config |
| Feedback não envia | Verifique se a aba `feedback` existe na planilha |
| Tema não salva | Abra no browser (PWA), não no WebView |
