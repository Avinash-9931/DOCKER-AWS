FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY ./Frontend/vite-project/package*.json ./

RUN npm install

COPY ./Frontend/vite-project ./

RUN npm run build

# BUILD THE BACKEND

FROM node:20-alpine

WORKDIR /app

COPY ./Backend/package*.json ./

RUN npm install

COPY ./Backend ./

COPY --from=frontend-builder /app/dist /app/public

CMD ["node", "Server.js"]
