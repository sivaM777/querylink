
import { createServer } from "./server/index.js";

const PORT = process.env.PORT || 5000;
const app = createServer();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 QueryLinker Backend running on port ${PORT}`);
});
