import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createPaintSnapshot, normalizePaintProject, paintLassoFillContainsPoint, paintLassoIsClosed, paintObjectIntersectsMarquee, paintObjectStyle, paintProjectBlob, paintSelectionBounds, pointInPaintPolygon, rotatePaintObjectAround, savePaintProjectNative, scalePaintObjectFromAnchor, setPaintObjectFillEnabled, setPaintObjectStrokeEnabled } from "../apps/atlas/public/paint-studio.js";

function state() {
  return {
    name: "Test / Paint", width: 1200, height: 675, background: "transparent", backgroundColor: "#ffffff",
    layers: [{ id: "layer-1", name: "Traits", visible: true }],
    objects: [{ id: "object-1", layerId: "layer-1", type: "rect", x: 10, y: 20, w: 80, h: 50, color: "#ff5b3a" }]
  };
}

test("A14 Paint snapshots keep canvas, layer order and editable objects", () => {
  const snapshot = createPaintSnapshot(state());
  assert.equal(snapshot.version, 1);
  assert.deepEqual(snapshot.canvas, { width: 1200, height: 675, background: "transparent", backgroundColor: "#ffffff" });
  assert.equal(snapshot.layers[0].name, "Traits");
  assert.equal(snapshot.objects[0].type, "rect");
  snapshot.objects[0].x = 999;
  assert.equal(state().objects[0].x, 10);
});

test("A14 Paint project files are normalized and reject unsupported dimensions", async () => {
  const blob = paintProjectBlob(state());
  const parsed = normalizePaintProject(JSON.parse(await blob.text()));
  assert.equal(parsed.name, "Test / Paint");
  assert.throws(() => normalizePaintProject({ version: 1, canvas: { width: 10, height: 10 }, layers: [], objects: [] }), /non pris en charge/);
});

test("A14 Paint drops objects whose layer no longer exists", () => {
  const project = createPaintSnapshot(state());
  project.objects.push({ id: "orphan", layerId: "missing", type: "text", text: "lost" });
  assert.deepEqual(normalizePaintProject(project).objects.map(({ id }) => id), ["object-1"]);
});

test("A14 Paint keeps legacy shapes compatible and supports independent contour and fill", () => {
  assert.deepEqual(paintObjectStyle({ type: "rect", color: "#112233", filled: false }), { strokeColor: "#112233", fillColor: "transparent" });
  assert.deepEqual(paintObjectStyle({ type: "ellipse", color: "#445566", filled: true }), { strokeColor: "transparent", fillColor: "#445566" });
  assert.deepEqual(
    paintObjectStyle({ type: "lasso", strokeColor: "#ff0000", fillColor: "#ffff00" }),
    { strokeColor: "#ff0000", fillColor: "#ffff00" }
  );
});

test("A14 Paint top toolbar contour and fill switches edit the selected shape", () => {
  const shape = { type: "lasso", color: "#112233", strokeColor: "#112233", fillColor: "#445566", filled: true };
  assert.equal(setPaintObjectStrokeEnabled(shape, false, "#abcdef"), true);
  assert.equal(setPaintObjectFillEnabled(shape, false, "#fedcba"), true);
  assert.deepEqual(paintObjectStyle(shape), { strokeColor: "transparent", fillColor: "transparent" });
  assert.equal(setPaintObjectStrokeEnabled(shape, true, "#abcdef"), true);
  assert.equal(setPaintObjectFillEnabled(shape, true, "#fedcba"), true);
  assert.deepEqual(paintObjectStyle(shape), { strokeColor: "#abcdef", fillColor: "#fedcba" });
  assert.equal(setPaintObjectFillEnabled({ type: "path" }, true, "#ffffff"), false);
  assert.equal(setPaintObjectStrokeEnabled({ type: "image" }, true, "#ffffff"), false);
});

test("A14 Paint marquee selection intersects multiple shape bounds in either drag direction", () => {
  const rectangle = { type: "rect", x: 20, y: 20, w: 40, h: 30 };
  const ellipse = { type: "ellipse", x: 90, y: 70, w: 30, h: 30 };
  const outside = { type: "rect", x: 180, y: 180, w: 20, h: 20 };
  const start = { x: 130, y: 110 }; const end = { x: 10, y: 10 };
  assert.equal(paintObjectIntersectsMarquee(rectangle, start, end), true);
  assert.equal(paintObjectIntersectsMarquee(ellipse, start, end), true);
  assert.equal(paintObjectIntersectsMarquee(outside, start, end), false);
});

test("A14 Paint selection handles scale and rotate heterogeneous objects", () => {
  const rectangle = { type: "rect", x: 10, y: 20, w: 40, h: 20 };
  const path = { type: "path", points: [{ x: 60, y: 20 }, { x: 80, y: 40 }] };
  assert.deepEqual(paintSelectionBounds([rectangle, path]), { x: 10, y: 20, w: 70, h: 20 });
  const scaled = scalePaintObjectFromAnchor(rectangle, { x: 0, y: 0 }, 2, 3);
  assert.deepEqual({ x: scaled.x, y: scaled.y, w: scaled.w, h: scaled.h }, { x: 20, y: 60, w: 80, h: 60 });
  const rotatedPath = rotatePaintObjectAround(path, { x: 0, y: 0 }, Math.PI / 2);
  assert.ok(Math.abs(rotatedPath.points[0].x + 20) < 1e-9);
  assert.ok(Math.abs(rotatedPath.points[0].y - 60) < 1e-9);
  const rotatedRectangle = rotatePaintObjectAround(rectangle, { x: 0, y: 0 }, Math.PI / 2);
  assert.ok(Math.abs(rotatedRectangle.rotation - Math.PI / 2) < 1e-9);
});

test("A14 Paint lasso hit testing recognizes its closed editable polygon", () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 100 }];
  assert.equal(pointInPaintPolygon(points, { x: 40, y: 40 }), true);
  assert.equal(pointInPaintPolygon(points, { x: 120, y: 40 }), false);
});

test("A14 Paint lasso is closed by default and can explicitly stay open", async () => {
  assert.equal(paintLassoIsClosed({ type: "lasso" }), true);
  assert.equal(paintLassoIsClosed({ type: "lasso", closed: true }), true);
  assert.equal(paintLassoIsClosed({ type: "lasso", closed: false }), false);
  const source = await readFile(new URL("../apps/atlas/public/paint-studio.js", import.meta.url), "utf8");
  assert.match(source, /"Closed shape"/);
  assert.match(source, /lassoClosed\.checked = true/);
});

test("A14 Paint open lasso keeps its filled surface while only the outline stays open", () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const openFilled = { type: "lasso", closed: false, points, strokeColor: "#ff0000", fillColor: "#ffff00" };
  const openOutline = { ...openFilled, fillColor: "transparent" };
  assert.equal(paintLassoIsClosed(openFilled), false);
  assert.equal(paintLassoFillContainsPoint(openFilled, { x: 50, y: 50 }), true);
  assert.equal(paintLassoFillContainsPoint(openOutline, { x: 50, y: 50 }), false);
});

test("A14 Paint keeps the active drawing tool after creating an object", async () => {
  const source = await readFile(new URL("../apps/atlas/public/paint-studio.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /if \(interaction\.type === "draw"\)\s*\{\s*state\.tool = "select"/);
  assert.doesNotMatch(source, /snapshot\("Texte ajouté"\);\s*setTool\("select"\)/);
});

test("A14 Paint native save sends the project name and returns the chosen full path", async () => {
  const project = createPaintSnapshot(state());
  const result = await savePaintProjectNative(project, "Mon projet.barzpaint", async (url, options) => {
    assert.equal(url, "/api/v1/tools/paint-studio/save-project");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.equal(body.suggestedName, "Mon projet.barzpaint");
    assert.equal(body.project.name, "Test / Paint");
    return new Response(JSON.stringify({ cancelled: false, path: "C:\\Plans\\Mon projet.barzpaint", name: "Mon projet.barzpaint" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });
  assert.equal(result.path, "C:\\Plans\\Mon projet.barzpaint");
});
