FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ENV DATABASE_URL=postgresql://u:p@localhost:5432/db?schema=public
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node -e "const fs=require('fs'),path=require('path');const ex=new Set(['.ts','.tsx','.js','.jsx','.mjs','.css','.sql','.prisma']);function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(ex.has(path.extname(f))){const s=fs.readFileSync(f,'utf8');const t=s.split(String.fromCharCode(92)+'n').join(String.fromCharCode(10));if(t!==s){fs.writeFileSync(f,t);console.log('fixed '+f);}}}}['app','components','lib','prisma'].forEach(walk);"
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["npm","run","railway:start"]
