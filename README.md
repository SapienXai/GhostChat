<p align="center">
  <img src="https://github.com/SapienXai/WebChat/blob/master/public/logo.png" width="200px"/>
</p>

# GhostChat

[![GitHub License](https://img.shields.io/github/license/molvqingtai/GhostChat)](https://github.com/molvqingtai/GhostChat/blob/master/LICENSE) [![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/cpaedhbidlpnbdfegakhiamfpndhjpgf)](https://chromewebstore.google.com/detail/webchat/cpaedhbidlpnbdfegakhiamfpndhjpgf) [![GitHub Release](https://img.shields.io/github/v/release/molvqingtai/GhostChat)](https://github.com/molvqingtai/GhostChat/releases)

> Chat with anyone on any website using GhostChat

This is an anonymous chat browser extension that is decentralized and serverless, utilizing WebRTC for end-to-end encrypted communication. It prioritizes privacy, with all data stored locally.

The aim is to add chat room functionality to any website, you'll never feel alone again.

### Install

**Install from Store**

- [Chrome Web Store](https://chromewebstore.google.com/detail/ghostchat/cpaedhbidlpnbdfegakhiamfpndhjpgf)
- [Edge Web Store](https://microsoftedge.microsoft.com/addons/detail/mmfdplbomjjlgdffecapcpgjmhfhmiob)
- [Firefox Addons](https://addons.mozilla.org/firefox/addon/ghostchat/)

**Manual Installation**

1. Go to the GitHub repository ([Releases](https://github.com/molvqingtai/GhostChat/releases))
2. Click on the "Assets" button and select "web-chat-\*.zip"
3. Extract the ZIP file to a folder on your computer
4. Open the extension management page in your browser (usually chrome://extensions/)
   - Enable "Developer mode"
   - Click "Load unpacked" and select the folder you just extracted

### Usage

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/molvqingtai/GhostChat.git
   ```
2. **Install dependencies**
   ```bash
   pnpm install
   ```
3. **Run the development server**
   ```bash
   pnpm dev
   ```
4. **Load the extension in your browser**
   - Open the extension management page in your browser (usually `chrome://extensions/`)
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `.output/chrome-mv3-dev` folder.


After installing the extension, you'll see a ghost icon in the bottom-right corner of any website. Click it, and you'll be able to chat happily with others on the same site!

### Video

https://github.com/user-attachments/assets/e7ac9b8e-1b6c-43fb-8469-7a0a2c09d450

### Standing on the Shoulders of Giants

In addition to the good idea of decentralized chat, it also leverages some fantastic technologies.

- **[remesh](https://github.com/remesh-js/remesh)**: A framework in JavaScript that implements DDD principles, achieving true separation of UI and logic, allowing for easy implementation of the UI part, such as rewriting it in Vue, due to its independence from the UI.

- **[shadcn/ui](https://ui.shadcn.com/)**: A beautiful UI library and a pioneer of the no-install concept, offering unmatched convenience in customizing styles.

- **[wxt](https://wxt.dev/)**: This is the best framework I’ve used for building browser extensions, bar none.

- ~~**[trystero](https://github.com/dmotz/trystero)**: The core dependency for implementing decentralized communication, enabling connections to decentralized networks like IPFS, torrent, Nostr, etc.~~
- **[Artico](https://github.com/matallui/artico)**: A flexible set of libraries that help you create your own WebRTC-based solutions

- **[ugly-avatar](https://github.com/txstc55/ugly-avatar)**: Use it to create stunning random avatars.

### Sponsors

GhostChat is a open source project with its ongoing development made possible entirely by the support of these awesome backers. 

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")

### License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/molvqingtai/GhostChat/blob/master/LICENSE) file for details
