import { Capacitor } from "@capacitor/core";
import { FetchClient } from "../api/transports/fetch.transport";
import type { UserContextResponse } from "@totoro/shared";

export interface UserContextClient {
  getUserContext(): Promise<UserContextResponse>;
}

const FIXTURE_RESPONSE: UserContextResponse = {
  saved_places_count: 0,
  signal_tier: "active",
  chips: [],
};

function makeRealUserContextClient(
  getToken: () => Promise<string>,
): UserContextClient {
  const apiBase = Capacitor.isNativePlatform()
    ? (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/v1\/?$/, "")
    : "";
  const http = new FetchClient(apiBase, getToken);

  return {
    getUserContext: () => http.get<UserContextResponse>(`/api/v1/user/context`),
  };
}

export function getUserContextClient(
  getToken: () => Promise<string>,
): UserContextClient {
  if (process.env.NEXT_PUBLIC_CHAT_FIXTURES === "true") {
    return { getUserContext: async () => FIXTURE_RESPONSE };
  }
  return makeRealUserContextClient(getToken);
}
