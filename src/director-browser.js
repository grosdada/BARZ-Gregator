import { createFalClient } from "@fal-ai/client";
import { wma } from "@fal-ai/client/realtime";

const fal = createFalClient({ proxyUrl: "/api/fal/proxy" });

export function openH3MaxDirector(options = {}) {
  return fal.realtime.open(wma("minimax/h3-max/director"), {
    receive: ["video", "audio"],
    ...options
  });
}
