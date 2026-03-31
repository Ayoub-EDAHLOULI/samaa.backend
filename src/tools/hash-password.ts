import { passwordUtils } from "../shared/utils/password";

async function run() {
  const password = "mySecurePassword123!";
  const hashed = await passwordUtils.hash(password);
  console.log("Hashed password:", hashed);
}

run().catch(console.error);
