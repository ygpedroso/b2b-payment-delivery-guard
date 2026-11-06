FROM node:22-alpine
RUN apk add --no-cache openssl tini

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:$PATH"

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
RUN npm remove @shopify/cli

COPY . .

RUN npx prisma generate
RUN npm run build

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/sbin/tini", "--", "./entrypoint.sh"]
CMD ["remix-serve", "./build/server/index.js"]
