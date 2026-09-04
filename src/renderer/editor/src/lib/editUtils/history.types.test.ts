import { withHistoryGroup } from "./history";

withHistoryGroup(() => 1);

// @ts-expect-error History groups only support synchronous callbacks.
withHistoryGroup(async () => 1);
