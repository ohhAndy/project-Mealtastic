import cron from "node-cron";
import pool from "../db";

//chat gpt
export function startCacheCleanupJob() {
  cron.schedule("0 3 * * *", async () => { // every day at 3AM
    console.log("Cleaning expired cached recipes...");
    pool.query(`
      DELETE FROM recipes
      WHERE persistent = FALSE
      AND NOW() - cached_at > expires_in
    `).catch(err => (console.log(`Cache Cleanup Failed: ${err}`)));
  });
}