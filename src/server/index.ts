import { createV1App } from "./v1";
import { createV2App } from "./v2";

const v1 = createV1App();
const v2 = createV2App();

v1.listen(4011, () => console.log("[legacy-api] v1 listening on http://localhost:4011"));
v2.listen(4012, () => console.log("[legacy-api] v2 listening on http://localhost:4012"));