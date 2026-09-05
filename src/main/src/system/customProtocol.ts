import { net, protocol } from "electron";
import { appResource } from "./dirs";
import { resolve, relative, isAbsolute } from "path";
import { pathToFileURL } from "url";

export function registerProtocol() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app-resource",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ]);
}

export function handleProtocol() {
  protocol.handle("app-resource", (request) => {
    const { host, pathname } = new URL(request.url);

    const filePath = resolve(appResource, host, decodeURIComponent(pathname).replace(/^\/+/, ""));

    const rel = relative(appResource, filePath);

    if (!rel || rel.startsWith("..") || isAbsolute(rel))
      return new Response("Not found", { status: 404 });

    return net.fetch(pathToFileURL(filePath).toString());
  });
}
