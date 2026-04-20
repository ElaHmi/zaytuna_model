# Use Node.js 20 slim image for a smaller footprint
FROM node:20-slim

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create the uploads directory and set permissions
RUN mkdir -p uploads && chmod 777 uploads

# The default port for Hugging Face Spaces is 7860
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
