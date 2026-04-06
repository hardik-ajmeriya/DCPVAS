// Production CORS configuration – allow known frontends only
const allowedOrigins = [
  'http://localhost:5500',
  'http://localhost:5173',
  'https://dcpvas-3wks.vercel.app',
];

export const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export default corsOptions;
