import worker from "../dist/server/index.js";
const endpoints = new Set(["status", "air", "chat"]);
export default {
  /** @param {Request} request @returns {Promise<Response>} */
  async fetch(request) {
    const url = new URL(request.url);
    const action =
      url.searchParams.get("endpoint") ||
      url.pathname.split("/").filter(Boolean).at(-1);
    if (!action || !endpoints.has(action)) {
      return Response.json({ error: "Endpoint not found." }, { status: 404 });
    }
    url.pathname = "/api/" + action;
    url.searchParams.delete("endpoint");
    return worker.fetch(new Request(url, request), process.env);
  },
};
