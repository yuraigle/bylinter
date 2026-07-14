import { connect, registerAlias, showerr } from "../client";

registerAlias("кон", () => {
  connect().catch((err) => showerr("Failed to connect: " + err.message, true));
});
