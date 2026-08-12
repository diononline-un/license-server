FROM node:22-alpine
WORKDIR /app
COPY server.js keys.json package.json ./
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.js"]
