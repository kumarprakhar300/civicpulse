import { test } from "vitest";
import { getUserStats } from "@/lib/civic.functions";
test("shape", () => {
  console.log(Object.keys(getUserStats));
  console.log(JSON.stringify(getUserStats, (k,v) => typeof v === 'function' ? '[fn]' : v, 2).slice(0, 2000));
});
