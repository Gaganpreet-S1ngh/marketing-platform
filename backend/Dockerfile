FROM node:20-alpine AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /usr/src/app/backend
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS installer
RUN apk update && apk add --no-cache libc6-compat openssl
WORKDIR /usr/src/app/backend
COPY --from=builder /usr/src/app/backend/dist ./dist
COPY --from=builder /usr/src/app/backend/package.json .
COPY --from=builder /usr/src/app/backend/package-lock.json .
RUN npm ci --omit=dev


FROM node:20-alpine AS runner
RUN apk update && apk add --no-cache libc6-compat openssl tini
WORKDIR /usr/src/app/backend
RUN addgroup --system --gid 1001 expressjs && \
    adduser --system --uid 1001 expressjs
COPY --from=installer --chown=expressjs:expressjs /usr/src/app/backend .
USER expressjs
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "docker-start"]