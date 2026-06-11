FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Install chromium exactly as specified in your package.json
RUN npx playwright install chromium

EXPOSE 3001
CMD ["npm", "run", "server"]
