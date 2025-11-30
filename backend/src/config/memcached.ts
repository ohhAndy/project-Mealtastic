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

export async function invalidateSearchKeys() {
  let searchResults: any[] = []
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    searchResults = (await client.query("SELECT * FROM cached_search FOR UPDATE")).rows;
    await client.query("DELETE FROM cached_search");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("Failed to delete cache_search from DB: ", err);
  } finally {
    client.release();
    await Promise.all(searchResults.map(async (s: any) => {
      memcached.del(s.search_key, (err)=> {
        if (err) console.log("Memcached DEL error:", err);
        console.log("Memcached DEL: ", s.search_key);
      });
    }));
  }
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
  const recipeResults = await pool.query("SELECT * FROM recipes");
  for (const r of recipeResults.rows) {
    cacheSet(getRecipeKey(r.id as string), r);
  }
  const searchResults = await pool.query("SELECT * FROM cached_search");
  for (const s of searchResults.rows) {
    cacheSet(s.search_key, s.search_results);
  }
}

export async function cacheSetSearch(key: string, value: any) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO cached_search(search_key, search_results) 
                        VALUES ($1, $2)
                        ON CONFLICT (search_key) DO UPDATE SET search_results = EXCLUDED.search_results`,
                      [key, JSON.stringify(value)]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("Failed to insert new cache_search into DB: ", err);
  } finally {
    client.release();
  }
  cacheSet(key, value, 0);
}