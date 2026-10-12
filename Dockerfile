FROM node:24-bookworm-slim
WORKDIR /opt/lumo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY public ./public
COPY scripts/inviter-parent.ts scripts/sauvegarder.ts scripts/revoquer-parent.ts ./scripts/
RUN mkdir -p /var/lib/lumo && chown node:node /var/lib/lumo
ENV PORT=4321 LUMO_DATA=/var/lib/lumo LUMO_ENV_IGNORE=1 LUMO_DEMO=0 LUMO_MCP_ACTIF=1 LUMO_VOIX_GENERATION=0
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4321/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/web.ts"]
