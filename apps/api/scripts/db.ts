const command = process.argv[2];

if (!command) {
  console.error("A database command is required.");
  process.exit(1);
}

console.log(
  `[Stage 0] Database command "${command}" is reserved and will be implemented in Stage 1.`
);
