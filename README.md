# GameVault AI

API para gerenciamento de uma biblioteca pessoal de jogos, com autenticação JWT,
filtros, estatísticas e integração opcional com a RAWG.

## Requisitos

- Python 3.12 ou superior
- Uma chave da API RAWG para usar busca, importação e refresh

## Configuração

Crie um ambiente virtual e instale as dependências:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Copie `.env.example` para `.env` e preencha pelo menos `SECRET_KEY` com um
valor aleatório longo. `RAWG_API_KEY` é opcional para os recursos locais que
não usam a RAWG.

```powershell
Copy-Item .env.example .env
```

Para gerar uma chave JWT segura:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

O banco padrão é SQLite em `./gamevault.db`. Para outro banco, defina
`DATABASE_URL` no `.env`.

## Banco de dados

Aplicar as migrações:

```powershell
alembic upgrade head
```

## Executar a API

```powershell
uvicorn app.main:app --reload
```

A documentação interativa fica disponível em
`http://127.0.0.1:8000/docs`.

## Testes

```powershell
pytest -q
```

Os testes usam um banco SQLite separado e mocks para a RAWG; não fazem
requisições reais à API externa.

## Principais endpoints

- `POST /users`: criar usuário
- `POST /login`: obter token JWT
- `GET /games`: listar e filtrar jogos
- `POST /games`: cadastrar jogo
- `GET /games/search`: pesquisar na RAWG
- `POST /games/import/{rawg_id}`: importar jogo da RAWG
- `GET /games/stats`: consultar estatísticas