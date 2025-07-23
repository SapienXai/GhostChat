# GhostChat 👻

> **GhostChat** is a **decentralized, server‑less browser extension** that adds a secure chat layer to every dApp, token, or NFT site you visit.\
> **Redesigned and super‑charged by the **[**SapienX**](https://sapienx.app)** team** to meet the unique needs of Web3 communities with AI-powered security features.

---

## ✨ Why GhostChat?

| Benefit                       | What it means for you                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| **Instant site reviews**      | See real‑time feedback from other users before you connect a wallet or sign a transaction.      |
| **Always‑on AI companion**    | Ask questions, get summaries, or request contract safety hints even when no one else is online. |
| **Like‑minded conversations** | Find fellow traders, collectors, and builders right on the page you’re viewing.                 |
| **Built‑in safety checks**    | GhostChat flags risky contracts, wallet drainers, and fake NFT collections in real time.        |
| **True decentralization**     | Powered by WebRTC + local storage, so your messages never touch a centralized server.           |

---

## 🚀 Quick Start (User)

1. **Install from a store**

   | Browser              | Link                                                                                                                                         |
   | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
   | Chrome (recommended) | [Chrome Web Store - GhostChat](https://chromewebstore.google.com/detail/ghostchat/XXXXXXXX)                   |
   | Edge                 | [Microsoft Edge Add-ons - GhostChat](https://microsoftedge.microsoft.com/addons/detail/ghostchat/YYYYYYYY) |
   | Firefox              | [Firefox Add-ons - GhostChat](https://addons.mozilla.org/firefox/addon/ghostchat/)                                   |

2. Refresh the page you’re on.

3. Click the little ghost floating in the bottom‑right corner 👻.

4. Say hello — you’re chatting on‑chain!

> **Tip:** The AI companion lives in the `` tab of every chat room. Ask it anything from “Is this contract verified?” to “What’s an NFT royalty?” for instant answers.

---

## 🛠️ Local Development

```bash
git clone https://github.com/SapienXai/GhostChat.git
cd GhostChat
pnpm install          # or npm / yarn
pnpm dev              # builds + watches
```

1. Open your browser’s extension page (`chrome://extensions`, `edge://extensions`, or `about:debugging#/runtime/this-firefox`).
2. Enable **Developer Mode** → **Load unpacked** → select `.output/chrome-mv3-dev`.
3. Visit any site and start hacking!

### Tech stack highlights

- **Vue + TypeScript** UI running inside a Manifest V3 extension
- **Artico WebRTC** mesh for peer‑to‑peer, server‑less messaging
- **Remesh** for domain‑driven state management
- **shadcn/ui** + Tailwind CSS for drop‑in, theme‑able components
- **OpenAI function calls** for the embedded AI companion
- **Vite**‑powered DX with hot‑module reloading

---

## 📡 Architecture

```mermaid
graph TD
    A[Website] -->|Injects| B(GhostChat Widget)
    B --> C[UI Layer (Vue)]
    C --> D[Remesh State Core]
    D --> E[Artico WebRTC]
    D --> F[AI Companion]
    subgraph Peer-to-Peer Network
        E
    end
    F -->|Safety & Insights| C
```

- **No centralized servers**: All chat data travels directly between peers via WebRTC.
- **Local‑first storage**: Conversation history stays on your device unless you export it.
- **Pluggable AI**: Swap the default OpenAI agent for your own LLM endpoint.

---

## 🗺️ Roadmap

| Status | Feature                                                    |
| ------ | ---------------------------------------------------------- |
| ✅      | Launch GhostChat with SapienX brand & Web3 UI              |
| ✅      | Embed OpenAI GPT‑4o companion                              |
| ⏳      | Lens Protocol profile linking                              |
| ⏳      | ENS / .bit name resolution in chat                         |
| ⏳      | Mobile Safari support (Manifest V3 polyfill)               |
| ⏳      | Multi‑chain phishing blacklist (powered by Chainlink CCIP) |

> Want something else? [Open an issue](https://github.com/SapienXai/GhostChat/issues/new/choose) or up‑vote an existing one.

---

## 🤝 Contributing

1. Fork the repo & create your branch: `git checkout -b feature/amazing-idea`
2. Commit your changes: `git commit -m "feat: amazing idea 🚀"`
3. Push to the branch: `git push origin feature/amazing-idea`
4. Open a pull request. We review daily!

Please follow our community guidelines when contributing.

---

## 🙏 Acknowledgements

GhostChat is built with dozens of amazing open‑source libraries.

Special thanks to:

- **Artico** and **Remesh** authors for battle‑tested P2P & state solutions
- **SapienX** designers for the neon‑ghost vibes ([https://sapienx.app/](https://sapienx.app/))
- The open-source community for making decentralized chat possible

---

## 📜 License

GhostChat is released under the [MIT License](LICENSE). Commercial use is welcome — just give us a ★ and drop a link back!

---

