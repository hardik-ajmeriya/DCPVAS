// Allow only known frontend origins.
export const allowedOrigins = [
  'http://localhost:5500',
  'https://dcpvas-3wks.vercel.app',
];

export const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export default corsOptions;
