import { createServer } from "node:net";

const portInput = process.env.PORT ?? process.argv[2] ?? "4000";
const port = Number(portInput);

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid port value: ${portInput}`);
  process.exit(1);
}

const server = createServer();

server.once("error", (error) => {
  if ("code" in error && error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Another Velora API process may already be running. Stop the existing process or change PORT before starting a new dev server.`,
    );
    process.exit(1);
  }

  console.error(
    error instanceof Error ? error.message : `Failed to probe port ${port}.`,
  );
  process.exit(1);
});

server.once("listening", () => {
  server.close(() => {
    process.exit(0);
  });
});

server.listen(port);
