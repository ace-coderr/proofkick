import axios from "axios";

const DEVNET = "https://txline-dev.txodds.com";
const MAINNET = "https://txline.txodds.com";

async function getJwt(base: string): Promise<string | null> {
  try {
    const res = await axios.post(`${base}/auth/guest/start`, {}, { timeout: 20000 });
    const token = res.data?.token ?? res.data;
    console.log(`  [JWT] ${base} -> OK  ${String(token).slice(0, 24)}...`);
    return typeof token === "string" ? token : null;
  } catch (e: any) {
    console.log(`  [JWT] ${base} -> FAIL ${e.response?.status ?? e.code ?? e.message}`);
    return null;
  }
}

async function probe(base: string, path: string, jwt: string | null, params?: any) {
  try {
    const res = await axios.get(`${base}${path}`, {
      params,
      timeout: 20000,
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    });
    console.log(`  [GET ${res.status}] ${path}  ${JSON.stringify(res.data).slice(0, 320)}`);
    return res.data;
  } catch (e: any) {
    const s = e.response?.status;
    const b = e.response?.data ? JSON.stringify(e.response.data).slice(0, 320) : (e.code ?? e.message);
    console.log(`  [GET ${s ?? "ERR"}] ${path}  ${b}`);
    return null;
  }
}

(async () => {
  console.log("=== 1. Guest JWT ===");
  const jwtDev = await getJwt(DEVNET);
  const jwtMain = await getJwt(MAINNET);
  const jwt = jwtDev || jwtMain;

  console.log("\n=== 2. Devnet data with guest JWT only ===");
  await probe(DEVNET, "/api/scores/stat-validation", jwt, { fixtureId: 17952170, seq: 941, statKey: 1002 });
  await probe(DEVNET, "/api/scores/snapshot/17952170", jwt, { asOf: Date.now() });

  console.log("\n=== 3. Discover real devnet fixtures ===");
  const epochDay = Math.floor(Date.now() / 86400000);
  await probe(DEVNET, `/api/fixtures/snapshot/${epochDay}`, jwt);
  await probe(DEVNET, "/api/fixtures/snapshot", jwt, { epochDay });

  console.log("\nCodes: 200=open, 401/403=needs subscribe+activate, 404=wrong path/fixture.");
})();
