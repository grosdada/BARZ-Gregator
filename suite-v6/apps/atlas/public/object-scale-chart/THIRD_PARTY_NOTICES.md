# Third-party notices

Échelle includes `@imgly/background-removal` for local IS-Net/ONNX background removal.
The library is distributed under the GNU Affero General Public License v3.0.
Source and license: https://github.com/imgly/background-removal-js

The ONNX model and WebAssembly runtime are downloaded from IMG.LY on first use and
cached locally. Input images are processed on the user's device and are not uploaded
to IMG.LY by Échelle.

Échelle also includes ONNX Runtime Web and its transitive open-source dependencies.
Their notices are preserved in the generated `ai-cutout.js` bundle.
