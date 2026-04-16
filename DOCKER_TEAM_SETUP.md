# Docker Setup for Team

Tai lieu nay giup ca nhom chay du an dong bo bang Docker Compose.

## 1) Dieu kien can co

- Docker Desktop (bat Linux containers)
- Docker Compose v2 (di kem Docker Desktop)

## 2) Chuan bi bien moi truong

Tao file .env o thu muc goc tu mau:

```bash
cp .env.docker.example .env
```

Neu dung PowerShell:

```powershell
Copy-Item .env.docker.example .env
```

Cap nhat cac bien trong .env:

- MSSQL_SA_PASSWORD: mat khau sa cho SQL Server (dat manh)
- DB_NAME: ten database (mac dinh dau_gia)
- JWT_SECRET: khoa JWT dung chung cho backend

## 3) Chay toan bo he thong

Chay tu thu muc goc project:

```bash
docker compose up --build
```

Dich vu sau khi chay:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- SQL Server: localhost:1433

## 4) Cac lenh thuong dung cho team

Dung de chay nen:

```bash
docker compose up -d --build
```

Xem log:

```bash
docker compose logs -f
```

Dung he thong:

```bash
docker compose down
```

Dung va xoa ca volume DB (lam moi database):

```bash
docker compose down -v
```

## 5) Luu y lam viec nhom hieu qua

- Moi thanh vien giu cung 1 file compose va cung bo bien .env (chi khac gia tri bi mat)
- Khong commit file .env that
- Khi thay doi schema SQL trong dau_gia.sql, thong bao team chay lai:

```bash
docker compose down -v
docker compose up --build
```

- Neu frontend goi sai API, kiem tra VITE_API_URL trong docker-compose.yml (build args cua frontend)

## 6) Cau truc Docker da them

- backend/Dockerfile
- backend/.dockerignore
- frontend/my-app/Dockerfile
- frontend/my-app/.dockerignore
- frontend/my-app/nginx.conf
- docker-compose.yml
- docker/init-db.sh
- .env.docker.example
