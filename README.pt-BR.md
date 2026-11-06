# GameVaultAI

O GameVaultAI é uma aplicação full stack para organizar uma biblioteca pessoal de videogames e acompanhar partidas. É possível pesquisar e importar jogos da RAWG, organizar a coleção e o progresso, registrar sessões e consultar estatísticas e atividades. Recomendações personalizadas e resumos de observações de sessões são recursos opcionais que usam a API do Google Gemini.

> A elegibilidade para o BYOP ainda não foi confirmada. O GameVaultAI consome uma API externa de LLM em recursos opcionais do produto; essa integração está documentada abaixo e não foi removida nem ocultada.

## Funcionalidades

- Cadastro de contas e autenticação JWT.
- Biblioteca pessoal com busca, filtros, favoritos e paginação.
- Busca e importação de jogos pela RAWG.
- Acompanhamento de status, plataforma, avaliação, horas jogadas, gêneros e conclusão.
- Sessões de gameplay, histórico e estatísticas.
- Prints das sessões armazenados localmente ou no Supabase Storage opcional.
- Gravação local de gameplay armazenada no IndexedDB do navegador.
- Recomendações de jogos e análise de observações de sessões com Gemini, ambos opcionais.

## Integração com IA

O Gemini oferece dois recursos complementares: recomendações personalizadas com base na biblioteca do usuário e resumos de observações escritas nas sessões recentes. O backend envia as solicitações à API externa do Google Gemini. O GameVaultAI não desenvolve, treina, ajusta, hospeda nem serve modelos de IA e não opera infraestrutura de inferência.

Nas recomendações, o prompt inclui título, plataforma, status, indicação de favorito, avaliação pessoal, horas jogadas, gêneros e nota Metacritic de cada jogo da biblioteca. Na análise de sessões, inclui título do jogo, data e hora, duração e observação do usuário. A análise considera até 30 sessões recentes e limita cada observação a 700 caracteres. Esses campos podem descrever interesses e hábitos de jogo; observações livres podem conter informações identificadoras. O nome de usuário e o e-mail não são incluídos diretamente nos prompts pela implementação atual.

O aplicativo não anexa imagens de sessões nem vídeos de gameplay ao Gemini. As imagens são enviadas ao backend do GameVaultAI e armazenadas em disco local ou, se configurado, no Supabase Storage. As gravações permanecem no IndexedDB do navegador e não são enviadas ao backend. O código não persiste prompts ou respostas do Gemini; o tratamento e a retenção pelo Google dependem dos termos e das configurações do provedor.

Gerenciamento da biblioteca, busca e importação pela RAWG, sessões, estatísticas e gravação local não chamam o Gemini e continuam disponíveis sem a chave da API ou durante uma indisponibilidade do serviço. Apenas recomendações e análise das observações dependem do Gemini. Busca e importação pela RAWG são uma integração externa separada e exigem sua própria chave.

As buscas enviam o texto pesquisado à RAWG. Importações e pedidos de screenshots usam IDs de jogos da RAWG; títulos das recomendações também são pesquisados lá para obter capas. O backend faz as chamadas à API, enquanto o navegador carrega diretamente dos hosts de imagens os endereços de capas e screenshots retornados pela RAWG. Esses hosts podem receber metadados de conexão do navegador, como o endereço IP. O GameVaultAI não inclui nomes de usuário nem e-mails nessas solicitações à RAWG. O backend envia a chave da RAWG como parâmetro da URL; os logs da infraestrutura de hospedagem devem ocultar parâmetros de consulta.

### Descrição para o formulário BYOP

> GameVaultAI is a full-stack personal game library and gameplay tracking application built with React, TypeScript, Python, FastAPI, and PostgreSQL. It helps users organize game collections, track play sessions, review statistics, and discover titles through RAWG. Optional recommendations and session-note summaries use the external Google Gemini API; the project does not develop or host AI models.

## Dados e privacidade

O PostgreSQL armazena nomes de usuário, e-mails, hashes de senhas, registros da biblioteca, sessões de gameplay e metadados das imagens. As senhas são armazenadas como hash. Os arquivos de imagem ficam em disco local por padrão ou em um bucket privado configurado no Supabase Storage. O navegador mantém o JWT no `localStorage` e os arquivos de vídeo no IndexedDB. Os clipes podem ser baixados pelo usuário e são removidos se forem excluídos no aplicativo ou se os dados do navegador forem apagados.

As imagens enviadas às sessões são armazenadas como recebidas; o aplicativo não remove EXIF nem outros metadados embutidos. Imagens, observações livres e gravações de tela podem conter dados pessoais ou informações sobre outras pessoas. As gravações, inclusive áudio capturado quando disponível, permanecem no IndexedDB do navegador e não são enviadas ao backend. Atualmente, o aplicativo não oferece endpoint para excluir contas ou exportar todos os dados; os registros da conta permanecem no banco até que o operador da instalação os remova. O usuário pode excluir jogos, sessões e imagens de sessões individualmente pelo aplicativo.

O aplicativo aceita múltiplas contas e pode processar dados pessoais informados por usuários, embora o proprietário relate que foi seu único usuário até agora. Os testes usam contas e dados fictícios, com chamadas à RAWG e ao Gemini simuladas. Uma instalação poderá tratar dados pessoais se outras pessoas se cadastrarem ou incluírem informações identificadoras nas observações.

## Tecnologias

- **Frontend:** React, TypeScript e Vite
- **Backend:** Python, FastAPI, SQLAlchemy e Pydantic
- **Banco e migrações:** PostgreSQL e Alembic
- **APIs externas:** RAWG e Google Gemini (recursos opcionais do produto)
- **Armazenamento:** diretório local de mídia ou Supabase Storage opcional
- **Deploy:** Vercel (frontend), Render (backend), Supabase (PostgreSQL / armazenamento opcional)
- **Qualidade:** pytest, ESLint, build TypeScript e GitHub Actions

## Requisitos

- Python 3.14+
- Node.js 24 e npm
- Docker Desktop com Docker Compose (para execução em contêineres)
- Chave da RAWG para busca e importação de jogos
- Chave do Gemini somente para recomendações e análise de observações

## Configuração local

Copie os exemplos de ambiente e configure um `SECRET_KEY` aleatório e único, com pelo menos 32 caracteres. A aplicação rejeita o placeholder do exemplo e chaves menores. As chaves de API são opcionais, exceto para os recursos que dependem de cada integração.

```powershell
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
```

Inicie o PostgreSQL e instale as dependências do backend:

```powershell
docker compose up -d db
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
```

Instale as dependências do frontend e inicie API e interface na raiz do repositório:

```powershell
npm --prefix frontend ci
npm install
npm run dev
```

A interface e a API ficam em `http://localhost:5173` e `http://localhost:8000`; a documentação da API fica em `http://localhost:8000/docs`.

Como alternativa, inicie toda a aplicação com Docker Compose:

```powershell
docker compose up --build -d
```

A interface em contêiner fica em `http://localhost:8080`. Configure credenciais de produção no gerenciador de segredos do serviço de hospedagem. Nunca use a senha de banco de exemplo ou um segredo JWT provisório em produção. `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas no ambiente do backend.

Consulte `.env.example`, `frontend/.env.example` e [frontend/README.md](frontend/README.md) para detalhes. `STORAGE_BACKEND=supabase` e um bucket privado habilitam o Supabase Storage para prints; disco local é o padrão. `GEMINI_MODEL` e `GEMINI_FALLBACK_MODEL` selecionam os modelos principal e alternativo.

## Testes e CI

Os testes do backend usam um banco SQLite separado e mocks; não chamam RAWG nem Gemini. Os testes do frontend verificam a persistência do idioma e se todas as chaves literais usadas pelas telas possuem tradução em inglês. O GitHub Actions executa pytest, testes do frontend, ESLint e o build TypeScript/Vite.

```powershell
pytest -q
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Mídia das sessões

Prints são enviados ao backend autenticado, que os armazena em disco ou no Supabase Storage. Cada sessão aceita até cinco imagens JPEG, PNG ou WebP, de até 5 MB cada. As gravações de tela usam APIs do navegador e ficam no IndexedDB local; a captura exige navegador compatível e contexto seguro, como HTTPS ou localhost. O limite atual é de 15 minutos por clipe. Análise de vídeos com IA ainda não está implementada.

## Licença

O código original e a documentação do GameVaultAI são licenciados sob a licença MIT; consulte [LICENSE](LICENSE). Dependências, assets e serviços de terceiros continuam sujeitos aos próprios termos e licenças.

## Roadmap

Consulte [ROADMAP.md](ROADMAP.md) para as atividades planejadas e estimativas.
