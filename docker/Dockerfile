# ZEEHO 面板 Docker 版：零依赖，直接跑脚本内核
FROM node:20-alpine

WORKDIR /app

COPY desktop/engine.js /app/engine.js
COPY repo/zeeho_box_enhanced.js /app/zeeho_box_enhanced.js
COPY docker/server.js /app/server.js

VOLUME ["/data"]
EXPOSE 8787

ENV PORT=8787 \
    STORE=/data/store.json \
    TZ=Asia/Shanghai

CMD ["node", "/app/server.js"]
