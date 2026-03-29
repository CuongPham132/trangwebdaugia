# AuctionHub Frontend

Frontend cho he thong dau gia truc tuyen, xay dung voi React + TypeScript + Vite.

## Tech Stack

- React 19
- TypeScript
- Vite
- Ant Design
- TanStack Query
- Redux Toolkit
- Framer Motion

## Yeu Cau Moi Truong

- Node.js 20+
- npm 10+

## Cai Dat

```bash
npm install
```

## Cau Hinh Bien Moi Truong

Tao file `.env` tu `.env.example`:

```bash
cp .env.example .env
```

Bien dang dung:

- `VITE_API_URL`: Dia chi backend API (mac dinh: `http://localhost:3000/api`)

## Chay Du An

```bash
npm run dev
```

Mo trinh duyet tai:

- `http://localhost:5173`

## Scripts

- `npm run dev`: Chay local dev server
- `npm run build`: Build production
- `npm run preview`: Preview ban build
- `npm run lint`: Kiem tra ESLint
- `npm run test`: Chay test (Vitest)

## Cau Truc Thu Muc Chinh

```text
src/
  components/     # UI components tai su dung
  pages/          # Trang chinh
  hooks/          # React hooks
  services/       # Goi API
  constants/      # Hang so
  utils/          # Ham ho tro
  layout/         # Header/Footer/Layout
  stores/         # Redux store
```

## Quy Uoc Git Co Ban

- Khong commit file `.env`
- Khong commit `node_modules/`, `dist/`
- Su dung Pull Request de merge vao nhanh chinh

## License

Du an nay su dung giay phep MIT. Xem file `LICENSE` de biet chi tiet.
