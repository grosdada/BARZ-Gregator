# Angle 3D -> Qwen Multiple Angles

## Verification: PASS for routing and local request preparation

Source and installed runtime updated. Aggregator server reloaded with its existing Roaming data and shared-secret directories after checking there were no active jobs. No installer rebuild. Reload Atlas and Aggregator pages to use the changed JavaScript.

Method: project verify skill, running installed Atlas on 4326 and Aggregator on 4317, actual browser controls plus the public HTTP preview endpoint. No paid Qwen render submitted.

1. Opened Backstage / Angle 3D, imported the existing diagnostic reference and clicked Send to Aggregator twice. The Suite opened an Aggregator draft with Qwen Multiple Angles selected and the image in References.
2. Final draft cd12589a-7b98-4c5b-969b-2b9c512183fa: azimuth 305.76, elevation 2.18, zoom 3.23, LoRA strength 1, one image. All numeric browser controls valid. Generate enabled. No browser console errors captured.
3. Reloaded the transferred draft. Model and numeric parameters retained. Earlier preference checks also retained Nano Banana Pro/edit and aspect ratio, format and size through reload, an empty-settings Atlas draft and media/model switching. Actual LoRA selection persistence was not exercised.
4. HTTP /api/generations/preview: additional_prompt, horizontal_angle, vertical_angle, zoom, lora_scale and image_urls all present. 16:9 at 1024x576 estimated $0.020644 at the verified $0.035/megapixel tariff. canSubmit=true, no warnings. Local image URLs are uploaded by the existing submit pipeline, not by preview.
5. Probe: elevation -85 rejected with canSubmit=false and a field-specific out-of-range message. Explicit zero angles, zero zoom and zero strength retained and valid with an explicit output size. No-size preview correctly cannot estimate megapixel cost; UI supplies size.

## Scope and limits

- Only Angle 3D sets an explicit target. Relighting and other workshops retain their prior target behavior and remembered Aggregator settings.
- Signed studio azimuth wraps to fal 0..360. Elevation clamps to -30..90. Distance/focal length map to approximate zoom: clamp(5 + 5*log2((focal/50)*(4.5/distance)), 0, 10).
- Qwen's documented coordinate convention is absolute front/right/back/left, not a guaranteed relative orbit of the source camera. The image model is not a geometric 3D renderer.
- Atlas visibly explains that Copy retains the generic prompt while Send sends a preservation prompt plus numeric parameters. This avoids contradictory text-based camera instructions.
- Automatic Capture DNA append is bypassed for this specialized model so saved film/lighting settings do not silently alter a viewpoint edit. Manually authored prompt text remains untouched.
- Floating-point angle values originally failed the HTML number step validator; camera controls now accept decimal values. Atlas rounds transmitted angles to two decimals.
- Real rendered Qwen quality remains untested. Previous Nano Banana tests verified prompt/image transmission but did not prove precise geometric camera rotation.
- Browser automation could read the Suite iframe but failed to focus its numeric input after reload. Direct Aggregator view allowed the control interaction and screenshot; the transfer itself was exercised through Atlas and Suite.

Evidence: ../.verify/angle-preferences/qwen-default-routing.png

Official schema: https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles/api
