---
name: blocking-studio-director
description: Design an executable BARZ Blocking Studio scene or camera move when the user asks Atlas to stage a 3D previz, place characters and primitives, or create cinematic camera keyframes.
---

# Blocking Studio Director

Turn the request into a simple, readable 3D previz. Preserve the user's subjects, geography, screen direction, shot intent, duration, and named camera move. Prefer a small number of purposeful primitives over decorative clutter.

## Spatial conventions

- Use metres. X points screen-right, Y points up, Z points toward the default camera. The floor is Y=0.
- A standing character is normally positioned at Y=0. Camera eye height is usually 1.4–1.8 m.
- Use `target` to keep the intended subject framed. Give every moving camera at least two path keys with monotonically increasing `t` from 0 to 1.
- A dolly changes camera position; a zoom changes `focal`; an orbit changes position around a stable target; a pan or tilt changes the target while position stays fixed.
- Keep travel physically plausible and avoid sending the camera through subjects or set geometry. Use more keys only when an arc, reveal, crane, or compound move needs them.
- Use 18–28 mm for very wide views, 32–50 mm for natural coverage, 65–100 mm for close-ups, unless the user specifies otherwise.

## Executable response

If the user asks to build or modify a Blocking Studio scene or camera move, give a very short explanation followed by exactly one fenced `barz-blocking-scene` JSON block. For advice or explanation only, do not emit the block.

The JSON must follow this schema. Omit optional arrays that are not useful; never add comments inside JSON.

```barz-blocking-scene
{
  "title": "Short scene name",
  "aspect": "16:9",
  "fps": 25,
  "duration": 8,
  "lighting": {
    "azimuth": 35,
    "elevation": 50,
    "intensity": 100,
    "softness": 3,
    "background": "#c9c9c9",
    "ground": "#bdbdbd",
    "groundVisible": true
  },
  "characters": [
    {
      "name": "Subject A",
      "color": "#db9a5d",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "pose": "stand"
    }
  ],
  "objects": [
    {
      "type": "box",
      "name": "Table",
      "color": "#8a8480",
      "position": [1, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1.4, 0.75, 0.8]
    }
  ],
  "cameras": [
    {
      "name": "Cam A",
      "focal": 50,
      "duration": 8,
      "target": [0, 1.2, 0],
      "path": [
        { "t": 0, "position": [0, 1.6, 6], "target": [0, 1.2, 0], "focal": 50 },
        { "t": 1, "position": [0, 1.6, 2.5], "target": [0, 1.2, 0], "focal": 50 }
      ]
    }
  ]
}
```

Allowed object types are `box`, `cylinder`, `sphere`, `pyramid`, `plane`, `dome`, `donut`, `car`, `bus`, `facade`, `human`, and `null`. Rotations are degrees. Colors are six-digit hex values. `aspect` is one of `16:9`, `9:16`, `1:1`, or `2.39`. Keep at most 8 characters, 24 objects, 4 cameras, and 64 path keys per camera.

Set `lighting.groundVisible` to `false` when the user wants an empty, floating, studio-void, space, or otherwise floorless scene. This hides only the ground plane; the grid remains an independent editor aid.

Keep the executable plan compact: normally use 2–12 camera path keys and only the geometry needed to read the staging. Never repeat the JSON in prose.

For a camera-only request, still include one minimal character or object that makes the move legible unless the user explicitly asks for an empty stage. For a static shot, one path key is enough. For a dolly zoom, move the camera and change focal length in the opposite perceptual direction. For shot/reverse-shot, create two named cameras on the same side of the 180-degree line.
