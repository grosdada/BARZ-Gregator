# Mira Scene model feasibility

## What does Mira Scene consume and produce

### Takeaway
Mira-Scene is a single-image **compositional 3D reconstruction** pipeline, not a 2D object detector. It consumes an RGB scene plus instance masks (or first creates masks through its separate VLM–SAM3 segmentation stage), then reconstructs editable per-object 3D assets and their scene-space placement.

### Cited Findings
- The official paper defines the input as one RGB image plus a set of per-instance masks, and the output as per-object canonical geometry together with scale, rotation and translation in the camera-coordinate scene frame. — [Mira-Scene paper, problem formulation](https://arxiv.org/html/2609.23796#S2.SS1)
- The model predicts a per-object Canonical Coordinate Map (CCM): for every visible pixel in an object mask, a three-channel canonical XYZ surface coordinate; it combines that map with a monocular scene-space Point Cloud Map and recovers the object transform by robust geometric alignment. — [Mira-Scene paper, pixel-aligned layout representation](https://arxiv.org/html/2609.23796#S2.SS2)
- The full official pipeline is `image → segmentation/depth → CCM → mesh/floor/scene/environment`; its documented stage products include SAM3 instance and floor masks, object descriptions, a scene graph, depth/points/intrinsics/FOV, CCM and voxel predictions, per-object meshes, a floor mesh, a gravity/support-aware assembled scene, and an equirectangular environment map. — [Official inference guide](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/README.md)
- The full pipeline accepts an image or a flat directory of images, and writes a case directory containing `input/` masks and scene image, `scene_graph.json`, `depth/`, `CCM/`, `mesh/`, `floor/`, `scene/`, `environment/`, logs and manifests. — [Official inference guide, output layout](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/README.md#output-layout)
- The official visualization tool loads `scene_with_floor.glb` when present, otherwise `scene.glb`; therefore the assembled scene output is a standard GLB that can be viewed or imported elsewhere. — [Official visualization guide](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/visualization/README.md)
- The automatic segmentation branch uses a VLM to create appearance/spatial object descriptions, queries SAM3 for candidate masks, verifies instance membership, deduplicates results and recycles unused candidates. The paper reports GPT-5.6 as the VLM used in its experiments, while the current example configuration names `gemini-2.5-pro`. — [Mira-Scene paper, automatic VLM–SAM3 segmentation](https://arxiv.org/html/2609.23796#A1.SS4); [official example configuration](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/config/example.yaml)
- The authors explicitly warn that automatic segmentation can miss objects, add false positives, or assign wrong names/support relations, and recommend interactive review of masks, descriptions and the scene graph before downstream stages. — [Official inference guide, pipeline usage](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/README.md#pipeline-usage)
- The released `pipeline/` checkpoint does not accept a full scene and directly emit a GLB: it expects the scene image and prepared per-instance masks, predicts CCM/voxels for each segmented object, and relies on later mesh and scene-construction stages. — [Official Hugging Face model card](https://huggingface.co/Yang-Tian/Mira-Scene)

### Inferences
- Mira-Scene does not expose 2D bounding boxes as its stated model output. Bounding boxes can be computed cheaply from the extrema of each segmentation mask, but that would use the **segmentation stage**, not the 6.41 GB CCM model, as the useful component for a conventional 2D auto-blocking button.
- Its distinctive value for Blocking Studio is richer than boxes: object masks, identity descriptions, support relations, depth, 3D transforms and an assembled GLB could seed a genuinely 3D blocking workspace.
- The generic Hugging Face “Diffusers” snippet shown on the model page (a text prompt passed to `DiffusionPipeline`) conflicts with the project’s own documented image-plus-mask inference contract and should not be used as an integration recipe.

### Gaps
- The official documentation does not publish a stable JSON schema for `scene_graph.json` on the pages inspected, so an importer should validate and version-tolerate fields rather than hard-code an assumed schema.
- The authors do not document a direct “2D boxes/layout JSON only” execution mode; using only segmentation outputs would require a small adapter written around the segmentation result files.

## Can it run inside the current Windows application

### Takeaway
Not as a lightweight bundled Windows dependency. The official runtime is a Linux/CUDA research stack split across five Conda environments, multiple external repositories, gated checkpoints and compiled CUDA extensions; the final Mira CCM checkpoint alone is 6.41 GB, before segmentation, depth and mesh models.

### Cited Findings
- The official environment guide requires Linux, a compatible NVIDIA driver and CUDA toolkit, Conda, several external source checkouts, model checkpoints and service credentials. — [Official environment guide, prerequisites](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/docs/environment.md#prerequisites)
- The pipeline deliberately uses five Conda environments because its stages require incompatible Python, PyTorch and CUDA-extension stacks: segmentation (SAM3/FastAPI/VLM), geometry (MoGe/PPD/Open3D/Trimesh), CCM (diffusers/spconv), SAM3D mesh (PyTorch3D/Kaolin/gsplat/nvdiffrast), and TRELLIS.2 mesh (flash-attn/nvdiffrast/nvdiffrec/CuMesh/o-voxel/FlexGEMM). — [Official environment guide, environment map](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/docs/environment.md#environment-map)
- Several CUDA extensions must be built against the runtime’s exact PyTorch/CUDA ABI and GPU architecture; the installation example defaults to compute capability 8.0 because it was authored for NVIDIA A800. — [Official environment guide, external projects and CUDA extensions](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/docs/environment.md#install-external-projects-and-cuda-extensions)
- The Hugging Face repository is 12.8 GB in total. The released inference `pipeline/` directory is 6.41 GB and the separate stage-1 `pretrain_pipeline/` directory is another 6.41 GB. — [Official Hugging Face repository files](https://huggingface.co/Yang-Tian/Mira-Scene/tree/main); [released pipeline folder](https://huggingface.co/Yang-Tian/Mira-Scene/tree/main/pipeline); [pretraining pipeline folder](https://huggingface.co/Yang-Tian/Mira-Scene/tree/main/pretrain_pipeline)
- A complete run additionally needs SAM3 and a depth backend; the SAM3D mesh route needs the complete SAM 3D Objects repository, while the TRELLIS.2 route needs TRELLIS.2-4B, RMBG-2.0 and DINOv3 checkpoints. SAM3, SAM 3D Objects and DINOv3 are gated and require access approval/authentication. — [Official environment guide, checkpoint download and configuration](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/docs/environment.md#checkpoint-download-and-configuration)
- The full pipeline can shard the CCM and mesh stages across multiple GPUs, while the paper reports training the model on 32 NVIDIA A100-80G GPUs and fine-tuning on 8 A100-80G GPUs. — [Official inference guide, pipeline usage](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/README.md#pipeline-usage); [Mira-Scene paper, training settings](https://arxiv.org/html/2609.23796#A1.SS2)
- The Hugging Face page states that no inference provider currently deploys this model. — [Official Hugging Face model card](https://huggingface.co/Yang-Tian/Mira-Scene)
- The Mira-Scene code, configurations and released model artifacts are MIT-licensed; the MIT text permits use, modification, distribution, sublicensing and sale, subject to preserving the copyright/license notice. — [Official Hugging Face model card, license](https://huggingface.co/Yang-Tian/Mira-Scene#license); [official repository MIT license](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/LICENSE)
- The authors explicitly state that third-party components, pretrained models and datasets retain their own licenses and terms. — [Official repository README, license](https://github.com/VAST-AI-Research/Mira-Scene#license)

### Inferences
- Native Windows packaging in the BARZ Suite installer is not supported by the upstream instructions. The realistic deployment choices are a separately provisioned Linux/WSL2 GPU service or a remote Linux GPU worker, with BARZ talking to it through an adapter.
- Bundling the full stack would greatly enlarge and destabilize the installer. A provider-style integration with capability detection and a graceful fallback is much safer than silently downloading/building the stack from the desktop app.
- MIT clears commercial use of Mira-Scene’s own code/artifacts, but commercial clearance of a selected **complete** runtime must include a dependency-by-dependency license audit; the project’s MIT label alone is not sufficient for SAM3/SAM3D/DINOv3/RMBG/TRELLIS and any configured VLM/API.

### Gaps
- No official minimum or recommended inference VRAM, end-to-end latency, peak RAM, disk total, or tested consumer GPU is published in the model card, inference guide, environment guide or paper inspected. Training hardware is not a valid substitute for an inference requirement.
- No native Windows installation path is documented. WSL2 feasibility is plausible but unverified by the project and should be treated as experimental until tested on the target machine/GPU.
- Exact total download size depends on the chosen segmentation, depth and mesh backends; the official guide lists required repositories/checkpoints but not their aggregate size.

## Is it the right engine for Blocking Studio auto blocking

### Takeaway
Mira-Scene is promising for a future **3D scene import/reconstruction mode**, but it is a poor direct replacement for the current fast 2D Auto-Blocking control. For the current button, the useful concept is mask-based detection plus support-aware scene metadata; the full CCM/mesh pipeline is unnecessary and operationally too heavy.

### Cited Findings
- The paper positions Mira-Scene around editable 3D scene reconstruction, object-level assets and accurate 3D placement, not real-time 2D layout detection. — [Mira-Scene paper, abstract and applications](https://arxiv.org/html/2609.23796)
- Its reported advantage is 3D/2D projection consistency of reconstructed 3D layouts: on BlendSwap, 3D-IoU improves from 0.520 to 0.727 and 2D-IoU from 0.672 to 0.783 versus SAM3D under the paper’s evaluation protocol. — [Mira-Scene paper, scene generation results](https://arxiv.org/html/2609.23796#S3.SS2)
- The official pipeline exposes the exact high-value artifacts a 3D blocking tool could consume: instance masks/descriptions/scene graph, depth and camera information, per-object meshes, scene placement and assembled GLB. — [Official inference guide, stages and output layout](https://github.com/VAST-AI-Research/Mira-Scene/blob/main/infer_scripts/README.md)
- The project documents important failure modes for production use: independently reconstructed objects may intersect; noisy masks can create floaters or missing parts; global geometry depends on monocular depth quality; cartoon images can yield thin sheet-like point clouds; and object-generation quality trails systems trained on more data. — [Mira-Scene paper, limitations](https://arxiv.org/html/2609.23796#A1.SS6)

### Inferences
- Recommended architecture: keep a fast local 2D auto-blocking backend for the existing button; add a provider interface that can optionally import Mira-Scene results (`mask_*.png`, scene graph, depth/camera metadata and GLB) when a separately configured Mira service is available.
- The immediate improvement should derive a normalized 2D rectangle/polygon and label from each mask, enforce the UI’s `max objects` and confidence threshold, then allow manual correction. This gains the useful segmentation behavior without downloading CCM/mesh weights.
- A later “Mira 3D” mode would be justified if Blocking Studio gains a true 3D stage: import GLB objects and their transforms, display camera/depth, preserve support relations, and expose a review step because upstream explicitly recommends human validation.
- Therefore “implement Mira-Scene” should mean implementing a clean optional adapter/import contract now, not embedding or auto-installing the research pipeline into the BARZ Suite executable.

### Gaps
- Whether Mira’s segmentation stage materially outperforms the current Blocking Studio detector on the user’s actual images is unknown without a representative benchmark set and target metrics (object recall, false positives, box/mask IoU, latency).
- The current machine’s NVIDIA model, VRAM, CUDA/WSL2 configuration and available disk space were not part of this research task; those determine whether a local Mira service is even testable.
- There is no official hosted Mira inference endpoint to target today, so a functional live adapter requires the user to provision a compatible Linux GPU service or the project to maintain one.
