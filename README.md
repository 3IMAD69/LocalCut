# LocalCut

> 🚧 **Note:** This project is currently in active development and is a work in progress. Features and APIs may change.

**LocalCut** is a powerful video & audio converter and editor that runs **entirely in your browser**.

Powered by modern web technologies like **WebCodecs**, it allows you to process media files locally on your device without ever uploading them to a server. This ensures maximum privacy and zero latency.

## ✨ Features

- **🔒 100% Local Processing**: Your files never leave your device.
- **🔄 Media Converter**: Convert between various video and audio formats with ease.
- **🎬 Video Editor**: A non-linear editor with a timeline, multi-track support, and real-time preview.
- **🎨 Neobrutalism UI**: A distinct, high-contrast design system for a bold user experience.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Media Processing**: [MediaBunny](https://mediabunny.dev/)
- **Media Playback**: [MediaFox](https://github.com/mediafox)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Neobrutalism design
- **Linting & Formatting**: [Biome](https://biomejs.dev/)

## 🚀 Getting Started

To run this project locally:

1.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📜 Scripts

- `dev`: Runs the development server.
- `build`: Builds the application for production.
- `start`: Starts the production server.
- `lint`: Checks for linting errors using Biome.
- `format`: Formats the code using Biome.
