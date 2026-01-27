import { app } from "./app";

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`api server running locally on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
