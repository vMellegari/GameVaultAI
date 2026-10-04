# GameVault AI

Aplicação full stack para gerenciamento de uma biblioteca pessoal de jogos. O
backend usa FastAPI, SQLAlchemy e PostgreSQL; o frontend usa React, TypeScript e
Vite. O projeto também integra a RAWG e recomendações com Google Gemini.

## Requisitos

- Python 3.14.5
- Docker Desktop com Docker Compose
- Uma chave da API RAWG para busca, importação e atualização de dados
- Uma chave da API Gemini para recomendações

## Configuração

Inicie o PostgreSQL:

```powershell
docker compose up -d db
```

Crie o arquivo local de configuração e preencha as chaves das APIs:

```powershell
Copy-Item .env.example .env
```

Gere uma chave JWT longa e aleatória:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Coloque o valor gerado em `SECRET_KEY` no `.env`. `RAWG_API_KEY` e
`GEMINI_API_KEY` habilitam as integrações correspondentes.

`GAMEVAULT_MEDIA_DIR` define onde os anexos de imagem das sessões são salvos.
O padrão é `data/media`; mantenha essa pasta em armazenamento persistente e
inclua-a nos backups do projeto. Cada sessão aceita até 5 imagens JPEG, PNG ou
WebP, com até 5 MB por imagem.

`CORS_ORIGINS` aceita uma lista de origens separadas por vírgula. Para o
frontend, copie `frontend/.env.example` para `frontend/.env` e ajuste
`VITE_API_URL` se a API não estiver em `http://localhost:8000`.

## Executar a aplicação completa com Docker

Copie o exemplo de ambiente. Para um ambiente publicado, configure `SECRET_KEY`
e `POSTGRES_PASSWORD` com valores fortes. Use uma senha de banco formada por
caracteres seguros para URL e mantenha a mesma senha em `DATABASE_URL` ao
executar a API fora do Docker. Os valores do arquivo de exemplo são apenas para
desenvolvimento local.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

O Compose inicia o PostgreSQL, aplica as migrações do Alembic antes de iniciar
a API e serve o frontend pelo Nginx. A aplicação fica em
`http://localhost:8080`; a API e sua documentação ficam em `http://localhost:8000`
e `http://localhost:8000/docs`. Os dados do banco e as imagens das sessões
ficam em volumes Docker persistentes. `docker compose down` preserva esses
volumes.

Para publicar em um servidor, defina `VITE_API_URL` como o endereço público da
API e `CORS_ORIGINS` como a origem pública do frontend antes de construir as
imagens. Use HTTPS no proxy reverso e credenciais próprias para o ambiente.
O banco não é publicado em interfaces de rede externas pelo Compose.

## Integração contínua

O workflow do GitHub Actions executa `pytest`, ESLint e o build do frontend em
cada push e pull request. Os testes usam SQLite e não precisam de chaves RAWG
ou Gemini nem de um serviço PostgreSQL.

Crie um ambiente virtual e instale as dependências:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Banco de dados

O PostgreSQL de desenvolvimento é configurado no `.env.example`. A estrutura é
gerenciada pelo Alembic; aplique as migrações antes de iniciar a API:

```powershell
alembic upgrade head
```

Ao atualizar uma instalação existente, essa migração adiciona o tipo do jogo e
classifica os registros atuais como `STANDARD`. Não é necessário apagar ou
recriar o banco de dados.

## Tipos de jogo

`STANDARD` representa jogos com uma conclusão possível. `ONGOING` representa
experiências contínuas, como MMOs e jogos de serviço; esses jogos não podem ser
marcados como `COMPLETED`. Jogos cadastrados e importados da RAWG começam como
`STANDARD`, e o tipo pode ser alterado nos detalhes do jogo.

## Executar a API

```powershell
uvicorn app.main:app --reload
```

Para iniciar a API e o frontend ao mesmo tempo, a partir da raiz do projeto:

```powershell
npm install
npm run dev
```

A documentação interativa fica disponível em
`http://127.0.0.1:8000/docs`.

## Testes

```powershell
pytest -q
```

Os testes usam um banco SQLite separado e mocks para a RAWG e o Gemini; não
fazem requisições reais às APIs externas.

## Sessões de jogo e imagens

As sessões são associadas ao jogo e atualizam o total de horas jogadas. Seus
anexos ficam em arquivos locais; o PostgreSQL armazena apenas os metadados. As
rotas de leitura, envio e exclusão de imagens exigem autenticação JWT.

## Principais endpoints

- `POST /users`: criar usuário
- `POST /login`: obter token JWT
- `GET /games`: listar e filtrar jogos
- `POST /games`: cadastrar jogo
- `GET /games/search`: pesquisar na RAWG
- `POST /games/import/{rawg_id}`: importar jogo da RAWG
- `GET /games/stats`: consultar estatísticas
