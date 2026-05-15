export function forceLoseWebglContext(regl, canvas) {
  const gl = regl && typeof regl === "function" ? regl._gl : null;
  const loseExt = gl?.getExtension?.("WEBGL_lose_context") || null;
  if (loseExt?.loseContext) {
    try {
      loseExt.loseContext();
    } catch {
      // no-op
    }
  }
  if (canvas) {
    canvas.width = 1;
    canvas.height = 1;
  }
}

