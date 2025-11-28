// based on chagpt response (my own memcaching was deemed inefficient): https://chatgpt.com/s/t_69293a38d6d08191938612bcbcd63f9c prompt: what would be the best way to implement caching

import Memcached from "memcached";
import pool from "../db";

const memcached = new Memcached("memcached:11211");

export function getSearchKey(params: any) {
  return `search:${params.query.replace(/\s+/g, "_")}:${params.cuisine}:${params.diet}:${params.maxPrepTime}:${params.page}:${params.limit}`;
}

export function getRecipeKey(id: string) {
  return `recipe:${id}`;
}

export function cacheSet(key: string, value: any, ttlSeconds = 0) {
  memcached.set(key, JSON.stringify(value), ttlSeconds, (err) => {
    if (err) console.log("Memcached SET error:", err);
    console.log("Memcached SET: ", key);
  });
}

export function cacheGet<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    memcached.get(key, (err, data) => {
      if (err || !data) return resolve(null);
      try {
        console.log("Memcache GET: ", key);
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
  });
}

export async function warmCache() {
  const results = await pool.query("SELECT * FROM recipes;")
  for (const r of results.rows) {
    cacheSet(getRecipeKey(r.id as string), r);
  }
}