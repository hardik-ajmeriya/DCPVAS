import morgan from 'morgan';

// Simple HTTP request logger using morgan; can be extended to pipe into Winston later.
export const requestLogger = morgan(':method :url :status :res[content-length] - :response-time ms');

export default requestLogger;
