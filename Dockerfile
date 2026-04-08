FROM node:18-slim

# Instalar dependências do Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    libxrandr2 \
    libxcomposite1 \
    libxfixes3 \
    libxdamage1 \
    libxext6 \
    libx11-6 \
    libxcb1 \
    libglib2.0-0 \
    libgobject-2.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Definir caminho do Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências Node.js
RUN npm install --omit=dev

# Copiar o resto da aplicação
COPY . .

# Expor porta
EXPOSE 8080

# Iniciar o bot
CMD ["node", "src/index.js"]