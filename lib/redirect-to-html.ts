export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  if (
    request.uri !== "/" &&
    (request.uri.endsWith("/") ||
      request.uri.lastIndexOf(".") < request.uri.lastIndexOf("/"))
  ) {
    request.uri = request.uri.concat(
      `${request.uri.endsWith("/") ? "" : "/"}index.html`
    );
  }
  return request;
};
