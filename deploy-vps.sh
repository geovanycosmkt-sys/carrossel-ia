#!/bin/bash
# ============================================
# DEPLOY - Gerador de Carrossel IA na VPS
# Cole este script inteiro no terminal da VPS
# ============================================

set -e
echo "🚀 Iniciando deploy do Gerador de Carrossel IA..."

# 1. Instalar Node.js 18 (se não tiver)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
    echo "📦 Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v) instalado"

# 2. Instalar PM2 (gerenciador de processos)
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi
echo "✅ PM2 instalado"

# 3. Criar diretório do projeto
APP_DIR="/opt/carrossel-ia"
echo "📁 Criando diretório $APP_DIR..."
mkdir -p $APP_DIR
cd $APP_DIR

# 4. Criar package.json
cat > package.json << 'PKGJSON'
{
  "name": "carrossel-ia",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 3001"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.51.0",
    "@tiptap/extension-bold": "^2.6.0",
    "@tiptap/extension-italic": "^2.6.0",
    "@tiptap/extension-bullet-list": "^2.6.0",
    "@tiptap/extension-list-item": "^2.6.0",
    "@tiptap/extension-history": "^2.6.0",
    "@tiptap/react": "^2.6.0",
    "@tiptap/starter-kit": "^2.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "dompurify": "^3.1.0",
    "fabric": "^6.9.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.383.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.4"
  }
}
PKGJSON

# 5. Criar .env
cat > .env << 'ENVFILE'
VITE_SUPABASE_URL=https://ztacvobjpuwyrckgzcud.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YWN2b2JqcHV3eXJja2d6Y3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODQ3MzMsImV4cCI6MjA5MDk2MDczM30.2N787IVRhFuxM7drhwF87PPIS5vhyPXfZVJqGtG48_g
VITE_GEMINI_API_KEY=AIzaSyA66E4Cfouf4QtMFOKIV-jKn7DMOQZkCm0
ENVFILE

echo "✅ .env configurado"

# 6. Instalar dependências
echo "📦 Instalando dependências (pode demorar 1-2 min)..."
npm install

# 7. Build do projeto
echo "🔨 Fazendo build..."
npm run build

# 8. Instalar e configurar Nginx (se não tiver)
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt-get install -y nginx
fi

# 9. Configurar Nginx para servir o app na porta 3001
cat > /etc/nginx/sites-available/carrossel-ia << 'NGINXCONF'
server {
    listen 3001;
    server_name _;

    root /opt/carrossel-ia/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
NGINXCONF

# Ativar site
ln -sf /etc/nginx/sites-available/carrossel-ia /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "============================================"
echo ""
echo "🌐 Acesse: http://2.24.28.177:3001"
echo ""
echo "📌 Comandos úteis:"
echo "   Rebuild: cd /opt/carrossel-ia && npm run build"
echo "   Logs Nginx: tail -f /var/log/nginx/error.log"
echo "   Restart Nginx: systemctl restart nginx"
echo "============================================"
