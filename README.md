# GazeSplat - 3D Gaussian Splats with webcam-based Gaze Direction

A live version of GazeSplat is available [here](https://gazesplat.netlify.app/).

Most of the gaze-specific code contributions are located in `/src/gaze`.
# Based on SuperSplat:

## SuperSplat - 3D Gaussian Splat Editor

| [SuperSplat Editor](https://superspl.at/editor) | [User Guide](https://github.com/playcanvas/supersplat/wiki) | [Forum](https://forum.playcanvas.com/) | [Discord](https://discord.gg/RSaMRzg) |

## Local Development

To initialize a local development environment for GazeSplat, ensure you have [Node.js](https://nodejs.org/) 18 or later installed. Follow these steps:

1. Install dependencies:

   ```sh
   git submodule update --init
   npm install
   ```

2. Build SuperSplat and start a local web server:

   ```sh
   npm run develop
   ```

3. Open a web browser tab and make sure network caching is disabled on the network tab and the other application caches are clear:

   - On Safari you can use `Cmd+Option+e` or Develop->Empty Caches.
   - On Chrome ensure the options "Update on reload" and "Bypass for network" are enabled in the Application->Service workers tab:

   <img width="846" alt="Screenshot 2025-04-25 at 16 53 37" src="https://github.com/user-attachments/assets/888bac6c-25c1-4813-b5b6-4beecf437ac9" />

4. Navigate to `http://localhost:3000`

When changes to the source are detected, SuperSplat is rebuilt automatically. Simply refresh your browser to see your changes.
