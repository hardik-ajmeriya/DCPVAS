import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve project root so .env works both locally and on platforms like Render
// __dirname here is .../src/config, but the actual .env lives at the backend root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  openAiApiKey: process.env.OPENAI_API_KEY,
  jenkins: {
    url: process.env.JENKINS_URL,
    job: process.env.JENKINS_JOB,
    user: process.env.JENKINS_USER,
    token: process.env.JENKINS_TOKEN,
  },
};

if (!config.mongoUri) {
  console.warn('[config] MONGO_URI is not set. The server will fail to start without it.');
}

export default config;
