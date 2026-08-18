FROM node:20-slim

WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./

# Install npm dependencies inside the container
RUN npm install

# Copy the rest of your frontend code
COPY . .

EXPOSE 5173

# Start the Vite development server with the host flag enabled
CMD ["npm", "run", "dev", "--", "--host"]