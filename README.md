# LicitaReq — Analisador e Triador de Requisitantes de Contratação Pública

<p align="center">
  <img src="https://img.shields.io/badge/Lei-14.133%2F2021-1d4ed8?style=for-the-badge" alt="Lei 14.133/2021" />
  <img src="https://img.shields.io/badge/status-ativo-059669?style=for-the-badge" alt="Status ativo" />
  <img src="https://img.shields.io/badge/licen%C3%A7a-MIT-64748b?style=for-the-badge" alt="Licença MIT" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/PDF.js-3.11-FF6B35?style=flat-square" alt="PDF.js" />
  <img src="https://img.shields.io/badge/Mammoth.js-1.6-8A2BE2?style=flat-square" alt="Mammoth.js" />
</p>

---

## 📖 Visão Geral

O **LicitaReq** é uma aplicação web interativa de apoio à **triagem de solicitações de contratação pública**, destinada a servidores públicos, setores requisitantes e equipes de planejamento da contratação.

A ferramenta recebe o Ofício/e-mail/DFD do setor requisitante, realiza a análise textual e devolve:

1. **Enquadramento legal automático** — Dispensa, Inexigibilidade, Pregão ou Concorrência.
2. **Verificação de requisitos formais** — art. 18, §1º da Lei 14.133/2021.
3. **Apontamento de inconformidades** com severidade (Alta / Média / Baixa) e fundamentação legal.
4. **Minuta de resposta oficial** pronta para copiar/colar no SEI ou sistema eletrônico equivalente.

> ⚠️ **Aviso institucional:** o resultado é subsídio técnico automatizado e **não substitui** o parecer da assessoria jurídica, do controle interno ou da autoridade competente.

---

## 🚀 Funcionalidades

### 1. Entrada de Dados
- **Upload de arquivos** — suporte a `PDF`, `DOCX`, `DOC` e `TXT` (extração de texto via PDF.js e Mammoth.js).
- **Entrada manual** — área de texto ampla para colar diretamente o Ofício ou e-mail.
- **Dados complementares** — unidade, processo, natureza, valor, órgão, responsável.

### 2. Motor de Triagem (Lei nº 14.133/2021)

| Situação                                                      | Modalidade sugerida            | Fundamento           |
|---------------------------------------------------------------|--------------------------------|----------------------|
| Bens e serviços comuns                                        | **Pregão Eletrônico**          | Art. 6º, XLI         |
| Serviços técnicos especializados / obras / engenharia         | **Concorrência**               | Art. 6º, XXXVIII     |
| Valor abaixo do limite legal                                  | **Dispensa por Valor**         | Art. 75, I e II      |
| Notória especialização / inviabilidade de competição          | **Inexigibilidade**            | Art. 74              |
| Emergência ou calamidade pública                              | **Dispensa Emergencial**       | Art. 75, VIII        |

### 3. Checklist de Requisitos

- Justificativa da necessidade pública — Art. 18, §1º, I
- Descrição clara do objeto — Art. 18, §1º, II
- Estimativa de quantidade — Art. 18, §1º, III
- Estimativa de preço / pesquisa de mercado — Art. 18, §1º, IV e Art. 23
- Dotação orçamentária — Art. 18, §1º, V e Art. 150
- Prazo de execução — Art. 18, §1º, VI
- Local de entrega/prestação — Art. 18, §1º, VII
- Fiscal do contrato — Art. 117
- Ausência de marca sem justificativa — Art. 41, I
- Preservação da competitividade — Art. 5º e Art. 41

### 4. Gerador de Minuta Oficial

Gera automaticamente um **despacho formal** com:
- Resumo executivo da solicitação
- Enquadramento legal preliminar
- Parecer (Deferido / Deferido com Recomendações / Devolvido para Adequação)
- Relação de pendências com severidade e fundamentação
- Bloco de assinatura

Botões de ação: **Copiar despacho**, **Baixar .txt** e **Imprimir**.

### 5. Interface & UX
- Glassmorphism leve com paleta corporativa (azul + ardósia).
- **Dark/Light mode** com persistência em `localStorage`.
- Truncamento responsivo de nomes de arquivos mantendo a extensão visível.
- Badges coloridos de enquadramento legal.
- Totalmente responsivo (desktop, tablet, mobile).
- Acessibilidade: `aria-*`, `skip-link`, foco visível, suporte a `prefers-reduced-motion`.

---

## 🏗️ Arquitetura

O projeto é **100% client-side** — nenhum dado é enviado a servidores. Todo processamento ocorre no navegador do usuário, o que garante confidencialidade das solicitações.

```
LicitaReq/
├── index.html      → Estrutura semântica, responsiva e acessível
├── style.css       → Design tokens, temas claro/escuro, componentes
├── app.js          → Motor de regras, parsing, dashboard e gerador de minuta
└── README.md       → Documentação
```

### Fluxo de dados

```
   [ Upload / Texto ]
           │
           ▼
   [ Extração de texto ]  ──►  PDF.js · Mammoth.js · FileReader
           │
           ▼
   [ Motor de Triagem ]   ──►  Dicionários + Regex + Limites legais
           │
           ├──► Natureza do objeto
           ├──► Modalidade sugerida (com base legal)
           ├──► Checklist de requisitos (10 itens)
           ├──► Índice de conformidade (%)
           └──► Parecer consolidado
           │
           ▼
   [ Dashboard + Minuta Oficial ]
```

---

## ⚖️ Legislação de Suporte

- **Lei nº 14.133/2021** — Nova Lei de Licitações e Contratos Administrativos
  - Art. 5º — Princípios
  - Art. 6º, XLI — Definição de Pregão
  - Art. 6º, XXXVIII — Definição de Concorrência
  - Art. 18, §1º — Estudos técnicos preliminares
  - Art. 23 — Pesquisa de preços
  - Art. 41, I — Vedação à indicação de marca
  - Art. 74 — Inexigibilidade
  - Art. 75, I e II — Dispensa por valor
  - Art. 75, VIII — Dispensa emergencial
  - Art. 117 — Fiscalização de contratos
  - Art. 150 — Dotação orçamentária
- **Decreto nº 11.317/2022** — Regulamenta a Lei nº 14.133/2021 no âmbito federal
- **IN SEGES nº 65/2021** — Pesquisa de preços
- **IN SEGES nº 81/2022** — Estudos Técnicos Preliminares (ETP Digital)

> Os limites de dispensa por valor utilizados no motor (`R$ 119.812,02` e `R$ 59.906,02`) são os valores consolidados de 2022. **Atualize-os anualmente** conforme os decretos de atualização monetária, editando as constantes no topo do `app.js`:
>
> ```js
> const LIMITE_OBRA_ENG      = 119812.02;
> const LIMITE_BENS_SERVICOS =  59906.02;
> ```

---

## 🧑‍💻 Como Rodar Localmente

### Opção 1 — Abrir direto no navegador

Basta clonar o repositório e abrir o `index.html`:

```bash
git clone https://github.com/<seu-usuario>/LicitaReq.git
cd LicitaReq
# Abra index.html no navegador (duplo clique)
```

> ⚠️ Alguns navegadores bloqueiam requisições `fetch` para arquivos locais via `file://`, o que pode afetar o parsing de PDF/DOCX. Se notar problemas, use a Opção 2.

### Opção 2 — Servidor local (recomendado)

Use qualquer servidor estático:

**Python:**
```bash
python -m http.server 8000
```

**Node.js:**
```bash
npx serve .
```

**PHP:**
```bash
php -S localhost:8000
```

Depois acesse: **http://localhost:8000**

---

## 🧪 Testando

1. Clique em **"Carregar exemplo"** para preencher o formulário com uma solicitação fictícia.
2. Clique em **"Analisar solicitação"** (ou use `Ctrl + Enter`).
3. O dashboard exibirá:
   - Enquadramento legal (badge colorido)
   - Índice de conformidade
   - Checklist de requisitos
   - Inconformidades com fundamentação
   - Minuta pronta para copiar/baixar/imprimir

---

## 🛠️ Tecnologias

| Camada          | Tecnologia                                                   |
|-----------------|--------------------------------------------------------------|
| Estrutura       | HTML5 semântico                                              |
| Estilização     | CSS3 (variáveis, Grid, Flexbox, `backdrop-filter`)           |
| Lógica          | JavaScript ES2020+ (vanilla)                                 |
| Parsing PDF     | [PDF.js 3.11](https://mozilla.github.io/pdf.js/)             |
| Parsing DOCX    | [Mammoth.js 1.6](https://github.com/mwilliamson/mammoth.js)  |
| Persistência    | `localStorage` (tema claro/escuro)                           |

Sem build step. Sem dependências de servidor. Sem frameworks.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sugestões de melhoria:

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-melhoria`
3. Commit: `git commit -m "feat: minha melhoria"`
4. Push: `git push origin feature/minha-melhoria`
5. Abra um Pull Request

### Ideias para evolução

- [ ] Integração com API do SEI para leitura/escrita direta de processos
- [ ] Exportação da minuta em `.docx` (via `docx.js`)
- [ ] Módulo de ETP (Estudo Técnico Preliminar) automatizado
- [ ] Catálogo de preços públicos (Painel de Preços / Compras.gov.br)
- [ ] Suporte a multiusuário com autenticação
- [ ] IA generativa para enriquecer a minuta

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

<strong>Matheus Macário Gonçalves Monteiro Guimarães dos Santos</strong>
Desenvolvido como ferramenta de apoio à gestão pública.

**LicitaReq** — simplificando a triagem de contratações públicas com base na Lei nº 14.133/2021.

<p align="center">
  <sub>Feito com ⚖️ e ☕ para a administração pública brasileira.</sub>
</p>
