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

## 🔧 Installation Troubleshooting

### Common Issues

#### Extension Not Loading
- **Chrome/Edge**: Ensure Developer Mode is enabled in `chrome://extensions`
- **Firefox**: Check that unsigned extensions are allowed in `about:config` → `xpinstall.signatures.required` → `false`
- **All browsers**: Try disabling other extensions that might conflict

#### Build Failures
```bash
# Clear cache and reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# If using npm/yarn, clear their caches too
npm cache clean --force
# or
yarn cache clean
```

#### WebRTC Connection Issues
- **Corporate networks**: May block WebRTC traffic. Try on a different network.
- **VPN interference**: Some VPNs block P2P connections. Temporarily disable to test.
- **Browser permissions**: Ensure the extension has necessary permissions in browser settings.

#### AI Companion Not Responding
- Check if you have a valid OpenAI API key configured
- Verify network connectivity and API rate limits
- Try refreshing the page and reopening the chat

#### Performance Issues
- **Memory usage**: Close unused tabs, GhostChat stores chat history locally
- **Slow loading**: Clear browser cache and extension storage
- **High CPU**: Check for infinite loops in console, report if found

### Browser-Specific Notes

#### Chrome/Chromium
- Minimum version: Chrome 88+
- Manifest V3 required
- Service worker limitations may affect background processing

#### Firefox
- Minimum version: Firefox 109+
- Manifest V2 compatibility mode
- Some WebRTC features may be limited

#### Safari (Experimental)
- Requires Safari 16.4+
- Limited extension API support
- Manual installation required

---

## 📚 API Documentation

### Core Domains

GhostChat uses Remesh for state management with domain-driven architecture:

#### ChatRoom Domain
```typescript
// Join a chat room
const joinRoom = (roomId: string, userInfo: UserInfo) => void

// Send a message
const sendMessage = (content: string, type: MessageType) => void

// Leave current room
const leaveRoom = () => void
```

#### UserInfo Domain
```typescript
interface UserInfo {
  id: string
  name: string
  avatar?: string
  walletAddress?: string
  ensName?: string
}

// Update user information
const updateUserInfo = (info: Partial<UserInfo>) => void
```

#### Danmaku Domain
```typescript
// Display floating messages
const addDanmaku = (message: string, options?: DanmakuOptions) => void

interface DanmakuOptions {
  color?: string
  speed?: number
  fontSize?: number
  position?: 'top' | 'middle' | 'bottom'
}
```

### Storage Interface

```typescript
interface Storage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  watch<T>(key: string, callback: (value: T | null) => void): () => void
}
```

### WebRTC Integration

```typescript
// Artico WebRTC wrapper
interface ArticoClient {
  connect(roomId: string): Promise<void>
  disconnect(): Promise<void>
  send(data: any): void
  on(event: string, callback: Function): void
}
```

### AI Companion API

```typescript
interface AICompanion {
  ask(question: string, context?: ChatContext): Promise<string>
  analyzeContract(address: string): Promise<SecurityAnalysis>
  summarizeConversation(messages: Message[]): Promise<string>
}

interface SecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  recommendations: string[]
}
```

### Extension Events

```typescript
// Listen for extension events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'WALLET_DETECTED':
      // Handle wallet detection
      break
    case 'PAGE_CHANGED':
      // Handle navigation
      break
  }
})
```

### Configuration

```typescript
// src/constants/config.ts
export const CONFIG = {
  MESSAGE_MAX_LENGTH: 500,
  EMOJI_LIST: ['😀', '😃', ...],
  BREAKPOINTS: {
    sm: 640,
    md: 768,
    lg: 1024
  },
  STORAGE_NAMES: {
    USER_INFO: 'user-info',
    CHAT_HISTORY: 'chat-history',
    SETTINGS: 'settings'
  }
}
```

---

## 🤝 Contributing

### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/GhostChat.git
   cd GhostChat
   ```

2. **Set up development environment**
   ```bash
   pnpm install
   pnpm dev
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-idea
   ```

### Development Guidelines

#### Code Style
- **TypeScript**: Strict mode enabled, explicit types preferred
- **ESLint**: Run `pnpm lint` before committing
- **Prettier**: Auto-formatting on save recommended
- **Naming**: Use camelCase for variables, PascalCase for components

#### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new emoji picker component
fix: resolve WebRTC connection timeout
docs: update API documentation
style: format code with prettier
refactor: simplify message handling logic
test: add unit tests for chat domain
chore: update dependencies
```

#### Pull Request Process

1. **Before submitting**:
   - Run `pnpm lint` and fix any issues
   - Run `pnpm type-check` to verify TypeScript
   - Test your changes in multiple browsers
   - Update documentation if needed

2. **PR Description Template**:
   ```markdown
   ## What does this PR do?
   Brief description of changes
   
   ## Type of change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Tested in Chrome
   - [ ] Tested in Firefox
   - [ ] Tested in Edge
   
   ## Screenshots (if applicable)
   
   ## Related Issues
   Fixes #123
   ```

3. **Review process**:
   - All PRs require at least one review
   - CI checks must pass
   - No merge conflicts
   - Documentation updated if needed

### Project Structure

```
src/
├── app/
│   └── content/           # Content script entry
│       ├── components/    # UI components
│       └── views/         # Page-level components
├── components/            # Shared components
│   └── ui/               # shadcn/ui components
├── constants/            # Configuration constants
├── domain/               # Remesh domains
│   ├── impls/           # Domain implementations
│   └── modules/         # Domain modules
├── utils/                # Utility functions
└── types/                # TypeScript definitions
```

### Testing Guidelines

#### Unit Tests (Planned)
```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

#### Manual Testing Checklist
- [ ] Extension loads in all supported browsers
- [ ] Chat functionality works across different sites
- [ ] WebRTC connections establish successfully
- [ ] AI companion responds appropriately
- [ ] No console errors or warnings
- [ ] Responsive design works on different screen sizes

### Reporting Issues

When reporting bugs, please include:

1. **Environment**:
   - Browser and version
   - Operating system
   - Extension version

2. **Steps to reproduce**:
   - Detailed steps
   - Expected vs actual behavior
   - Screenshots/videos if helpful

3. **Console logs**:
   - Any error messages
   - Network tab information
   - Extension background page logs

### Feature Requests

Before requesting a feature:
- Check existing issues and discussions
- Consider if it aligns with project goals
- Provide detailed use cases and mockups

### Community Guidelines

- **Be respectful**: Treat all contributors with kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Reviews and responses may take time
- **Be collaborative**: Work together to improve the project

### Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special mentions in project updates

We review PRs daily and aim to respond within 48 hours!

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

