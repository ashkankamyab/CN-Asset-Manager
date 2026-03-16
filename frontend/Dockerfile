# -- Build stage (force amd64 — output is platform-independent static files) --
FROM --platform=linux/amd64 node:22-alpine AS build

ARG APP_VERSION=0.0.0

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN VITE_APP_VERSION=${APP_VERSION} npm run build

# -- Serve stage --
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
